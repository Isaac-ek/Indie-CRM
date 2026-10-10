resource "aws_db_subnet_group" "main" {
  name        = "${var.app_name}-${var.environment}-db-subnet-group"
  description = "Subnet group for RDS PostgreSQL database"
  subnet_ids  = var.subnet_ids

  tags = {
    Name = "${var.app_name}-${var.environment}-db-subnet-group"
  }
}

resource "aws_db_parameter_group" "pg16" {
  name        = "${var.app_name}-${var.environment}-pg16-params"
  family      = "postgres16"
  description = "Custom parameter group with pgvector enabled"

  parameter {
    name  = "rds.force_ssl"
    value = "0" # Allow internal VPC non-SSL for local dev; set to 1 for prod enforcement
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-pg16-params"
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.app_name}-${var.environment}-db"
  allocated_storage = var.db_allocated_storage
  max_allocated_storage = 100
  storage_type      = "gp3"
  engine            = "postgres"
  engine_version    = "16.2"
  instance_class    = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]
  parameter_group_name   = aws_db_parameter_group.pg16.name

  skip_final_snapshot     = var.environment != "production"
  final_snapshot_identifier = "${var.app_name}-${var.environment}-final-snapshot"
  deletion_protection     = var.environment == "production"

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:30-Sun:05:30"
  storage_encrypted       = true
  publicly_accessible    = false

  tags = {
    Name = "${var.app_name}-${var.environment}-postgres"
  }
}
