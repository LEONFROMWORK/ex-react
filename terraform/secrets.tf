# Application Secrets
resource "aws_secretsmanager_secret" "nextauth_url" {
  name = "${var.app_name}/production/NEXTAUTH_URL"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "nextauth_url" {
  secret_id     = aws_secretsmanager_secret.nextauth_url.id
  secret_string = "https://${var.domain_name}"
}

resource "aws_secretsmanager_secret" "nextauth_secret" {
  name = "${var.app_name}/production/NEXTAUTH_SECRET"
  recovery_window_in_days = 0
}

resource "random_password" "nextauth_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret_version" "nextauth_secret" {
  secret_id     = aws_secretsmanager_secret.nextauth_secret.id
  secret_string = random_password.nextauth_secret.result
}

# API Keys (these should be manually updated after creation)
resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "${var.app_name}/production/OPENAI_API_KEY"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = "sk-PLACEHOLDER-UPDATE-IN-CONSOLE"
  
  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "toss_secret_key" {
  name = "${var.app_name}/production/TOSS_SECRET_KEY"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "toss_secret_key" {
  secret_id     = aws_secretsmanager_secret.toss_secret_key.id
  secret_string = "PLACEHOLDER-UPDATE-IN-CONSOLE"
  
  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "toss_webhook_secret" {
  name = "${var.app_name}/production/TOSS_WEBHOOK_SECRET"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "toss_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.toss_webhook_secret.id
  secret_string = "PLACEHOLDER-UPDATE-IN-CONSOLE"
  
  lifecycle {
    ignore_changes = [secret_string]
  }
}