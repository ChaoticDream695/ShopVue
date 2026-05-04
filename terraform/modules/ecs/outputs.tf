# terraform/modules/ecs/outputs.tf
output "cluster_name"             { value = aws_ecs_cluster.main.name }
output "cluster_arn"              { value = aws_ecs_cluster.main.arn }
output "backend_service_name"     { value = aws_ecs_service.backend.name }
output "frontend_service_name"    { value = aws_ecs_service.frontend.name }
output "backend_security_group_id"  { value = aws_security_group.backend.id }
output "frontend_security_group_id" { value = aws_security_group.frontend.id }
output "backend_log_group"        { value = aws_cloudwatch_log_group.backend.name }
output "frontend_log_group"       { value = aws_cloudwatch_log_group.frontend.name }
