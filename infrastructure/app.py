#!/usr/bin/env python3
import os

import aws_cdk as cdk

from infrastructure.vpc_stack import VPCStack
from infrastructure.security_group import SecurityGroupStack
from infrastructure.rds_stack import RDSStack
from infrastructure.secrets_stack import SecretsStack
from infrastructure.iam_stack import IAMStack


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

# Create Secrets stack
secrets_stack = SecretsStack(
    app, 
    f"SecretsStack-{env_name}",
    environment=env_name,
    env=cdk.Environment(account='180294218712', region='us-east-1')
)

# Create IAM stack
iam_stack = IAMStack(  # Add this stack
    app,
    f"IAMStack-{env_name}",
    environment=env_name,
    env=cdk.Environment(account='180294218712', region='us-east-1')
)

# Create RDS stack
rds_stack = RDSStack(
    app,
    f"RDSStack-{env_name}",
    environment=env_name,
    vpc=vpc_stack.vpc,  
    public_subnets=vpc_stack.public_subnets,
    web_security_group=sg_stack.web_sg,
    rds_security_group=sg_stack.rds_sg,
    db_secret=secrets_stack.db_secret,
    lambda_role=iam_stack.lambda_role,
    env=cdk.Environment(account='180294218712', region='us-east-1')
)

# security groups depend on VPC
sg_stack.add_dependency(vpc_stack)
# RDS depends on Security Group
rds_stack.add_dependency(sg_stack)
rds_stack.add_dependency(secrets_stack)
rds_stack.add_dependency(iam_stack) 

app.synth()
