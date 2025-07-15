# S3 Bucket for uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.app_name}-uploads-${var.environment}"

  tags = {
    Name = "${var.app_name}-uploads"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "delete-old-files"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# EFS for persistent storage
resource "aws_efs_file_system" "main" {
  creation_token = "${var.app_name}-efs"
  encrypted      = true

  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = {
    Name = "${var.app_name}-efs"
  }
}

resource "aws_efs_mount_target" "main" {
  count           = length(module.vpc.private_subnets)
  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "main" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    gid = 1001
    uid = 1001
  }

  root_directory {
    path = "/uploads"

    creation_info {
      owner_gid   = 1001
      owner_uid   = 1001
      permissions = "755"
    }
  }

  tags = {
    Name = "${var.app_name}-efs-access-point"
  }
}

resource "aws_security_group" "efs" {
  name_prefix = "${var.app_name}-efs-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-efs-sg"
  }
}