variable "project_name" {
  description = "專案名稱"
  type        = string
  default     = "suggar-daddy"
}

variable "aws_region" {
  description = "AWS 區域"
  type        = string
  default     = "ap-northeast-1"  # 東京
}

variable "rds_database_name" {
  description = "RDS 資料庫名稱"
  type        = string
  default     = "suggar_daddy"
}

variable "rds_master_username" {
  description = "RDS 管理員使用者名稱"
  type        = string
  default     = "admin"
}

variable "rds_master_password" {
  description = "RDS 管理員密碼"
  type        = string
  sensitive   = true
}

variable "allowed_origins" {
  description = "允許的 CORS 來源"
  type        = list(string)
  default     = ["https://suggar-daddy.com"]  # 替換成你的域名
}
