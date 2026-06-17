output "alb_dns_name" {
  description = "ALB DNS — trỏ domain vào đây"
  value       = module.alb.dns_name
}

output "rds_endpoint" {
  description = "RDS endpoint (internal)"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint (internal)"
  value       = module.elasticache.endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "cloudwatch_log_group" {
  value = module.monitoring.log_group_name
}
