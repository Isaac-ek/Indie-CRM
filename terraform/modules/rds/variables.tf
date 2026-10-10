variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for the DB subnet group"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for RDS"
}

variable "db_name" {
  type    = string
  default = "indiecrm"
}

variable "db_username" {
  type    = string
  default = "indieadmin"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}
