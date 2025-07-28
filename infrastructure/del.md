from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_lambda as lambda_,
    custom_resources as cr,
    aws_iam as iam,
    CfnOutput,
    SecretValue,
    Duration
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

        # Create Lambda function to update secret
        update_secret_lambda = lambda_.Function(
            self,
            "UpdateSecretLambda",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="index.handler",
            code=lambda_.Code.from_inline("""
import boto3
import os
import json

def handler(event, context):
    secret_arn = os.environ['SECRET_ARN']
    endpoint = os.environ['DB_ENDPOINT']
    port = os.environ['DB_PORT']
    
    client = boto3.client('secretsmanager')
    
    # Get current secret value
    current = client.get_secret_value(SecretId=secret_arn)
    secret_value = json.loads(current['SecretString'])
    
    # Update with new values
    secret_value['host'] = endpoint
    secret_value['port'] = port
    
    # Save updated secret
    response = client.put_secret_value(
        SecretId=secret_arn,
        SecretString=json.dumps(secret_value)
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps('Secret updated successfully!')
    }
            """),
            environment={
                "SECRET_ARN": db_secret.secret_arn,
                "DB_ENDPOINT": db_instance.attr_endpoint_address,
                "DB_PORT": str(db_instance.attr_endpoint_port)
            },
            timeout=Duration.seconds(30)
        )
        
        # Grant Lambda permission to update the secret
        db_secret.grant_read(update_secret_lambda)
        db_secret.grant_write(update_secret_lambda)
        
        # Create custom resource to trigger Lambda after RDS creation
        trigger = cr.AwsCustomResource(
            self,
            "UpdateSecretTrigger",
            policy=cr.AwsCustomResourcePolicy.from_statements([
                iam.PolicyStatement(
                    actions=["lambda:InvokeFunction"],
                    resources=[update_secret_lambda.function_arn]
                )
            ]),
            on_create=cr.AwsSdkCall(
                service="Lambda",
                action="invoke",
                parameters={
                    "FunctionName": update_secret_lambda.function_name,
                    "InvocationType": "Event"
                },
                # physical_resource_id=cr.PhysicalResourceId.of("UpdateSecretTrigger")
                physical_resource_id=cr.PhysicalResourceId.of(f"UpdateSecretTrigger-{environment}-{construct_id}"
            )
        )
        trigger.node.add_dependency(db_instance)

        # Output connection information
        CfnOutput(self, "RDSInstanceEndpoint", value=db_instance.attr_endpoint_address)
        CfnOutput(self, "RDSInstancePort", value=str(db_instance.attr_endpoint_port))
