resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-rds"
  subnet_ids = var.subnet_ids
  tags       = { Name = "${var.project}-${var.environment}-rds-subnet-group" }
}

resource "aws_security_group" "rds" {
  name   = "${var.project}-${var.environment}-rds-sg"
  vpc_id = var.vpc_id

  # Chỉ cho phép ECS security group kết nối
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  tags = { Name = "${var.project}-${var.environment}-rds-sg" }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project}-${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.db_instance_class
  allocated_storage = 20

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Production settings
  multi_az            = false # true cho production thật
  skip_final_snapshot = true  # false cho production thật
  deletion_protection = false # true cho production thật

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  tags = { Name = "${var.project}-${var.environment}-rds" }
}

# Lưu connection string vào SSM — ECS task đọc từ đây
resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project}/${var.environment}/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
}
