└── .github\workflows
    └── dev-deploy.yml
└── backendservice/
    └── src/
    ├── package.json
    ├── serverless.yml
    ├── *.mjs
    ├── nodemon.json
    ├── *.js
└── infrastructure/
    └── infrastructure/
        ├── config/
        │   ├── __init__.py
        │   ├── dev.py
        │   └── prod.py
        ├── __init__.py
        └── rds_stack.py
        └── security_stack.py
        └── security_group.py
        └── vpc_stack.py
    └── .tests/
    ├── app.py
    ├── cdk.json
    ├── requirements-dev.txt
    ├── requirements.txt
    ├── setup.py
    ├── source.bat
└── .gitignore