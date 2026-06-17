project     = "food-app"
environment = "prod"
aws_region  = "ap-southeast-1"

availability_zones = ["ap-southeast-1a", "ap-southeast-1b"]
vpc_cidr           = "10.0.0.0/16"

# App
app_port          = 3003
cors_origins      = "https://yourdomain.com"
ecs_cpu           = 512
ecs_memory        = 1024
ecs_desired_count = 1

# ECR image — update sau khi push image
ecr_image = "123456789.dkr.ecr.ap-southeast-1.amazonaws.com/food-app-nest:latest"

# RDS
db_name           = "food_app"
db_username       = "food_user"
db_instance_class = "db.t3.micro"

# Monitoring
alert_email = "your-email@gmail.com"

# Secrets — dùng TF_VAR_ env vars thay vì lưu ở đây
# db_password          = set via TF_VAR_db_password
# access_token_secret  = set via TF_VAR_access_token_secret
# refresh_token_secret = set via TF_VAR_refresh_token_secret
