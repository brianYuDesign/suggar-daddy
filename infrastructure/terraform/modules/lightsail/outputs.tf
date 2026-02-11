output "instance_id" {
  description = "Lightsail 實例 ID"
  value       = aws_lightsail_instance.main.id
}

output "instance_name" {
  description = "Lightsail 實例名稱"
  value       = aws_lightsail_instance.main.name
}

output "public_ip" {
  description = "公開 IP 位址"
  value       = aws_lightsail_static_ip.main.ip_address
}

output "private_ip" {
  description = "私有 IP 位址"
  value       = aws_lightsail_instance.main.private_ip_address
}

output "ssh_key_name" {
  description = "SSH Key 名稱"
  value       = aws_lightsail_key_pair.main.name
}

output "ssh_private_key" {
  description = "SSH 私鑰"
  value       = aws_lightsail_key_pair.main.private_key
  sensitive   = true
}
