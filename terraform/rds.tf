# RDS Database
resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = module.vpc.database_subnets

  tags = {
    Name = "${var.app_name}-db-subnet-group"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_db_instance" "main" {
  identifier = "${var.app_name}-db"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.database_instance_class

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = var.database_name
  username = var.database_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.app_name}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = {
    Name = "${var.app_name}-db"
  }
}

# Store database credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.app_name}/production/DATABASE_URL"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = "postgresql://${var.database_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.database_name}"
}