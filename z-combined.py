# ------ File: infrastructure\app.py ------
#!/usr/bin/env python3
import os

import aws_cdk as cdk

from infrastructure.vpc_stack import VPCStack
from infrastructure.security_group import SecurityGroupStack
from infrastructure.compute_stack import ComputeStack


app = cdk.App()
env_name = app.node.try_get_context("env") or "dev"

# Create VPC stack
vpc_stack = VPCStack(
    app, 
    f"VPCStack-{env_name}",
    environment=env_name,
    env=cdk.Environment(account='180294218712', region='us-east-1')
    )
# Create Security Group stack
sg_stack = SecurityGroupStack(
    app,
    f"SecurityGroupStack-{env_name}",
    environment=env_name,
    vpc_id=vpc_stack.vpc.ref,
    env=cdk.Environment(account='180294218712', region='us-east-1')
)

# security groups depend on VPC
sg_stack.add_dependency(vpc_stack)

app.synth()



# ------ File: infrastructure\infrastructure\__init__.py ------



# ------ File: infrastructure\infrastructure\security_group.py ------
from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    CfnOutput
)
from constructs import Construct
import importlib
from types import SimpleNamespace

class SecurityGroupStack(Stack):
    def load_config(self, env: str):
        try:
            module = importlib.import_module(f"infrastructure.config.{env}")
            return SimpleNamespace(**vars(module))
        except ModuleNotFoundError:
            raise ValueError(f"Configuration for {env} not found")

    def __init__(self, scope: Construct, construct_id: str, environment: str, vpc_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        config = self.load_config(environment)
        prefix = f"testpy-{environment}"
        
        # Create Security Group
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnSecurityGroup.html
        self.web_sg = ec2.CfnSecurityGroup(
            self,
            f"{prefix}-WebSG",
            group_description=f"{prefix} Web Security Group",
            vpc_id=vpc_id,
            security_group_egress=[{
                "ipProtocol": "-1",
                "cidrIp": "0.0.0.0/0",
                "description": "Allow all outbound traffic"
            }],
            tags=[{"key": "Name", "value": f"{prefix}-WebSG"}]
        )
        
        # Add ingress rules
        ingress_rules = []
        if environment == "dev":
            ingress_rules.append({
                "ipProtocol": "-1",
                "cidrIp": "0.0.0.0/0",
                "description": "Allow all traffic in dev"
            })
        else:
            ingress_rules.extend([
                {
                    "ipProtocol": "tcp",
                    "fromPort": 80,
                    "toPort": 80,
                    "cidrIp": "0.0.0.0/0",
                    "description": "Allow HTTP"
                },
                {
                    "ipProtocol": "tcp",
                    "fromPort": 443,
                    "toPort": 443,
                    "cidrIp": "0.0.0.0/0",
                    "description": "Allow HTTPS"
                },
                {
                    "ipProtocol": "tcp",
                    "fromPort": 22,
                    "toPort": 22,
                    "cidrIp": config.SSH_ALLOWED_CIDR,
                    "description": "Allow SSH"
                }
            ])
        
        self.web_sg.security_group_ingress = ingress_rules
        
        # Output security group ID
        CfnOutput(self, "WebSecurityGroupId", value=self.web_sg.attr_group_id)



# ------ File: infrastructure\infrastructure\vpc_stack.py ------
from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    CfnOutput
)
from constructs import Construct
import importlib
from types import SimpleNamespace

class VPCStack(Stack):
    def load_config(self, env: str):
        try:
            module = importlib.import_module(f"infrastructure.config.{env}")
            return SimpleNamespace(**vars(module))
        except ModuleNotFoundError:
            raise ValueError(f"Configuration for {env} not found")

    def __init__(self, scope: Construct, construct_id: str, environment: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        config = self.load_config(environment)
        prefix = f"testpy-{environment}"

        # Create VPC
        self.vpc = ec2.CfnVPC(
            self,
            "Vpc",
            cidr_block=config.VPC_CIDR,
            tags=[{"key": "Name", "value": f"{prefix}-vpc"}]
        )
        
        # Create Internet Gateway
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnInternetGateway.html
        self.igw = ec2.CfnInternetGateway(
            self,
            "IGW",
            tags=[{"key": "Name", "value": f"{prefix}-IGW"}]
        )
        
        # Attach IGW to VPC
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnVPCGatewayAttachment.html
        ec2.CfnVPCGatewayAttachment(
            self,
            "IGWAttach",
            vpc_id=self.vpc.ref,
            internet_gateway_id=self.igw.ref
        )
        
        # Create Route Table
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnRouteTable.html
        self.route_table = ec2.CfnRouteTable(
            self,
            "RouteTable",
            vpc_id=self.vpc.ref,
            tags=[{"key": "Name", "value": f"{prefix}-RT"}]
        )
        
        # Add default route to internet
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnRoute.html
        ec2.CfnRoute(
            self,
            "DefaultRoute",
            route_table_id=self.route_table.ref,
            destination_cidr_block="0.0.0.0/0",
            gateway_id=self.igw.ref
        )
        
        # Create Public Subnets
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnSubnet.html
        self.public_subnets = []
        for i, (subnet_cidr, az) in enumerate(zip(config.PUBLIC_SUBNET_CIDRS, config.AVAILABILITY_ZONES)):
            subnet = ec2.CfnSubnet(
                self,
                f"PublicSubnet{i+1}",
                vpc_id=self.vpc.ref,
                cidr_block=subnet_cidr,
                availability_zone=az,
                map_public_ip_on_launch=True,
                tags=[{"key": "Name", "value": f"{prefix}-PublicSubnet{i+1}"}]
            )
            self.public_subnets.append(subnet)

        
            # Associate subnet with route table
            # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnSubnetRouteTableAssociation.html        
            ec2.CfnSubnetRouteTableAssociation(
                self,
                f"SubnetRouteAssoc{i+1}",
                subnet_id=subnet.ref,
                route_table_id=self.route_table.ref
            )

        # Output VPC ID
        CfnOutput(self, "VpcId", value=self.vpc.ref)
        # Output Subnet IDs
        for i, subnet in enumerate(self.public_subnets):
            CfnOutput(self, f"PublicSubnetId{i+1}", value=subnet.ref)
        
        CfnOutput(self, "RouteTableId", value=self.route_table.ref)



# ------ File: infrastructure\infrastructure\config\__init__.py ------



# ------ File: infrastructure\infrastructure\config\dev.py ------
# Development environment configuration
REGION = "us-east-1"
VPC_CIDR = "10.0.0.0/16"
PUBLIC_SUBNET_CIDRS = ["10.0.1.0/24", "10.0.2.0/24"]
AVAILABILITY_ZONES = ["us-east-1a", "us-east-1b"]
PROFILE_NAME = "tut"
INSTANCE_TYPE = "t2.micro"
KEY_NAME = "DevOpsKey"
SERVER1_AMI = "ami-020cba7c55df1f615"  # Ubuntu Server 24.04 LTS
SERVER2_AMI = "ami-050fd9796aa387c0d"  # Amazon Linux 2023



# ------ File: infrastructure\infrastructure\config\prod.py ------
# Production environment configuration
REGION = "us-east-1"
VPC_CIDR = "10.1.0.0/16"
PUBLIC_SUBNET_CIDRS = ["10.1.1.0/24", "10.1.2.0/24"]
AVAILABILITY_ZONES = ["us-east-1a", "us-east-1b"]
PROFILE_NAME = "tut"
INSTANCE_TYPE = "t2.micro"
KEY_NAME = "DevOpsKey"
SERVER1_AMI = "ami-020cba7c55df1f615"  # Ubuntu Server 24.04 LTS
SERVER2_AMI = "ami-050fd9796aa387c0d"  # Amazon Linux 2023



# ------ File: infrastructure\tests\__init__.py ------



# ------ File: infrastructure\tests\unit\__init__.py ------



# ------ File: infrastructure\tests\unit\test_infrastructure_stack.py ------
import aws_cdk as core
import aws_cdk.assertions as assertions

from infrastructure.vpc_stack import InfrastructureStack

# example tests. To run these tests, uncomment this file along with the example
# resource in infrastructure/infrastructure_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = InfrastructureStack(app, "infrastructure")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })



