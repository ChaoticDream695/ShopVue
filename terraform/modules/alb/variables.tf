# variables.tf
variable "project"           { type = string }
variable "environment"       { type = string }
variable "vpc_id"            { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "backend_port"      { type = number }
variable "frontend_port"     { type = number }
