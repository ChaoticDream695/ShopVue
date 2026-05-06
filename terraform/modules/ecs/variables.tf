variable "project"     { type = string }
variable "environment" { type = string }
variable "aws_region"  { type = string }

variable "vpc_id"             { type = string }
variable "private_subnet_ids" { type = list(string) }

variable "backend_image"  { type = string }
variable "frontend_image" { type = string }

variable "backend_cpu"    { type = number }
variable "backend_memory" { type = number }
variable "frontend_cpu"   { type = number }
variable "frontend_memory" { type = number }

variable "backend_desired_count"  { type = number }
variable "frontend_desired_count" { type = number }

variable "backend_port"  { type = number }
variable "frontend_port" { type = number }

variable "alb_backend_target_group_arn"  { type = string }
variable "alb_frontend_target_group_arn" { type = string }
variable "alb_security_group_id"         { type = string }

variable "execution_role_arn" { type = string }
variable "task_role_arn"      { type = string }

variable "db_host" {
  type      = string
  sensitive = true
}

variable "db_name"     { type = string }
variable "db_username" { type = string }

variable "secret_db_password_arn" { type = string }
variable "secret_jwt_arn"         { type = string }

variable "alb_dns_name" { type = string }
