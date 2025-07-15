output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.main.repository_url
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.main.name
}

output "s3_uploads_bucket" {
  description = "Name of the S3 bucket for uploads"
  value       = aws_s3_bucket.uploads.id
}

output "efs_file_system_id" {
  description = "EFS file system ID"
  value       = aws_efs_file_system.main.id
}

output "secrets_arns" {
  description = "ARNs of created secrets"
  value = {
    database_url      = aws_secretsmanager_secret.db_credentials.arn
    redis_url         = aws_secretsmanager_secret.redis_url.arn
    nextauth_url      = aws_secretsmanager_secret.nextauth_url.arn
    nextauth_secret   = aws_secretsmanager_secret.nextauth_secret.arn
    openai_api_key    = aws_secretsmanager_secret.openai_api_key.arn
    toss_secret_key   = aws_secretsmanager_secret.toss_secret_key.arn
    toss_webhook_secret = aws_secretsmanager_secret.toss_webhook_secret.arn
  }
  sensitive = true
}