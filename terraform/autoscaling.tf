# Auto Scaling Target
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.ecs_service_max_count
  min_capacity       = var.ecs_service_min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  role_arn          = aws_iam_role.ecs_autoscaling.arn

  depends_on = [aws_ecs_service.main]
}

# CPU-based Auto Scaling Policy
resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.app_name}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Memory-based Auto Scaling Policy
resource "aws_appautoscaling_policy" "memory" {
  name               = "${var.app_name}-memory-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Request Count based Auto Scaling Policy
resource "aws_appautoscaling_policy" "requests" {
  name               = "${var.app_name}-requests-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.main.arn_suffix}"
    }

    target_value       = 1000.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Scheduled Scaling - Scale up during business hours
resource "aws_appautoscaling_scheduled_action" "scale_up" {
  name               = "${var.app_name}-scale-up"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension

  schedule = "cron(0 0 * * MON-FRI *)"  # 9 AM KST (0 UTC)

  scalable_target_action {
    min_capacity = 4
    max_capacity = var.ecs_service_max_count
  }
}

# Scheduled Scaling - Scale down during non-business hours
resource "aws_appautoscaling_scheduled_action" "scale_down" {
  name               = "${var.app_name}-scale-down"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension

  schedule = "cron(0 12 * * MON-FRI *)"  # 9 PM KST (12 UTC)

  scalable_target_action {
    min_capacity = var.ecs_service_min_count
    max_capacity = 6
  }
}