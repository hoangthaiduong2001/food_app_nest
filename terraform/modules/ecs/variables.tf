variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "alb_sg_id" { type = string }
variable "target_group_arn" { type = string }
variable "ecr_image" { type = string }
variable "app_port" { type = number }
variable "cpu" { type = number }
variable "memory" { type = number }
variable "desired_count" { type = number }
variable "log_group_name" { type = string }

variable "environment_variables" {
  type = list(object({ name = string, value = string }))
  default = []
}

variable "secrets" {
  type = list(object({ name = string, valueFrom = string }))
  default = []
}
