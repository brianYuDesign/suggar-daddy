variable "bucket_name" {
  description = "S3 Bucket 名稱"
  type        = string
}

variable "enable_versioning" {
  description = "是否啟用版本控制"
  type        = bool
  default     = false
}

variable "enable_lifecycle" {
  description = "是否啟用生命週期規則"
  type        = bool
  default     = false
}

variable "allowed_origins" {
  description = "CORS 允許的來源"
  type        = list(string)
  default     = ["*"]
}

variable "cloudfront_oai_iam_arn" {
  description = "CloudFront OAI IAM ARN (可選)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "資源標籤"
  type        = map(string)
  default     = {}
}
