# Lightsail Instance for Dev Environment

# 建立 Lightsail 實例
resource "aws_lightsail_instance" "main" {
  name              = "${var.project_name}-${var.environment}"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = var.lightsail_bundle_id
  
  user_data = templatefile("${path.module}/user_data.sh", {
    environment = var.environment
    project_name = var.project_name
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}"
    }
  )
}

# 建立靜態 IP
resource "aws_lightsail_static_ip" "main" {
  name = "${var.project_name}-${var.environment}-ip"
}

# 附加靜態 IP 到實例
resource "aws_lightsail_static_ip_attachment" "main" {
  static_ip_name = aws_lightsail_static_ip.main.name
  instance_name  = aws_lightsail_instance.main.name
}

# 開放防火牆規則
resource "aws_lightsail_instance_public_ports" "main" {
  instance_name = aws_lightsail_instance.main.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = ["0.0.0.0/0"]  # SSH - 建議限制 IP
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"]  # HTTP
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
    cidrs     = ["0.0.0.0/0"]  # HTTPS
  }

  port_info {
    protocol  = "tcp"
    from_port = 3000
    to_port   = 3000
    cidrs     = ["0.0.0.0/0"]  # API Gateway
  }
}

# 建立 SSH Key Pair
resource "aws_lightsail_key_pair" "main" {
  name = "${var.project_name}-${var.environment}-key"
}
