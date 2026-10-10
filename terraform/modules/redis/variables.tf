variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for Redis subnet group"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for Redis"
}

variable "node_type" {
  type    = string
  default = "cache.t4g.micro"
}
