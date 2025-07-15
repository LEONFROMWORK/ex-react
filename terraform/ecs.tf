# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.app_name}-cluster"
  }
}

# ECR Repository
resource "aws_ecr_repository" "main" {
  name                 = "${var.app_name}-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "${var.app_name}-ecr"
  }
}

resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "main" {
  family                   = "${var.app_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "${var.app_name}-app"
      image = "${aws_ecr_repository.main.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      
      essential = true
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "NEXT_PUBLIC_APP_URL"
          value = "https://${var.domain_name}"
        }
      ]
      
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_credentials.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis_url.arn
        },
        {
          name      = "NEXTAUTH_URL"
          valueFrom = aws_secretsmanager_secret.nextauth_url.arn
        },
        {
          name      = "NEXTAUTH_SECRET"
          valueFrom = aws_secretsmanager_secret.nextauth_secret.arn
        },
        {
          name      = "OPENAI_API_KEY"
          valueFrom = aws_secretsmanager_secret.openai_api_key.arn
        },
        {
          name      = "TOSS_SECRET_KEY"
          valueFrom = aws_secretsmanager_secret.toss_secret_key.arn
        },
        {
          name      = "TOSS_WEBHOOK_SECRET"
          valueFrom = aws_secretsmanager_secret.toss_webhook_secret.arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      
      mountPoints = [
        {
          sourceVolume  = "efs-volume"
          containerPath = "/app/uploads"
        }
      ]
    }
  ])

  volume {
    name = "efs-volume"
    
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.main.id
      transit_encryption = "ENABLED"
      
      authorization_config {
        access_point_id = aws_efs_access_point.main.id
        iam             = "ENABLED"
      }
    }
  }

  tags = {
    Name = "${var.app_name}-task-definition"
  }
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = "${var.app_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.ecs_service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "${var.app_name}-app"
    container_port   = 3000
  }

  health_check_grace_period_seconds = 120

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  enable_execute_command = true

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_execution
  ]

  tags = {
    Name = "${var.app_name}-service"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.app_name}-app"
  retention_in_days = 30

  tags = {
    Name = "${var.app_name}-ecs-logs"
  }
}