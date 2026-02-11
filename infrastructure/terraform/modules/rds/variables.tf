variable "project_name" {
  description = "專案名稱"
  type        = string
}

variable "environment" {
  description = "環境名稱"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for DB subnet group"
  type        = list(string)
}

variable "instance_class" {
  description = "RDS 實例類型"
  type        = string
  default     = "db.t4g.micro"
}

variable "postgres_version" {
  description = "PostgreSQL 版本"
  type        = string
  default     = "15.5"
}

variable "allocated_storage" {
  description = "初始儲存空間 (GB)"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "最大儲存空間 (GB)"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "資料庫名稱"
  type        = string
}

variable "master_username" {
  description = "管理員使用者名稱"
  type        = string
}

variable "master_password" {
  description = "管理員密碼"
  type        = string
  sensitive   = true
}

variable "publicly_accessible" {
  description = "是否可公開存取"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "備份保留天數"
  type        = number
  default     = 7
}

variable "multi_az" {
  description = "是否啟用 Multi-AZ"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "是否啟用刪除保護"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "刪除時是否跳過最終快照"
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "是否啟用效能洞察"
  type        = bool
  default     = false
}

variable "tags" {
  description = "資源標籤"
  type        = map(string)
  default     = {}
}
