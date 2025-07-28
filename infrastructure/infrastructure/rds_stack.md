# ------ File: infrastructure/infrastructure/rds_stack.py ------
from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_rds as rds,
    custom_resources as cr,
    aws_iam as iam,
    CfnOutput,
    SecretValue,
    Fn
)
from constructs import Construct
import importlib
from types import SimpleNamespace
import json
from typing import List

class RDSStack(Stack):
    def load_config(self, env: str):
        try:
            module = importlib.import_module(f"infrastructure.config.{env}")
            return SimpleNamespace(**vars(module))
        except ModuleNotFoundError:
            raise ValueError(f"Configuration for {env} not found")
        
    def create_subnet_group(self, public_subnets: List[ec2.CfnSubnet], prefix: str) -> str:
        subnet_group = rds.CfnDBSubnetGroup(
            self,
            f"{prefix}-SubnetGroup",
            db_subnet_group_description=f"Subnet group for {prefix} RDS",
            subnet_ids=[subnet.ref for subnet in public_subnets],
            db_subnet_group_name=f"{prefix}-rds-subnet-group"
        )
        return subnet_group.ref

    def __init__(self, 
                 scope: Construct, 
                 construct_id: str, 
                 environment: str, 
                 vpc: ec2.CfnVPC,
                 public_subnets: List[ec2.CfnSubnet],
                 web_security_group: ec2.CfnSecurityGroup,
                 db_secret,  # Secret passed from SecretsStack
                 **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        config = self.load_config(environment)
        prefix = f"testpy-{environment}"

        # Create valid database name
        db_name = f"db{environment}".replace("-", "").replace("_", "")
        if not db_name[0].isalpha():
            db_name = f"a{db_name}"

        # Create RDS Security Group
        rds_sg = ec2.CfnSecurityGroup(
            self,
            f"{prefix}-RDSSG",
            group_description=f"{prefix} RDS Security Group",
            vpc_id=vpc.ref,
            security_group_ingress=[
                {
                    "ipProtocol": "tcp",
                    "fromPort": config.RDS_PORT,
                    "toPort": config.RDS_PORT,
                    "sourceSecurityGroupId": web_security_group.attr_group_id,
                    "description": "Allow from web servers"
                }
            ],
            tags=[{"key": "Name", "value": f"{prefix}-RDSSG"}]
        )
        
        # Create PostgreSQL instance
        db_instance = rds.CfnDBInstance(
            self,
            f"{prefix}-PostgreSQL",
            engine="postgres",
            engine_version=config.RDS_ENGINE_VERSION,
            db_instance_class=config.RDS_INSTANCE_TYPE,
            allocated_storage=config.RDS_ALLOCATED_STORAGE,
            storage_type=config.RDS_STORAGE_TYPE,
            db_name=db_name,
            master_username=config.RDS_MASTER_USERNAME,
            master_user_password=SecretValue.secrets_manager(
                db_secret.secret_arn,
                json_field="password"
            ).to_string(),
            vpc_security_groups=[rds_sg.attr_group_id],
            db_subnet_group_name=self.create_subnet_group(public_subnets, prefix),
            publicly_accessible=config.RDS_PUBLICLY_ACCESSIBLE,
            backup_retention_period=config.RDS_BACKUP_RETENTION
        )

        # Construct the secret string using CloudFormation functions
        secret_string = Fn.sub(
            json.dumps({
                "username": config.RDS_MASTER_USERNAME,
                "password": "${password}",
                "dbname": db_name,
                "maintenanceDb": "postgres",
                "host": "${host}",
                "port": "${port}"
            }),
            {
                "password": db_secret.secret_value_from_json("password").to_string(),
                "host": db_instance.attr_endpoint_address,
                "port": db_instance.attr_endpoint_port
            }
        )

        # Create custom resource to update secret
        update_secret_cr = cr.AwsCustomResource(
            self,
            "UpdateSecretResource",
            policy=cr.AwsCustomResourcePolicy.from_statements([
                iam.PolicyStatement(
                    actions=["secretsmanager:PutSecretValue"],
                    resources=[db_secret.secret_arn]
                )
            ]),
            on_create=cr.AwsSdkCall(
                service="SecretsManager",
                action="putSecretValue",
                parameters={
                    "SecretId": db_secret.secret_arn,
                    "SecretString": secret_string
                },
                physical_resource_id=cr.PhysicalResourceId.of("SecretUpdate")
            )
        )
        update_secret_cr.node.add_dependency(db_instance)

        # Output connection information
        CfnOutput(self, "RDSInstanceEndpoint", value=db_instance.attr_endpoint_address)
        CfnOutput(self, "RDSInstancePort", value=str(db_instance.attr_endpoint_port))