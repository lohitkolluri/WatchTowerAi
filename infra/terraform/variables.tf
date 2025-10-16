variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "availability_zone" {
  description = "Availability zone for the subnet"
  type        = string
  default     = "us-east-1a"
}

variable "vpc_cidr" {
  description = "CIDR for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR for the public subnet"
  type        = string
  default     = "10.20.1.0/24"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed to SSH into EC2"
  type        = string
  default     = "0.0.0.0/0"
}

variable "key_pair_name" {
  description = "EC2 key pair name"
  type        = string
}

variable "ssh_public_key" {
  description = "Public key material for key pair"
  type        = string
}

variable "repo_url" {
  description = "Git repository URL to clone on the instance"
  type        = string
  default     = "https://github.com/lohitkolluri/WatchTowerAi.git"
}

variable "repo_path" {
  description = "Directory name to clone the repo into"
  type        = string
  default     = "WatchTowerAi"
}

variable "repo_branch" {
  description = "Branch to checkout"
  type        = string
  default     = "main"
}

variable "compose_up_on_boot" {
  description = "Whether to run docker compose up on first boot"
  type        = bool
  default     = true
}


