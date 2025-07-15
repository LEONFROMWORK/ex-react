terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "exhell-terraform-state"
    key    = "production/terraform.tfstate"
    region = "ap-northeast-2"
    encrypt = true
    dynamodb_table = "exhell-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Exhell"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}