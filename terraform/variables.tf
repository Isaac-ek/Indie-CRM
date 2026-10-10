variable "aws_region" {
  description = "AWS region for provisioning infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Target deployment environment (staging, production)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name prefix"
  type        = string
  default     = "indie-crm"
}

variable "vpc_cidr" {
  description = "CIDR block for the main VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones for multi-AZ redundancy"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# RDS Postgres Configuration
variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "indiecrm"
}

variable "db_username" {
  description = "Master username for PostgreSQL database"
  type        = string
  default     = "indieadmin"
}

variable "db_password" {
  description = "Master password for PostgreSQL database"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance compute class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB for RDS"
  type        = number
  default     = 20
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

# ECS Application Configuration
variable "app_image" {
  description = "Docker image URI (ECR or DockerHub)"
  type        = string
  default     = "ghcr.io/isaac-ek/indie-crm:latest"
}

variable "app_port" {
  description = "Port exposed by the Next.js container"
  type        = number
  default     = 3000
}

variable "app_cpu" {
  description = "Fargate task CPU units (256, 512, 1024, etc.)"
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "Fargate task memory in MB (512, 1024, 2048, etc.)"
  type        = number
  default     = 1024
}

variable "app_desired_count" {
  description = "Desired number of running ECS task instances"
  type        = number
  default     = 2
}

variable "auth_secret" {
  description = "NextAuth / Auth.js encryption secret (32+ chars)"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API Key for vision and embeddings (optional)"
  type        = string
  sensitive   = true
  default     = ""
}
