resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-redis"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "redis" {
  name   = "${var.project}-${var.environment}-redis-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  tags = { Name = "${var.project}-${var.environment}-redis-sg" }
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project}-${var.environment}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  tags = { Name = "${var.project}-${var.environment}-redis" }
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "/${var.project}/${var.environment}/REDIS_URL"
  type  = "SecureString"
  value = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379"
}
