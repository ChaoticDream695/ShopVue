# terraform/variables.tf
variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name used as a prefix for all resources"
  type        = string
  default     = "shopvue"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

# ── Networking ─────────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs to use (must be ≥ 2 for RDS)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ── ECS / Containers ───────────────────────────────────────────────────────────
variable "backend_cpu" {
  description = "Fargate CPU units for the backend task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Fargate memory (MB) for the backend task"
  type        = number
  default     = 512
}

variable "frontend_cpu" {
  type    = number
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "backend_desired_count" {
  description = "Number of backend task replicas"
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  type    = number
  default = 2
}

# ── RDS PostgreSQL ─────────────────────────────────────────────────────────────
variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_name" {
  type    = string
  default = "ecommerce_db"
}

variable "db_username" {
  type    = string
  default = "postgres"
}

variable "db_password" {
  description = "Master DB password — use AWS Secrets Manager in production!"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

# ── App config ─────────────────────────────────────────────────────────────────
variable "jwt_secret" {
  description = "JWT signing secret — keep this strong and secret!"
  type        = string
  sensitive   = true
}

variable "backend_port" {
  type    = number
  default = 3000
}

variable "frontend_port" {
  type    = number
  default = 80
}
