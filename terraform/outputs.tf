output "application_url" {
  description = "Application Load Balancer URL"
  value       = "http://${module.ecs_app.alb_dns_name}"
}

output "ecs_cluster_name" {
  description = "ECS cluster identifier"
  value       = module.ecs_app.ecs_cluster_name
}

output "ecs_service_name" {
  description = "ECS service identifier"
  value       = module.ecs_app.ecs_service_name
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.db_endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.redis_url
}

output "s3_assets_bucket" {
  description = "S3 bucket for images and OCR attachments"
  value       = module.s3_storage.bucket_id
}
