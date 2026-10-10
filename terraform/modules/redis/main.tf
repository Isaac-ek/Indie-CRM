resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.app_name}-${var.environment}-redis-subnet-group"
  description = "Subnet group for Redis cluster"
  subnet_ids  = var.subnet_ids
}

resource "aws_elasticache_parameter_group" "redis7" {
  name   = "${var.app_name}-${var.environment}-redis7-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.app_name}-${var.environment}-redis"
  description          = "Redis replication group for rate limiting and queue deduplication"
  node_type            = var.node_type
  num_cache_clusters   = 1
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [var.security_group_id]
  parameter_group_name = aws_elasticache_parameter_group.redis7.name

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false # Unencrypted inside private VPC for simplicity
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.app_name}-${var.environment}-redis"
  }
}
