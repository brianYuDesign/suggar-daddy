# 環境變數
variable "environment" {
  description = "環境名稱 (dev, prod)"
  type        = string
}

# AWS 區域
variable "aws_region" {
  description = "AWS 區域"
  type        = string
  default     = "ap-northeast-1"  # 東京
}

# 專案名稱
variable "project_name" {
  description = "專案名稱"
  type        = string
  default     = "suggar-daddy"
}

# VPC CIDR
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# Lightsail 實例大小
variable "lightsail_instance_size" {
  description = "Lightsail 實例大小 (nano, micro, small, medium, large)"
  type        = string
  default     = "medium"  # 4 GB RAM, 2 vCPU
}

# RDS 實例類型
variable "rds_instance_class" {
  description = "RDS 實例類型"
  type        = string
  default     = "db.t4g.micro"
}

# RDS 資料庫名稱
variable "rds_database_name" {
  description = "RDS 資料庫名稱"
  type        = string
  default     = "suggar_daddy"
}

# RDS 使用者名稱
variable "rds_master_username" {
  description = "RDS 管理員使用者名稱"
  type        = string
  default     = "admin"
}

# RDS 密碼（建議使用 Secrets Manager）
variable "rds_master_password" {
  description = "RDS 管理員密碼"
  type        = string
  sensitive   = true
}

# 是否啟用 RDS
variable "enable_rds" {
  description = "是否啟用 RDS (Dev 環境可以關閉，使用 Docker PostgreSQL)"
  type        = bool
  default     = true
}

# 是否啟用 ElastiCache
variable "enable_elasticache" {
  description = "是否啟用 ElastiCache Redis"
  type        = bool
  default     = false
}

# ElastiCache 節點類型
variable "elasticache_node_type" {
  description = "ElastiCache 節點類型"
  type        = string
  default     = "cache.t4g.micro"
}

# S3 Bucket 名稱
variable "s3_media_bucket_name" {
  description = "S3 媒體檔案 Bucket 名稱"
  type        = string
}

# 是否啟用 CloudFront
variable "enable_cloudfront" {
  description = "是否啟用 CloudFront CDN"
  type        = bool
  default     = false
}

# 域名（可選）
variable "domain_name" {
  description = "域名 (可選)"
  type        = string
  default     = ""
}

# 標籤
variable "tags" {
  description = "額外的資源標籤"
  type        = map(string)
  default     = {}
}
