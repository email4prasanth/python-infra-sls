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