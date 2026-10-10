# 1. VPC & Networking Module
module "vpc" {
  source = "./modules/vpc"

  app_name           = var.app_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# 2. Security Groups Module
module "security_groups" {
  source = "./modules/security_groups"

  app_name    = var.app_name
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  app_port    = var.app_port
}

# 3. RDS PostgreSQL 16 Module (with pgvector support)
module "rds" {
  source = "./modules/rds"

  app_name             = var.app_name
  environment          = var.environment
  subnet_ids           = module.vpc.private_subnet_ids
  security_group_id    = module.security_groups.rds_security_group_id
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.db_password
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
}

# 4. Redis ElastiCache Module (Rate Limiting & Async Queue)
module "redis" {
  source = "./modules/redis"

  app_name          = var.app_name
  environment       = var.environment
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security_groups.redis_security_group_id
  node_type         = var.redis_node_type
}

# 5. S3 Asset Storage Module (Image Processing & OCR Documents)
module "s3_storage" {
  source = "./modules/s3_storage"

  app_name    = var.app_name
  environment = var.environment
}

# 6. ECS Fargate Application & Load Balancer Module
module "ecs_app" {
  source = "./modules/ecs_app"

  app_name              = var.app_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.security_groups.alb_security_group_id
  ecs_security_group_id = module.security_groups.ecs_security_group_id

  app_image         = var.app_image
  app_port          = var.app_port
  app_cpu           = var.app_cpu
  app_memory        = var.app_memory
  desired_count     = var.app_desired_count

  database_url      = module.rds.database_url
  redis_url         = module.redis.redis_url
  auth_secret       = var.auth_secret
  openai_api_key    = var.openai_api_key
  s3_bucket_name    = module.s3_storage.bucket_id
  s3_bucket_arn     = module.s3_storage.bucket_arn
}
