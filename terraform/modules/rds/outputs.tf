output "db_endpoint" {
  description = "Connection endpoint of the PostgreSQL instance"
  value       = aws_db_instance.postgres.endpoint
}

output "db_address" {
  description = "Hostname address of the PostgreSQL database"
  value       = aws_db_instance.postgres.address
}

output "db_port" {
  description = "Port on which the database accepts connections"
  value       = aws_db_instance.postgres.port
}

output "database_url" {
  description = "Constructed Prisma DATABASE_URL connection string"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}?schema=public"
  sensitive   = true
}
