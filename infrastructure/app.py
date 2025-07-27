#!/usr/bin/env python3
import os

import aws_cdk as cdk

from infrastructure.vpc_stack import VPCStack
from infrastructure.security_group import SecurityGroupStack
from infrastructure.rds_stack import RDSStack 


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

# Create RDS stack
rds_stack = RDSStack(
    app,
    f"RDSStack-{env_name}",
    environment=env_name,
    vpc=vpc_stack.vpc,  # Pass the actual VPC object, not the stack
    public_subnets=vpc_stack.public_subnets,  # Add this parameter
    web_security_group=sg_stack.web_sg,
    env=cdk.Environment(account='180294218712', region='us-east-1')
)

# security groups depend on VPC
sg_stack.add_dependency(vpc_stack)
# RDS depends on Security Group
rds_stack.add_dependency(sg_stack)

app.synth()
