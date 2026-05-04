# terraform/main.tf
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ── Remote state (recommended) ────────────────────────────────────────────
  # Uncomment and fill in after creating the S3 bucket + DynamoDB table.
  #
  backend "s3" {
    bucket         = "shopvue-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "shopvue-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Data sources ───────────────────────────────────────────────────────────────
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── Modules ────────────────────────────────────────────────────────────────────

module "vpc" {
  source = "./modules/vpc"

  project              = var.project
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "ecr" {
  source = "./modules/ecr"

  project     = var.project
  environment = var.environment
}

module "secrets" {
  source = "./modules/secrets"

  project      = var.project
  environment  = var.environment
  db_password  = var.db_password
  jwt_secret   = var.jwt_secret
}

module "iam" {
  source = "./modules/iam"

  project        = var.project
  environment    = var.environment
  aws_account_id = data.aws_caller_identity.current.account_id
  aws_region     = var.aws_region
  secret_arns    = module.secrets.secret_arns
}

module "rds" {
  source = "./modules/rds"

  project              = var.project
  environment          = var.environment
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.db_password
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.backend_security_group_id
}

module "alb" {
  source = "./modules/alb"

  project            = var.project
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  backend_port       = var.backend_port
  frontend_port      = var.frontend_port
}

module "ecs" {
  source = "./modules/ecs"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  backend_image          = "${module.ecr.backend_repository_url}:latest"
  frontend_image         = "${module.ecr.frontend_repository_url}:latest"
  backend_cpu            = var.backend_cpu
  backend_memory         = var.backend_memory
  frontend_cpu           = var.frontend_cpu
  frontend_memory        = var.frontend_memory
  backend_desired_count  = var.backend_desired_count
  frontend_desired_count = var.frontend_desired_count
  backend_port           = var.backend_port
  frontend_port          = var.frontend_port

  alb_backend_target_group_arn  = module.alb.backend_target_group_arn
  alb_frontend_target_group_arn = module.alb.frontend_target_group_arn
  alb_security_group_id         = module.alb.alb_security_group_id

  execution_role_arn = module.iam.ecs_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn

  db_host     = module.rds.db_endpoint
  db_name     = var.db_name
  db_username = var.db_username

  secret_db_password_arn = module.secrets.db_password_arn
  secret_jwt_arn         = module.secrets.jwt_secret_arn
}
