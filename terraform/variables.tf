variable "project" {
  description = "Project name — dùng làm prefix cho tất cả resources"
  type        = string
  default     = "food-app"
}

variable "environment" {
  description = "Environment: prod | staging"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

# ─── App ──────────────────────────────────────────────────────────────────────

variable "app_port" {
  type    = number
  default = 3003
}

variable "cors_origins" {
  type    = string
  default = "https://yourdomain.com"
}

variable "ecr_image" {
  description = "Full ECR image URI: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/food-app-nest:latest"
  type        = string
  default     = "public.ecr.aws/nginx/nginx:latest" # placeholder cho LocalStack
}

variable "ecs_cpu" {
  type    = number
  default = 512
}

variable "ecs_memory" {
  type    = number
  default = 1024
}

variable "ecs_desired_count" {
  type    = number
  default = 1
}

# ─── RDS ──────────────────────────────────────────────────────────────────────

variable "db_name" {
  type    = string
  default = "food_app"
}

variable "db_username" {
  type    = string
  default = "food_user"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "change-me-in-production"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

# ─── Secrets ──────────────────────────────────────────────────────────────────

variable "access_token_secret" {
  type      = string
  sensitive = true
  default   = "change-me-in-production"
}

variable "refresh_token_secret" {
  type      = string
  sensitive = true
  default   = "change-me-in-production"
}

# ─── Monitoring ───────────────────────────────────────────────────────────────

variable "alert_email" {
  description = "Email nhận CloudWatch alerts"
  type        = string
  default     = "admin@yourdomain.com"
}
