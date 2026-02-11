# Terraform 版本要求
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # 使用 S3 存儲 Terraform state（可選）
  # backend "s3" {
  #   bucket = "suggar-daddy-terraform-state"
  #   key    = "terraform.tfstate"
  #   region = "ap-northeast-1"
  # }
}

# AWS Provider 設定
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "suggar-daddy"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}
