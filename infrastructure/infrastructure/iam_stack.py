from aws_cdk import (
    Stack,
    aws_iam as iam,
    CfnOutput
)
from constructs import Construct

class IAMStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, environment: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)
        prefix = f"testpy-{environment}"
        
        # Create Lambda execution role
        lambda_role = iam.Role(
            self,
            "LambdaExecutionRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            role_name=f"{prefix}-lambda-exec-role",
            description="Execution role for Lambda functions"
        )
        
        # Attach managed policies
        managed_policies = [
            "service-role/AWSLambdaVPCAccessExecutionRole",
            "service-role/AWSLambdaBasicExecutionRole",
            "AmazonS3ReadOnlyAccess",
            "AmazonSESFullAccess",
            "SecretsManagerReadWrite",
            "AmazonRDSFullAccess"
        ]
        
        for policy in managed_policies:
            lambda_role.add_managed_policy(
                iam.ManagedPolicy.from_aws_managed_policy_name(policy)
            )
        self.lambda_role = lambda_role
        
        # Output role ARN
        CfnOutput(self, "LambdaRoleArn", value=lambda_role.role_arn)