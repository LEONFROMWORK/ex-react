variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "exhell"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "exhell.com"
}

variable "database_name" {
  description = "RDS database name"
  type        = string
  default     = "exhell"
}

variable "database_username" {
  description = "RDS database username"
  type        = string
  default     = "exhell_user"
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "ecs_task_cpu" {
  description = "ECS task CPU units"
  type        = string
  default     = "1024"
}

variable "ecs_task_memory" {
  description = "ECS task memory"
  type        = string
  default     = "2048"
}

variable "ecs_service_desired_count" {
  description = "ECS service desired count"
  type        = number
  default     = 2
}

variable "ecs_service_min_count" {
  description = "ECS service minimum count for auto scaling"
  type        = number
  default     = 2
}

variable "ecs_service_max_count" {
  description = "ECS service maximum count for auto scaling"
  type        = number
  default     = 10
}