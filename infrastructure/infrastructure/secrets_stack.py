# ------ File: infrastructure/infrastructure/secrets_stack.py ------
from aws_cdk import (
    Stack,
    aws_secretsmanager as secretsmanager,
    CfnOutput
)
from constructs import Construct
import importlib
from types import SimpleNamespace
import json

class SecretsStack(Stack):
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

        # Create valid database name
        db_name = f"db{environment}".replace("-", "").replace("_", "")
        if not db_name[0].isalpha():
            db_name = f"a{db_name}"

        # Create database secret with all required fields
        self.db_secret = secretsmanager.Secret(
            self,
            f"{prefix}-DBSecret",
            secret_name=f"{prefix}-db-credentials",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template=json.dumps({
                    "username": config.RDS_MASTER_USERNAME,
                    "dbname": db_name,
                    "maintenanceDb": "postgres",  # Default maintenance database
                    "host": "TEMP-PLACEHOLDER",   # Will be updated later
                    "port": "5432"                # Will be updated later
                }),
                generate_string_key="password",
                exclude_characters='/@" \\',
                password_length=16
            )
        )

        # Output secret ARN
        CfnOutput(self, "DBSecretArn", value=self.db_secret.secret_arn)
        CfnOutput(self, "DBSecretName", value=self.db_secret.secret_name)