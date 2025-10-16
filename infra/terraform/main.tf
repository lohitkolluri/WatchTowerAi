terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "watchtower" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "watchtower-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.watchtower.id
  tags   = { Name = "watchtower-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.watchtower.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = var.availability_zone
  tags                    = { Name = "watchtower-public-subnet" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.watchtower.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "watchtower-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "ec2_sg" {
  name        = "watchtower-ec2-sg"
  description = "Allow HTTP, HTTPS, SSH, app ports"
  vpc_id      = aws_vpc.watchtower.id

  ingress { from_port = 22  to_port = 22  protocol = "tcp" cidr_blocks = [var.ssh_ingress_cidr] }
  ingress { from_port = 80  to_port = 80  protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 3000 to_port = 3000 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 8000 to_port = 8000 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "watchtower-ec2-sg" }
}

resource "aws_key_pair" "deployer" {
  key_name   = var.key_pair_name
  public_key = var.ssh_public_key
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter { name = "name" values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"] }
  filter { name = "virtualization-type" values = ["hvm"] }
}

locals {
  user_data = templatefile("${path.module}/user_data.sh", {
    repo_url   = var.repo_url
    repo_path  = var.repo_path
    branch     = var.repo_branch
    compose_up = var.compose_up_on_boot
  })
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.deployer.key_name
  user_data                   = local.user_data

  tags = { Name = "watchtower-ec2" }
}

output "ec2_public_ip" { value = aws_instance.app.public_ip }


