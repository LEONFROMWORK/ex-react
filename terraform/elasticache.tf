# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.app_name}-redis-subnet-group"
  subnet_ids = module.vpc.elasticache_subnets

  tags = {
    Name = "${var.app_name}-redis-subnet-group"
  }
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.app_name}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.app_name}-redis"
  description                = "Redis cluster for ${var.app_name}"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  port                 = 6379
  
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true
  auth_token                = random_password.redis_auth_token.result
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }
  
  tags = {
    Name = "${var.app_name}-redis"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false  # Redis auth tokens don't support special characters
}

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.app_name}/redis/slow-log"
  retention_in_days = 7
}

# Store Redis credentials in Secrets Manager
resource "aws_secretsmanager_secret" "redis_url" {
  name = "${var.app_name}/production/REDIS_URL"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
}