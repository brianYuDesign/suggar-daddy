variable "project_name" {
  description = "專案名稱"
  type        = string
}

variable "environment" {
  description = "環境名稱"
  type        = string
}

variable "aws_region" {
  description = "AWS 區域"
  type        = string
}

variable "lightsail_bundle_id" {
  description = "Lightsail bundle ID"
  type        = string
  # nano_2_0     = $3.50/月  (512 MB RAM, 1 vCPU)
  # micro_2_0    = $5/月     (1 GB RAM, 1 vCPU)
  # small_2_0    = $10/月    (2 GB RAM, 1 vCPU)
  # medium_2_0   = $20/月    (4 GB RAM, 2 vCPU)
  # large_2_0    = $40/月    (8 GB RAM, 2 vCPU)
  default = "medium_2_0"  # 4 GB RAM
}

variable "tags" {
  description = "資源標籤"
  type        = map(string)
  default     = {}
}
