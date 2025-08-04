# # ------ File: infrastructure\app.py ------
# #!/usr/bin/env python3
# import os

# import aws_cdk as cdk

# from infrastructure.vpc_stack import VPCStack
# from infrastructure.security_group import SecurityGroupStack
# from infrastructure.rds_stack import RDSStack
# from infrastructure.secrets_stack import SecretsStack
# from infrastructure.iam_stack import IAMStack


# app = cdk.App()
# env_name = app.node.try_get_context("env") or "dev"

# # Create VPC stack
# vpc_stack = VPCStack(
#     app, 
#     f"VPCStack-{env_name}",
#     environment=env_name,
#     env=cdk.Environment(account='180294218712', region='us-east-1')
#     )
# # Create Security Group stack
# sg_stack = SecurityGroupStack(
#     app,
#     f"SecurityGroupStack-{env_name}",
#     environment=env_name,
#     vpc_id=vpc_stack.vpc.ref,
#     env=cdk.Environment(account='180294218712', region='us-east-1')
# )

# # Create Secrets stack
# secrets_stack = SecretsStack(
#     app, 
#     f"SecretsStack-{env_name}",
#     environment=env_name,
#     env=cdk.Environment(account='180294218712', region='us-east-1')
# )

# # Create IAM stack
# iam_stack = IAMStack(  # Add this stack
#     app,
#     f"IAMStack-{env_name}",
#     environment=env_name,
#     env=cdk.Environment(account='180294218712', region='us-east-1')
# )

# # Create RDS stack
# rds_stack = RDSStack(
#     app,
#     f"RDSStack-{env_name}",
#     environment=env_name,
#     vpc=vpc_stack.vpc,  
#     public_subnets=vpc_stack.public_subnets,
#     web_security_group=sg_stack.web_sg,
#     rds_security_group=sg_stack.rds_sg,
#     db_secret=secrets_stack.db_secret,
#     lambda_role=iam_stack.lambda_role,
#     env=cdk.Environment(account='180294218712', region='us-east-1')
# )

# # security groups depend on VPC
# sg_stack.add_dependency(vpc_stack)
# # RDS depends on Security Group
# rds_stack.add_dependency(sg_stack)
# rds_stack.add_dependency(secrets_stack)
# rds_stack.add_dependency(iam_stack) 

# app.synth()



# # ------ File: infrastructure\infrastructure\__init__.py ------



# # ------ File: infrastructure\infrastructure\iam_stack.py ------
# from aws_cdk import (
#     Stack,
#     aws_iam as iam,
#     CfnOutput
# )
# from constructs import Construct

# class IAMStack(Stack):
#     def __init__(self, scope: Construct, construct_id: str, environment: str, **kwargs):
#         super().__init__(scope, construct_id, **kwargs)
#         prefix = f"testpy-{environment}"
        
#         # Create Lambda execution role
#         lambda_role = iam.Role(
#             self,
#             "LambdaExecutionRole",
#             assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
#             role_name=f"{prefix}-lambda-exec-role",
#             description="Execution role for Lambda functions"
#         )
        
#         # Attach managed policies
#         managed_policies = [
#             "service-role/AWSLambdaVPCAccessExecutionRole",
#             "service-role/AWSLambdaBasicExecutionRole",
#             "AmazonS3ReadOnlyAccess",
#             "AmazonSESFullAccess",
#             "SecretsManagerReadWrite",
#             "AmazonRDSFullAccess"
#         ]
        
#         for policy in managed_policies:
#             lambda_role.add_managed_policy(
#                 iam.ManagedPolicy.from_aws_managed_policy_name(policy)
#             )
#         self.lambda_role = lambda_role
        
#         # Output role ARN
#         CfnOutput(self, "LambdaRoleArn", value=lambda_role.role_arn)



# # ------ File: infrastructure\infrastructure\rds_stack.py ------
# from aws_cdk import (
#     Stack,
#     aws_ec2 as ec2,
#     aws_rds as rds,
#     aws_lambda as lambda_,
#     custom_resources as cr,
#     aws_iam as iam,
#     CfnOutput,
#     SecretValue,
#     Duration
# )
# from constructs import Construct
# import importlib
# from types import SimpleNamespace
# import json
# from typing import List

# class RDSStack(Stack):
#     def load_config(self, env: str):
#         try:
#             module = importlib.import_module(f"infrastructure.config.{env}")
#             return SimpleNamespace(**vars(module))
#         except ModuleNotFoundError:
#             raise ValueError(f"Configuration for {env} not found")
        
#     def create_subnet_group(self, public_subnets: List[ec2.CfnSubnet], prefix: str) -> str:
#         subnet_group = rds.CfnDBSubnetGroup(
#             self,
#             f"{prefix}-SubnetGroup",
#             db_subnet_group_description=f"Subnet group for {prefix} RDS",
#             subnet_ids=[subnet.ref for subnet in public_subnets],
#             db_subnet_group_name=f"{prefix}-rds-subnet-group"
#         )
#         return subnet_group.ref

#     def __init__(self, 
#                  scope: Construct, 
#                  construct_id: str, 
#                  environment: str, 
#                  vpc: ec2.CfnVPC,
#                  public_subnets: List[ec2.CfnSubnet],
#                  web_security_group: ec2.CfnSecurityGroup,
#                  rds_security_group: ec2.CfnSecurityGroup,
#                  db_secret, # Secret passed from SecretsStack
#                  lambda_role: iam.Role,  
#                  **kwargs):
#         super().__init__(scope, construct_id, **kwargs)
#         config = self.load_config(environment)
#         prefix = f"testpy-{environment}"

#         # Create valid database name
#         db_name = f"db{environment}".replace("-", "").replace("_", "")
#         if not db_name[0].isalpha():
#             db_name = f"a{db_name}"

#         # # Create RDS Security Group
#         # rds_sg = ec2.CfnSecurityGroup(
#         #     self,
#         #     f"{prefix}-RDSSG",
#         #     group_description=f"{prefix} RDS Security Group",
#         #     vpc_id=vpc.ref,
#         #     security_group_ingress=[
#         #         {
#         #             "ipProtocol": "tcp",
#         #             "fromPort": config.RDS_PORT,
#         #             "toPort": config.RDS_PORT,
#         #             "sourceSecurityGroupId": web_security_group.attr_group_id,
#         #             "description": "Allow from web servers"
#         #         }
#         #     ],
#         #     tags=[{"key": "Name", "value": f"{prefix}-RDSSG"}]
#         # )
        
#         # Create PostgreSQL instance
#         db_instance = rds.CfnDBInstance(
#             self,
#             f"{prefix}-PostgreSQL",
#             db_instance_identifier=f"{prefix}-postgres",
#             engine="postgres",
#             engine_version=config.RDS_ENGINE_VERSION,
#             db_instance_class=config.RDS_INSTANCE_TYPE,
#             allocated_storage=config.RDS_ALLOCATED_STORAGE,
#             storage_type=config.RDS_STORAGE_TYPE,
#             db_name=db_name,
#             master_username=config.RDS_MASTER_USERNAME,
#             master_user_password=SecretValue.secrets_manager(
#                 db_secret.secret_arn,
#                 json_field="password"
#             ).to_string(),
#             vpc_security_groups=[rds_security_group.attr_group_id], 
#             db_subnet_group_name=self.create_subnet_group(public_subnets, prefix),
#             publicly_accessible=config.RDS_PUBLICLY_ACCESSIBLE,
#             backup_retention_period=config.RDS_BACKUP_RETENTION
#         )

#         # Create Lambda function to update secret
#         update_secret_lambda = lambda_.Function(
#             self,
#             "UpdateSecretLambda",
#             function_name=f"{prefix}-update-secret", ## added line
#             runtime=lambda_.Runtime.PYTHON_3_9,
#             handler="index.handler",
#             code=lambda_.Code.from_inline("""
# import boto3
# import os
# import json

# def handler(event, context):
#     secret_arn = os.environ['SECRET_ARN']
#     endpoint = os.environ['DB_ENDPOINT']
#     port = os.environ['DB_PORT']
    
#     client = boto3.client('secretsmanager')
    
#     # Get current secret value
#     current = client.get_secret_value(SecretId=secret_arn)
#     secret_value = json.loads(current['SecretString'])
    
#     # Update with new values
#     secret_value['host'] = endpoint
#     secret_value['port'] = port
    
#     # Save updated secret
#     response = client.put_secret_value(
#         SecretId=secret_arn,
#         SecretString=json.dumps(secret_value)
#     )
    
#     return {
#         'statusCode': 200,
#         'body': json.dumps('Secret updated successfully!')
#     }
#             """),
#             environment={
#                 "SECRET_ARN": db_secret.secret_arn,
#                 "DB_ENDPOINT": db_instance.attr_endpoint_address,
#                 "DB_PORT": str(db_instance.attr_endpoint_port)
#             },
#             timeout=Duration.seconds(30),
#             role=lambda_role
#         )
        
#         # # Grant Lambda permission to update the secret
#         # db_secret.grant_read(update_secret_lambda)
#         # db_secret.grant_write(update_secret_lambda)
        
#         # Create custom resource to trigger Lambda after RDS creation
#         trigger = cr.AwsCustomResource(
#             self,
#             "UpdateSecretTrigger",
#             policy=cr.AwsCustomResourcePolicy.from_statements([
#                 iam.PolicyStatement(
#                     actions=["lambda:InvokeFunction"],
#                     resources=[update_secret_lambda.function_arn]
#                 )
#             ]),
#             on_create=cr.AwsSdkCall(
#                 service="Lambda",
#                 action="invoke",
#                 parameters={
#                     "FunctionName": update_secret_lambda.function_name,
#                     "InvocationType": "Event"
#                 },
#                 # physical_resource_id=cr.PhysicalResourceId.of("UpdateSecretTrigger")
#                 physical_resource_id=cr.PhysicalResourceId.of(f"UpdateSecretTrigger-{environment}-{construct_id}"
#             )
#         )
#         )
#         trigger.node.add_dependency(db_instance)

#         # Output connection information
#         CfnOutput(self, "RDSInstanceEndpoint", value=db_instance.attr_endpoint_address)
#         CfnOutput(self, "RDSInstancePort", value=str(db_instance.attr_endpoint_port))



# # ------ File: infrastructure\infrastructure\secrets_stack.py ------
# # ------ File: infrastructure/infrastructure/secrets_stack.py ------
# from aws_cdk import (
#     Stack,
#     aws_secretsmanager as secretsmanager,
#     CfnOutput
# )
# from constructs import Construct
# import importlib
# from types import SimpleNamespace
# import json

# class SecretsStack(Stack):
#     def load_config(self, env: str):
#         try:
#             module = importlib.import_module(f"infrastructure.config.{env}")
#             return SimpleNamespace(**vars(module))
#         except ModuleNotFoundError:
#             raise ValueError(f"Configuration for {env} not found")

#     def __init__(self, scope: Construct, construct_id: str, environment: str, **kwargs):
#         super().__init__(scope, construct_id, **kwargs)
#         config = self.load_config(environment)
#         prefix = f"testpy-{environment}"

#         # Create valid database name
#         db_name = f"db{environment}".replace("-", "").replace("_", "")
#         if not db_name[0].isalpha():
#             db_name = f"a{db_name}"

#         # Create database secret with all required fields
#         self.db_secret = secretsmanager.Secret(
#             self,
#             f"{prefix}-DBSecret",
#             secret_name=f"{prefix}-db-credentials",
#             generate_secret_string=secretsmanager.SecretStringGenerator(
#                 secret_string_template=json.dumps({
#                     "username": config.RDS_MASTER_USERNAME,
#                     "dbname": db_name,
#                     "maintenanceDb": "postgres",  # Default maintenance database
#                     "host": "TEMP-PLACEHOLDER",   # Will be updated later
#                     "port": "5432"                # Will be updated later
#                 }),
#                 generate_string_key="password",
#                 exclude_characters='/@" \\',
#                 password_length=16
#             )
#         )

#         # Output secret ARN
#         CfnOutput(self, "DBSecretArn", value=self.db_secret.secret_arn)
#         CfnOutput(self, "DBSecretName", value=self.db_secret.secret_name)



# # ------ File: infrastructure\infrastructure\security_group.py ------
# from aws_cdk import (
#     Stack,
#     aws_ec2 as ec2,
#     CfnOutput
# )
# from constructs import Construct
# import importlib
# from types import SimpleNamespace

# class SecurityGroupStack(Stack):
#     def load_config(self, env: str):
#         try:
#             module = importlib.import_module(f"infrastructure.config.{env}")
#             return SimpleNamespace(**vars(module))
#         except ModuleNotFoundError:
#             raise ValueError(f"Configuration for {env} not found")

#     def __init__(self, scope: Construct, construct_id: str, environment: str, vpc_id: str, **kwargs):
#         super().__init__(scope, construct_id, **kwargs)
#         config = self.load_config(environment)
#         prefix = f"testpy-{environment}"
        
#         # Create Security Group
#         # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnSecurityGroup.html
#         self.web_sg = ec2.CfnSecurityGroup(
#             self,
#             f"{prefix}-WebSG",
#             group_description=f"{prefix} Web Security Group",
#             vpc_id=vpc_id,
#             security_group_egress=[{
#                 "ipProtocol": "-1",
#                 "cidrIp": "0.0.0.0/0",
#                 "description": "Allow all outbound traffic"
#             }],
#             tags=[{"key": "Name", "value": f"{prefix}-WebSG"}]
#         )
        
#         # Add ingress rules
#         ingress_rules = []
#         if environment == "dev":
#             ingress_rules.append({
#                 "ipProtocol": "-1",
#                 "cidrIp": "0.0.0.0/0",
#                 "description": "Allow all traffic in dev"
#             })
#         else:
#             ingress_rules.extend([
#                 {
#                     "ipProtocol": "tcp",
#                     "fromPort": 80,
#                     "toPort": 80,
#                     "cidrIp": "0.0.0.0/0",
#                     "description": "Allow HTTP"
#                 },
#                 {
#                     "ipProtocol": "tcp",
#                     "fromPort": 443,
#                     "toPort": 443,
#                     "cidrIp": "0.0.0.0/0",
#                     "description": "Allow HTTPS"
#                 },
#                 {
#                     "ipProtocol": "tcp",
#                     "fromPort": 22,
#                     "toPort": 22,
#                     "cidrIp": "0.0.0.0/0",
#                     "description": "Allow SSH"
#                 }
#             ])
        
#         self.web_sg.security_group_ingress = ingress_rules

#          # Create RDS Security Group
#         self.rds_sg = ec2.CfnSecurityGroup(
#             self,
#             f"{prefix}-RDSSG",
#             group_description=f"{prefix} RDS Security Group",
#             vpc_id=vpc_id,
#             security_group_egress=[{
#                 "ipProtocol": "-1",
#                 "cidrIp": "0.0.0.0/0",
#                 "description": "Allow all outbound traffic"
#             }],
#             tags=[{"key": "Name", "value": f"{prefix}-RDSSG"}]
#         )
        
#         # Add ingress rules for rds_sg
#         rds_ingress_rules = []
#         if environment == "dev":
#             # Allow all traffic in dev
#             rds_ingress_rules.append({
#                 "ipProtocol": "-1",
#                 "cidrIp": "0.0.0.0/0",
#                 "description": "Allow all traffic in dev"
#             })
#         else:
#             # Restrict to PostgreSQL port in prod
#             rds_ingress_rules.append({
#                 "ipProtocol": "tcp",
#                 "fromPort": 5432,
#                 "toPort": 5432,
#                 "cidrIp": config.WEB_SERVER_CIDR,  # Allow only from web servers
#                 "description": "Allow PostgreSQL"
#             })
#         self.rds_sg.security_group_ingress = rds_ingress_rules
        
#         # Output security group IDs
#         CfnOutput(self, "WebSecurityGroupId", value=self.web_sg.attr_group_id)
#         CfnOutput(self, "RDSSecurityGroupId", value=self.rds_sg.attr_group_id)



# # ------ File: infrastructure\infrastructure\vpc_stack.py ------
# from aws_cdk import (
#     Stack,
#     aws_ec2 as ec2,
#     CfnOutput
# )
# from constructs import Construct
# import importlib
# from types import SimpleNamespace

# class VPCStack(Stack):
#     def load_config(self, env: str):
#         try:
#             module = importlib.import_module(f"infrastructure.config.{env}")
#             return SimpleNamespace(**vars(module))
#         except ModuleNotFoundError:
#             raise ValueError(f"Configuration for {env} not found")

#     def __init__(self, scope: Construct, construct_id: str, environment: str, **kwargs):
#         super().__init__(scope, construct_id, **kwargs)
#         config = self.load_config(environment)
#         prefix = f"testpy-{environment}"

#         # Create VPC
#         self.vpc = ec2.CfnVPC(
#             self,
#             "Vpc",
#             cidr_block=config.VPC_CIDR,
#             enable_dns_support=True,  # Required for RDS public access
#             enable_dns_hostnames=True,  # Required for RDS public access
#             tags=[{"key": "Name", "value": f"{prefix}-vpc"}]
#         )
        
#         # Create Internet Gateway
#         # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnInternetGateway.html
#         self.igw = ec2.CfnInternetGateway(
#             self,
#             "IGW",
#             tags=[{"key": "Name", "value": f"{prefix}-IGW"}]
#         )
        
#         # Attach IGW to VPC
#         # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnVPCGatewayAttachment.html
#         ec2.CfnVPCGatewayAttachment(
#             self,
#             "IGWAttach",
#             vpc_id=self.vpc.ref,
#             internet_gateway_id=self.igw.ref
#         )
        
#         # Create Route Table
#         # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnRouteTable.html
#         self.route_table = ec2.CfnRouteTable(
#             self,
#             "RouteTable",
#             vpc_id=self.vpc.ref,
#             tags=[{"key": "Name", "value": f"{prefix}-RT"}]
#         )
        
#         # Add default route to internet
#         # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnRoute.html
#         ec2.CfnRoute(
#             self,
#             "DefaultRoute",
#             route_table_id=self.route_table.ref,
#             destination_cidr_block="0.0.0.0/0",
#             gateway_id=self.igw.ref
#         )
        
#         # Create Public Subnets
#         # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnSubnet.html
#         self.public_subnets = []
#         for i, (subnet_cidr, az) in enumerate(zip(config.PUBLIC_SUBNET_CIDRS, config.AVAILABILITY_ZONES)):
#             subnet = ec2.CfnSubnet(
#                 self,
#                 f"PublicSubnet{i+1}",
#                 vpc_id=self.vpc.ref,
#                 cidr_block=subnet_cidr,
#                 availability_zone=az,
#                 map_public_ip_on_launch=True,
#                 tags=[{"key": "Name", "value": f"{prefix}-PublicSubnet{i+1}"}]
#             )
#             self.public_subnets.append(subnet)

        
#             # Associate subnet with route table
#             # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnSubnetRouteTableAssociation.html        
#             ec2.CfnSubnetRouteTableAssociation(
#                 self,
#                 f"SubnetRouteAssoc{i+1}",
#                 subnet_id=subnet.ref,
#                 route_table_id=self.route_table.ref
#             )

#         # Output VPC ID
#         CfnOutput(self, "VpcId", value=self.vpc.ref)
#         # Output Subnet IDs
#         for i, subnet in enumerate(self.public_subnets):
#             CfnOutput(self, f"PublicSubnetId{i+1}", value=subnet.ref)
        
#         CfnOutput(self, "RouteTableId", value=self.route_table.ref)



# # ------ File: infrastructure\infrastructure\config\__init__.py ------



# # ------ File: infrastructure\infrastructure\config\dev.py ------
# # Development environment configuration
# REGION = "us-east-1"
# VPC_CIDR = "10.0.0.0/16"
# PUBLIC_SUBNET_CIDRS = ["10.0.1.0/24", "10.0.2.0/24"]
# AVAILABILITY_ZONES = ["us-east-1a", "us-east-1b"]
# PROFILE_NAME = "tut"
# ## EC2 Server
# INSTANCE_TYPE = "t2.micro"
# KEY_NAME = "DevOpsKey"
# SERVER1_AMI = "ami-020cba7c55df1f615"  # Ubuntu Server 24.04 LTS
# SERVER2_AMI = "ami-050fd9796aa387c0d"  # Amazon Linux 2023
# ## POSTGRES
# RDS_INSTANCE_TYPE = "db.t3.micro"
# RDS_MASTER_USERNAME = "pydbadmin"
# RDS_ENGINE_VERSION = "17.5"
# RDS_PORT = 5432
# RDS_PUBLICLY_ACCESSIBLE = True
# RDS_ALLOCATED_STORAGE = "20"
# RDS_STORAGE_TYPE = "gp2"
# RDS_BACKUP_RETENTION = 0  # Days (0 disables backups)
# WEB_SERVER_CIDR = "10.0.0.0/16"



# # ------ File: infrastructure\infrastructure\config\prod.py ------
# # Production environment configuration
# REGION = "us-east-1"
# VPC_CIDR = "10.1.0.0/16"
# PUBLIC_SUBNET_CIDRS = ["10.1.1.0/24", "10.1.2.0/24"]
# AVAILABILITY_ZONES = ["us-east-1a", "us-east-1b"]
# PROFILE_NAME = "tut"
# ## EC2 Server
# INSTANCE_TYPE = "t2.micro"
# KEY_NAME = "DevOpsKey"
# SERVER1_AMI = "ami-020cba7c55df1f615"  # Ubuntu Server 24.04 LTS
# SERVER2_AMI = "ami-050fd9796aa387c0d"  # Amazon Linux 2023
# ## POSTGRES
# RDS_INSTANCE_TYPE = "db.t3.micro"
# RDS_MASTER_USERNAME = "pydbadmin"
# RDS_ENGINE_VERSION = "17.5"
# RDS_PORT = 5432
# RDS_PUBLICLY_ACCESSIBLE = False
# RDS_ALLOCATED_STORAGE = "100"
# RDS_STORAGE_TYPE = "gp3"
# RDS_BACKUP_RETENTION = 7  # Days (0 disables backups)
# WEB_SERVER_CIDR = "10.1.0.0/16"



# # ------ File: infrastructure\tests\__init__.py ------



# # ------ File: infrastructure\tests\unit\__init__.py ------



# # ------ File: infrastructure\tests\unit\test_infrastructure_stack.py ------
# import aws_cdk as core
# import aws_cdk.assertions as assertions

# from infrastructure.vpc_stack import InfrastructureStack

# # example tests. To run these tests, uncomment this file along with the example
# # resource in infrastructure/infrastructure_stack.py
# def test_sqs_queue_created():
#     app = core.App()
#     stack = InfrastructureStack(app, "infrastructure")
#     template = assertions.Template.from_stack(stack)

# #     template.has_resource_properties("AWS::SQS::Queue", {
# #         "VisibilityTimeout": 300
# #     })



