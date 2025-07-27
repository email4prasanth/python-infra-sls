from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_secretsmanager as secretsmanager,
    CfnOutput,
    SecretValue
)
from constructs import Construct
import importlib
from types import SimpleNamespace
import json
import random
import string
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
                 **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        config = self.load_config(environment)
        prefix = f"testpy-{environment}"

        # Create database secret with generated password
        db_secret = secretsmanager.Secret(
            self,
            f"{prefix}-DBSecret",
            secret_name=f"{prefix}-db-credentials",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template=json.dumps({
                    "username": config.RDS_MASTER_USERNAME
                }),
                generate_string_key="password",
                exclude_characters='/@" \\',
                password_length=16
            )
        )

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
        
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/CfnDBInstance.html

        # Remove all non-alphanumeric characters and ensure it starts with a letter
        db_name = f"db{environment}".replace("-", "").replace("_", "")
        if not db_name[0].isalpha():
            db_name = f"a{db_name}"

        # Create PostgreSQL instance with correct deletion policy
        self.db_instance = rds.CfnDBInstance(
            self,
            f"{prefix}-PostgreSQL",
            engine="postgres",
            engine_version=config.RDS_ENGINE_VERSION,
            db_instance_class=config.RDS_INSTANCE_TYPE,
            allocated_storage=config.RDS_ALLOCATED_STORAGE,
            storage_type=config.RDS_STORAGE_TYPE,
            db_name=db_name,  # Use the sanitized name
            master_username=config.RDS_MASTER_USERNAME,
            master_user_password=SecretValue.secrets_manager(
                db_secret.secret_arn,
                json_field="password"
            ).to_string(),
            vpc_security_groups=[rds_sg.attr_group_id],
            db_subnet_group_name=self.create_subnet_group(public_subnets, prefix),
            publicly_accessible=config.RDS_PUBLICLY_ACCESSIBLE,
            backup_retention_period=config.RDS_BACKUP_RETENTION,
            # deletion_protection=(environment == "prod")
        )

        # Output connection information
        CfnOutput(self, "RDSInstanceEndpoint", value=self.db_instance.attr_endpoint_address)
        CfnOutput(self, "RDSInstancePort", value=str(self.db_instance.attr_endpoint_port))
        CfnOutput(self, "DBSecretArn", value=db_secret.secret_arn)