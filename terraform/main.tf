terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Production: dùng S3 backend
  # backend "s3" {
  #   bucket         = "food-app-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "terraform-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  # LocalStack config — xóa block này khi deploy AWS thật
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    ec2            = "http://localhost:4566"
    ecs            = "http://localhost:4566"
    ecr            = "http://localhost:4566"
    rds            = "http://localhost:4566"
    elasticache    = "http://localhost:4566"
    elbv2          = "http://localhost:4566"
    iam            = "http://localhost:4566"
    s3             = "http://localhost:4566"
    ssm            = "http://localhost:4566"
    secretsmanager = "http://localhost:4566"
    logs           = "http://localhost:4566"
    cloudwatch     = "http://localhost:4566"
    sns            = "http://localhost:4566"
  }
}

# ─── Modules ──────────────────────────────────────────────────────────────────

module "vpc" {
  source = "./modules/vpc"

  project     = var.project
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  azs         = var.availability_zones
}

module "rds" {
  source = "./modules/rds"

  project            = var.project
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  ecs_sg_id          = module.ecs.ecs_sg_id
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = var.db_instance_class
}

module "elasticache" {
  source = "./modules/elasticache"

  project     = var.project
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  ecs_sg_id   = module.ecs.ecs_sg_id
}

module "alb" {
  source = "./modules/alb"

  project           = var.project
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  app_port          = var.app_port
}

module "ecs" {
  source = "./modules/ecs"

  project            = var.project
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  alb_sg_id          = module.alb.alb_sg_id
  target_group_arn   = module.alb.target_group_arn
  ecr_image          = var.ecr_image
  app_port           = var.app_port
  cpu                = var.ecs_cpu
  memory             = var.ecs_memory
  desired_count      = var.ecs_desired_count

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = tostring(var.app_port) },
    { name = "CORS_ORIGINS", value = var.cors_origins },
  ]

  secrets = [
    { name = "DATABASE_URL", valueFrom = module.rds.ssm_parameter_arn },
    { name = "REDIS_URL", valueFrom = module.elasticache.ssm_parameter_arn },
    { name = "ACCESS_TOKEN_SECRET", valueFrom = aws_ssm_parameter.access_token_secret.arn },
    { name = "REFRESH_TOKEN_SECRET", valueFrom = aws_ssm_parameter.refresh_token_secret.arn },
    { name = "ACCESS_TOKEN_EXPIRES_IN", valueFrom = aws_ssm_parameter.access_token_expires_in.arn },
    { name = "REFRESH_TOKEN_EXPIRES_IN", valueFrom = aws_ssm_parameter.refresh_token_expires_in.arn },
  ]

  log_group_name = module.monitoring.log_group_name
}

module "monitoring" {
  source = "./modules/monitoring"

  project        = var.project
  environment    = var.environment
  ecs_cluster    = module.ecs.cluster_name
  ecs_service    = module.ecs.service_name
  alb_arn_suffix = module.alb.alb_arn_suffix
  alert_email    = var.alert_email
}

# ─── SSM Parameters (secrets) ─────────────────────────────────────────────────

resource "aws_ssm_parameter" "access_token_secret" {
  name  = "/${var.project}/${var.environment}/ACCESS_TOKEN_SECRET"
  type  = "SecureString"
  value = var.access_token_secret
}

resource "aws_ssm_parameter" "refresh_token_secret" {
  name  = "/${var.project}/${var.environment}/REFRESH_TOKEN_SECRET"
  type  = "SecureString"
  value = var.refresh_token_secret
}

resource "aws_ssm_parameter" "access_token_expires_in" {
  name  = "/${var.project}/${var.environment}/ACCESS_TOKEN_EXPIRES_IN"
  type  = "String"
  value = "15m"
}

resource "aws_ssm_parameter" "refresh_token_expires_in" {
  name  = "/${var.project}/${var.environment}/REFRESH_TOKEN_EXPIRES_IN"
  type  = "String"
  value = "7d"
}
