output "endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "ssm_parameter_arn" {
  value = aws_ssm_parameter.database_url.arn
}
