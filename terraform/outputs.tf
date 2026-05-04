# terraform/outputs.tf
output "frontend_url" {
  description = "Public URL of the frontend (ALB DNS)"
  value       = "http://${module.alb.alb_dns_name}"
}

output "backend_url" {
  description = "Internal backend API URL"
  value       = "http://${module.alb.alb_dns_name}/api"
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.alb_dns_name
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend image"
  value       = module.ecr.backend_repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend image"
  value       = module.ecr.frontend_repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
