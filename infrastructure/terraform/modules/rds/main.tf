# RDS PostgreSQL

# 建立 DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-subnet"
    }
  )
}

# 建立 Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-sg"
    }
  )
}

# 建立 RDS PostgreSQL 實例
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  # 引擎設定
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.instance_class

  # 儲存設定
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # 資料庫設定
  db_name  = var.database_name
  username = var.master_username
  password = var.master_password
  port     = 5432

  # 網路設定
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = var.publicly_accessible

  # 備份設定
  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"  # UTC
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # 高可用性（僅 Prod）
  multi_az = var.multi_az

  # 效能設定
  performance_insights_enabled = var.enable_performance_insights

  # 刪除保護
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot

  # 自動升級
  auto_minor_version_upgrade = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db"
    }
  )
}
