output "bucket_name" {
  description = "S3 Bucket 名稱"
  value       = aws_s3_bucket.media.id
}

output "bucket_arn" {
  description = "S3 Bucket ARN"
  value       = aws_s3_bucket.media.arn
}

output "bucket_domain_name" {
  description = "S3 Bucket 域名"
  value       = aws_s3_bucket.media.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "S3 Bucket 區域域名"
  value       = aws_s3_bucket.media.bucket_regional_domain_name
}
