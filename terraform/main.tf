# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

# Amplify App
resource "aws_amplify_app" "main" {
  name         = "s3-document-uploader"
  repository   = var.github_repository
  access_token = var.github_access_token

  enable_auto_branch_creation = true
  enable_branch_auto_build   = true
  build_spec = <<-EOT
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
EOT

  environment_variables = {
    NEXT_PUBLIC_AWS_REGION            = var.aws_region
    NEXT_PUBLIC_COGNITO_USER_POOL_ID  = aws_cognito_user_pool.main.id
    NEXT_PUBLIC_COGNITO_CLIENT_ID     = aws_cognito_user_pool_client.main.id
    NEXT_PUBLIC_IDENTITY_POOL_ID      = aws_cognito_identity_pool.main.id
    NEXT_PUBLIC_S3_BUCKET            = "dev-s3uploader-bucket-mn"
  }

  custom_rule {
    source = "/<*>"
    status = "404"
    target = "/index.html"
  }
}

# Amplify Branch
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = "main"
  
  framework = "Next.js - SSR"
  stage     = "PRODUCTION"
}

# Domain Association
resource "aws_amplify_domain_association" "main" {
  app_id      = aws_amplify_app.main.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "app"
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "s3-uploader-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase               = true
    require_numbers                 = true
    require_symbols                 = true
    require_uppercase               = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required           = true
    mutable            = true
    
    string_attribute_constraints {
      min_length = 3
      max_length = 255
    }
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "s3-uploader-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  callback_urls = ["https://app.${var.domain_name}/callback", "http://localhost:3000/callback"]
  logout_urls   = ["https://app.${var.domain_name}", "http://localhost:3000"]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                = ["email", "openid", "profile"]
}

# Cognito Identity Pool
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name = "s3uploader${var.environment}"

  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
}

# IAM Role for Authenticated Users
resource "aws_iam_role" "authenticated" {
  name = "cognito-authenticated-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" : "authenticated"
          }
        }
      }
    ]
  })
}

# IAM Policy for Authenticated Users
resource "aws_iam_role_policy" "authenticated" {
  name = "authenticated-policy-${var.environment}"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::dev-s3uploader-bucket-mn/*",
          "arn:aws:s3:::dev-s3uploader-bucket-mn"
        ]
        Condition = {
          StringLike = {
            "s3:prefix": ["$${cognito-identity.amazonaws.com:sub}/*"]
          }
        }
      }
    ]
  })
}

# Identity Pool Role Attachment
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated = aws_iam_role.authenticated.arn
  }
}