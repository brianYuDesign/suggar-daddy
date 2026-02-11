output "db_instance_id" {
  description = "RDS 實例 ID"
  value       = aws_db_instance.main.id
}

output "db_endpoint" {
  description = "RDS 連線端點"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "RDS 主機位址"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS 埠號"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "資料庫名稱"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "資料庫使用者名稱"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "security_group_id" {
  description = "RDS Security Group ID"
  value       = aws_security_group.rds.id
}
