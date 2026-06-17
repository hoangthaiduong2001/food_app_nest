output "endpoint" {
  value     = aws_elasticache_cluster.main.cache_nodes[0].address
  sensitive = true
}

output "ssm_parameter_arn" {
  value = aws_ssm_parameter.redis_url.arn
}
