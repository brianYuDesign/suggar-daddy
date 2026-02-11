# Dev 環境配置

terraform {
  required_version = ">= 1.0"
}

# 使用 Lightsail 模組
module "lightsail" {
  source = "../../modules/lightsail"

  project_name          = var.project_name
  environment           = "dev"
  aws_region            = var.aws_region
  lightsail_bundle_id   = "medium_2_0"  # 4 GB RAM, $20/月

  tags = {
    Environment = "dev"
    CostCenter  = "development"
  }
}

# S3 for media files
module "s3_media" {
  source = "../../modules/s3"

  bucket_name            = "${var.project_name}-dev-media"
  enable_versioning      = false
  enable_lifecycle       = false
  allowed_origins        = ["http://localhost:3000", "http://${module.lightsail.public_ip}"]
  cloudfront_oai_iam_arn = ""

  tags = {
    Environment = "dev"
  }
}

# 輸出
output "lightsail_ip" {
  description = "Lightsail 公開 IP"
  value       = module.lightsail.public_ip
}

output "lightsail_instance_name" {
  description = "Lightsail 實例名稱"
  value       = module.lightsail.instance_name
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
