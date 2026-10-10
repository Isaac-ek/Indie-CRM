output "redis_primary_endpoint" {
  description = "Primary endpoint address for the Redis cluster"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Port number for Redis connections"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_url" {
  description = "Connection URL for Redis"
  value       = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
}
