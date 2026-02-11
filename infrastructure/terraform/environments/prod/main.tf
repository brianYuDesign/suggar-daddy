# Prod 環境配置

terraform {
  required_version = ">= 1.0"
}

# 獲取預設 VPC（簡化設定）
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Lightsail for application
module "lightsail" {
  source = "../../modules/lightsail"

  project_name        = var.project_name
  environment         = "prod"
  aws_region          = var.aws_region
  lightsail_bundle_id = "large_2_0"  # 8 GB RAM, $40/月

  tags = {
    Environment = "prod"
    CostCenter  = "production"
  }
}

# RDS PostgreSQL
module "rds" {
  source = "../../modules/rds"

  project_name       = var.project_name
  environment        = "prod"
  vpc_id             = data.aws_vpc.default.id
  vpc_cidr           = data.aws_vpc.default.cidr_block
  subnet_ids         = data.aws_subnets.default.ids
  instance_class     = "db.t4g.micro"  # $15/月
  database_name      = var.rds_database_name
  master_username    = var.rds_master_username
  master_password    = var.rds_master_password
  
  # Prod 設定
  multi_az                     = false  # 設為 true 啟用高可用（$60/月）
  backup_retention_period      = 7
  deletion_protection          = true
  skip_final_snapshot          = false
  enable_performance_insights  = false

  tags = {
    Environment = "prod"
  }
}

# S3 for media files
module "s3_media" {
  source = "../../modules/s3"

  bucket_name       = "${var.project_name}-prod-media"
  enable_versioning = true
  enable_lifecycle  = true
  allowed_origins   = var.allowed_origins

  tags = {
    Environment = "prod"
  }
}

# 輸出
output "lightsail_ip" {
  description = "Lightsail 公開 IP"
  value       = module.lightsail.public_ip
}

output "rds_endpoint" {
  description = "RDS 連線端點"
  value       = module.rds.db_endpoint
}

output "rds_address" {
  description = "RDS 主機位址"
  value       = module.rds.db_address
}

output "s3_media_bucket" {
  description = "S3 媒體 Bucket 名稱"
  value       = module.s3_media.bucket_name
}

output "ssh_private_key" {
  description = "SSH 私鑰（請妥善保管）"
  value       = module.lightsail.ssh_private_key
  sensitive   = true
}
