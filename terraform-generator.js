(() => {
  'use strict';

  // ============================================================
  // RESOURCE DEFINITIONS
  // ============================================================
  const RESOURCE_DEFS = {

    // ── VPC & Networking ────────────────────────────────────────
    vpc: {
      group: 'vpc',
      label: 'VPC',
      fields: [
        { key: 'cidr_block', label: 'CIDR Block', type: 'text', default: '10.0.0.0/16', desc: 'IP range for the VPC' },
        { key: 'enable_dns_support', label: 'DNS Support', type: 'checkbox', default: true },
        { key: 'enable_dns_hostnames', label: 'DNS Hostnames', type: 'checkbox', default: true },
        { key: 'instance_tenancy', label: 'Instance Tenancy', type: 'select', options: ['default', 'dedicated', 'host'], default: 'default' },
        { key: 'tags', label: 'Name Tag', type: 'text', default: 'main-vpc', desc: 'Name tag for the VPC' },
      ],
      generate(cfg) {
        return `resource "aws_vpc" "main" {
  cidr_block           = "${cfg.cidr_block}"
  enable_dns_support   = ${cfg.enable_dns_support}
  enable_dns_hostnames = ${cfg.enable_dns_hostnames}
  instance_tenancy     = "${cfg.instance_tenancy}"

  tags = {
    Name = "${cfg.tags}"
  }
}`;
      },
      variables() {
        return `variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}`;
      },
      outputs(cfg) {
        return `output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}`;
      },
    },

    subnets: {
      group: 'vpc',
      label: 'Subnets',
      fields: [
        { key: 'vpc_cidr', label: 'VPC CIDR (for subnet sizing)', type: 'text', default: '10.0.0.0/16', desc: 'Must match VPC CIDR if VPC is selected' },
        { key: 'public_subnet_cidr', label: 'Public Subnet CIDR', type: 'text', default: '10.0.1.0/24' },
        { key: 'private_subnet_cidr', label: 'Private Subnet CIDR', type: 'text', default: '10.0.2.0/24' },
        { key: 'availability_zone', label: 'Availability Zone', type: 'text', default: 'us-east-1a', desc: 'AZ for subnets' },
        { key: 'public_subnet_name', label: 'Public Subnet Name', type: 'text', default: 'public-subnet' },
        { key: 'private_subnet_name', label: 'Private Subnet Name', type: 'text', default: 'private-subnet' },
      ],
      generate(cfg) {
        return `resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "${cfg.public_subnet_cidr}"
  availability_zone       = "${cfg.availability_zone}"
  map_public_ip_on_launch = true

  tags = {
    Name = "${cfg.public_subnet_name}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "${cfg.private_subnet_cidr}"
  availability_zone = "${cfg.availability_zone}"

  tags = {
    Name = "${cfg.private_subnet_name}"
    Tier = "private"
  }
}`;
      },
      variables() {
        return `variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for the private subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "availability_zone" {
  description = "Availability zone for subnets"
  type        = string
  default     = "us-east-1a"
}`;
      },
      outputs(cfg) {
        return `output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "ID of the private subnet"
  value       = aws_subnet.private.id
}`;
      },
    },

    igw: {
      group: 'vpc',
      label: 'Internet Gateway',
      fields: [
        { key: 'tags', label: 'Name Tag', type: 'text', default: 'main-igw', desc: 'Name tag for the IGW' },
      ],
      generate(cfg) {
        return `resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${cfg.tags}"
  }
}`;
      },
      outputs(cfg) {
        return `output "igw_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}`;
      },
    },

    nat: {
      group: 'vpc',
      label: 'NAT Gateway',
      fields: [
        { key: 'subnet_id_source', label: 'Subnet Source', type: 'select', options: ['public'], default: 'public', desc: 'Which subnet to place the NAT Gateway in' },
        { key: 'allocation_id_source', label: 'Elastic IP', type: 'select', options: ['auto_create'], default: 'auto_create', desc: 'Auto-create an Elastic IP' },
        { key: 'tags', label: 'Name Tag', type: 'text', default: 'main-nat', desc: 'Name tag for the NAT Gateway' },
      ],
      generate(cfg) {
        return `resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${cfg.tags}-eip"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "${cfg.tags}"
  }

  depends_on = [aws_internet_gateway.main]
}`;
      },
      outputs(cfg) {
        return `output "nat_gateway_id" {
  description = "ID of the NAT Gateway"
  value       = aws_nat_gateway.main.id
}

output "nat_eip" {
  description = "Elastic IP of the NAT Gateway"
  value       = aws_eip.nat.public_ip
}`;
      },
    },

    route_tables: {
      group: 'vpc',
      label: 'Route Tables',
      fields: [
        { key: 'public_rt_name', label: 'Public Route Table Name', type: 'text', default: 'public-rt' },
        { key: 'private_rt_name', label: 'Private Route Table Name', type: 'text', default: 'private-rt' },
        { key: 'public_cidr', label: 'Public Route CIDR', type: 'text', default: '0.0.0.0/0' },
        { key: 'private_cidr', label: 'Private Route CIDR', type: 'text', default: '0.0.0.0/0' },
      ],
      generate(cfg) {
        return `resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "${cfg.public_cidr}"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${cfg.public_rt_name}"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "${cfg.private_cidr}"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${cfg.private_rt_name}"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}`;
      },
      outputs(cfg) {
        return `output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table"
  value       = aws_route_table.private.id
}`;
      },
    },

    security_groups: {
      group: 'vpc',
      label: 'Security Groups',
      fields: [
        { key: 'name', label: 'Security Group Name', type: 'text', default: 'main-sg', desc: 'Name for the security group' },
        { key: 'ssh_cidr', label: 'SSH Allowed CIDR', type: 'text', default: '0.0.0.0/0', desc: 'CIDR for SSH access (restrict in production!)' },
        { key: 'http_cidr', label: 'HTTP/HTTPS Allowed CIDR', type: 'text', default: '0.0.0.0/0', desc: 'CIDR for web access' },
        { key: 'ssh_port', label: 'SSH Port', type: 'text', default: '22' },
        { key: 'enable_ssh', label: 'Enable SSH (port 22)', type: 'checkbox', default: true },
        { key: 'enable_http', label: 'Enable HTTP (port 80)', type: 'checkbox', default: true },
        { key: 'enable_https', label: 'Enable HTTPS (port 443)', type: 'checkbox', default: true },
      ],
      generate(cfg) {
        let ingress = '';
        if (cfg.enable_ssh) {
          ingress += `
  ingress {
    description = "SSH"
    from_port   = ${cfg.ssh_port}
    to_port     = ${cfg.ssh_port}
    protocol    = "tcp"
    cidr_blocks = ["${cfg.ssh_cidr}"]
  }`;
        }
        if (cfg.enable_http) {
          ingress += `
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["${cfg.http_cidr}"]
  }`;
        }
        if (cfg.enable_https) {
          ingress += `
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["${cfg.http_cidr}"]
  }`;
        }
        return `resource "aws_security_group" "main" {
  name        = "${cfg.name}"
  description = "Security group with managed rules"
  vpc_id      = aws_vpc.main.id${ingress}

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${cfg.name}"
  }
}`;
      },
      outputs(cfg) {
        return `output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.main.id
}`;
      },
    },

    // ── Compute ─────────────────────────────────────────────────
    ec2: {
      group: 'compute',
      label: 'EC2 Instances',
      fields: [
        { key: 'instance_type', label: 'Instance Type', type: 'select', options: ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium', 't3.large', 'm5.large', 'm5.xlarge', 'c5.large', 'r5.large'], default: 't2.micro' },
        { key: 'ami_id', label: 'AMI ID', type: 'text', default: 'ami-0c55b159cbfafe1f0', desc: 'Amazon Linux 2 AMI (us-east-1)' },
        { key: 'key_name', label: 'Key Pair Name', type: 'text', default: 'my-key', desc: 'Name of the SSH key pair' },
        { key: 'instance_count', label: 'Instance Count', type: 'text', default: '1', desc: 'Number of instances' },
        { key: 'subnet_source', label: 'Subnet', type: 'select', options: ['public', 'private'], default: 'public' },
        { key: 'tags', label: 'Name Tag', type: 'text', default: 'web-server', desc: 'Name tag for EC2 instance' },
      ],
      generate(cfg) {
        const subnet = cfg.subnet_source === 'private' ? 'aws_subnet.private.id' : 'aws_subnet.public.id';
        return `resource "aws_instance" "main" {
  count         = ${cfg.instance_count}
  ami           = "${cfg.ami_id}"
  instance_type = "${cfg.instance_type}"
  key_name      = "${cfg.key_name}"
  subnet_id     = ${subnet}
  vpc_security_group_ids = [aws_security_group.main.id]

  tags = {
    Name = "\${var.project_name}-${cfg.tags}-\${count.index + 1}"
  }
}`;
      },
      variables() {
        return `variable "project_name" {
  description = "Project name used as prefix for resource naming"
  type        = string
  default     = "myproject"
}`;
      },
      outputs(cfg) {
        return `output "ec2_instance_ids" {
  description = "IDs of the EC2 instances"
  value       = aws_instance.main[*].id
}

output "ec2_public_ips" {
  description = "Public IPs of the EC2 instances"
  value       = aws_instance.main[*].public_ip
}`;
      },
    },

    launch_template: {
      group: 'compute',
      label: 'Launch Template',
      fields: [
        { key: 'name_prefix', label: 'Name Prefix', type: 'text', default: 'web-', desc: 'Prefix for the launch template name' },
        { key: 'instance_type', label: 'Instance Type', type: 'select', options: ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium', 't3.large', 'm5.large'], default: 't2.small' },
        { key: 'ami_id', label: 'AMI ID', type: 'text', default: 'ami-0c55b159cbfafe1f0', desc: 'Amazon Linux 2 AMI' },
        { key: 'key_name', label: 'Key Pair Name', type: 'text', default: 'my-key' },
        { key: 'associate_public_ip', label: 'Associate Public IP', type: 'checkbox', default: true },
        { key: 'user_data_script', label: 'User Data Script', type: 'textarea', default: '#!/bin/bash\nyum update -y\nyum install -y httpd\nsystemctl start httpd\nsystemctl enable httpd', desc: 'Bash script to run on launch' },
      ],
      generate(cfg) {
        const b64 = btoa(cfg.user_data_script);
        return `resource "aws_launch_template" "main" {
  name_prefix   = "${cfg.name_prefix}"
  image_id      = "${cfg.ami_id}"
  instance_type = "${cfg.instance_type}"
  key_name      = "${cfg.key_name}"

  vpc_security_group_ids = [aws_security_group.main.id]

  associate_public_ip_address = ${cfg.associate_public_ip}

  user_data = base64encode("${btoa(cfg.user_data_script).replace(/"/g, '\\"')}")

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${cfg.name_prefix}instance"
    }
  }
}`;
      },
      outputs(cfg) {
        return `output "launch_template_id" {
  description = "ID of the launch template"
  value       = aws_launch_template.main.id
}

output "launch_template_latest_version" {
  description = "Latest version of the launch template"
  value       = aws_launch_template.main.latest_version
}`;
      },
    },

    asg: {
      group: 'compute',
      label: 'Auto Scaling Group',
      fields: [
        { key: 'name', label: 'ASG Name', type: 'text', default: 'web-asg', desc: 'Name for the Auto Scaling Group' },
        { key: 'min_size', label: 'Min Size', type: 'text', default: '1' },
        { key: 'max_size', label: 'Max Size', type: 'text', default: '4' },
        { key: 'desired_capacity', label: 'Desired Capacity', type: 'text', default: '2' },
        { key: 'health_check_type', label: 'Health Check Type', type: 'select', options: ['EC2', 'ELB'], default: 'EC2' },
        { key: 'health_check_grace', label: 'Health Check Grace Period (s)', type: 'text', default: '300' },
        { key: 'target_group_arns', label: 'Target Group ARNs', type: 'text', default: '', desc: 'Comma-separated ARNs (leave empty to skip)' },
      ],
      generate(cfg) {
        let tgBlock = '';
        if (cfg.target_group_arns && cfg.target_group_arns.trim()) {
          const arns = cfg.target_group_arns.split(',').map(a => a.trim()).filter(Boolean);
          tgBlock = `\n  target_group_arns = [${arns.map(a => `"${a}"`).join(', ')}]`;
        }
        return `resource "aws_autoscaling_group" "main" {
  name                = "${cfg.name}"
  min_size            = ${cfg.min_size}
  max_size            = ${cfg.max_size}
  desired_capacity    = ${cfg.desired_capacity}
  vpc_zone_identifier = [aws_subnet.private.id]
  health_check_type   = "${cfg.health_check_type}"
  health_check_grace_period = ${cfg.health_check_grace}${tgBlock}

  launch_template {
    id      = aws_launch_template.main.id
    version = "\$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${cfg.name}"
    propagate_at_launch = true
  }
}`;
      },
      outputs(cfg) {
        return `output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = aws_autoscaling_group.main.name
}

output "asg_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = aws_autoscaling_group.main.arn
}`;
      },
    },

    key_pair: {
      group: 'compute',
      label: 'Key Pair',
      fields: [
        { key: 'key_name', label: 'Key Pair Name', type: 'text', default: 'my-key', desc: 'Name for the key pair' },
        { key: 'public_key', label: 'Public Key', type: 'textarea', default: 'ssh-rsa AAAA...', desc: 'Paste your SSH public key here' },
      ],
      generate(cfg) {
        return `resource "aws_key_pair" "main" {
  key_name   = "${cfg.key_name}"
  public_key = "${cfg.public_key}"
}`;
      },
      outputs(cfg) {
        return `output "key_pair_name" {
  description = "Name of the key pair"
  value       = aws_key_pair.main.key_name
}`;
      },
    },

    // ── Storage ─────────────────────────────────────────────────
    s3: {
      group: 'storage',
      label: 'S3 Buckets',
      fields: [
        { key: 'bucket_name', label: 'Bucket Name', type: 'text', default: 'my-app-bucket', desc: 'Globally unique bucket name' },
        { key: 'enable_versioning', label: 'Enable Versioning', type: 'checkbox', default: true },
        { key: 'enable_encryption', label: 'Enable Encryption (AES256)', type: 'checkbox', default: true },
        { key: 'force_destroy', label: 'Force Destroy', type: 'checkbox', default: false, desc: 'Allow bucket deletion even if not empty' },
        { key: 'block_public_access', label: 'Block Public Access', type: 'checkbox', default: true },
        { key: 'lifecycle_days', label: 'Lifecycle Transition Days', type: 'text', default: '90', desc: 'Days before transitioning to IA (0 to disable)' },
      ],
      generate(cfg) {
        let blocks = '';
        if (cfg.enable_versioning) {
          blocks += `
  versioning {
    enabled = true
  }`;
        }
        if (cfg.enable_encryption) {
          blocks += `
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }`;
        }
        if (cfg.block_public_access) {
          blocks += `
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true`;
        }
        if (cfg.lifecycle_days && parseInt(cfg.lifecycle_days) > 0) {
          blocks += `
  lifecycle_rule {
    enabled = true

    transition {
      days          = ${cfg.lifecycle_days}
      storage_class = "STANDARD_IA"
    }
  }`;
        }
        return `resource "aws_s3_bucket" "main" {
  bucket        = "${cfg.bucket_name}"
  force_destroy = ${cfg.force_destroy}${blocks}

  tags = {
    Name = "${cfg.bucket_name}"
  }
}`;
      },
      outputs(cfg) {
        return `output "s3_bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}`;
      },
    },

    ebs: {
      group: 'storage',
      label: 'EBS Volumes',
      fields: [
        { key: 'size', label: 'Volume Size (GB)', type: 'text', default: '20' },
        { key: 'type', label: 'Volume Type', type: 'select', options: ['gp2', 'gp3', 'io1', 'io2', 'st1', 'sc1', 'standard'], default: 'gp3' },
        { key: 'iops', label: 'IOPS', type: 'text', default: '3000', desc: 'Only for gp3/io1/io2' },
        { key: 'throughput', label: 'Throughput (MB/s)', type: 'text', default: '125', desc: 'Only for gp3' },
        { key: 'availability_zone', label: 'Availability Zone', type: 'text', default: 'us-east-1a' },
        { key: 'encrypted', label: 'Encrypted', type: 'checkbox', default: true },
        { key: 'tags', label: 'Name Tag', type: 'text', default: 'data-volume' },
      ],
      generate(cfg) {
        return `resource "aws_ebs_volume" "main" {
  size              = ${cfg.size}
  type              = "${cfg.type}"
  iops              = ${cfg.type.startsWith('gp3') || cfg.type.startsWith('io') ? cfg.iops : 'null'}
  throughput        = ${cfg.type === 'gp3' ? cfg.throughput : 'null'}
  availability_zone = "${cfg.availability_zone}"
  encrypted         = ${cfg.encrypted}

  tags = {
    Name = "${cfg.tags}"
  }
}`;
      },
      outputs(cfg) {
        return `output "ebs_volume_id" {
  description = "ID of the EBS volume"
  value       = aws_ebs_volume.main.id
}`;
      },
    },

    efs: {
      group: 'storage',
      label: 'EFS',
      fields: [
        { key: 'name', label: 'File System Name', type: 'text', default: 'shared-efs' },
        { key: 'performance_mode', label: 'Performance Mode', type: 'select', options: ['generalPurpose', 'maxIO'], default: 'generalPurpose' },
        { key: 'throughput_mode', label: 'Throughput Mode', type: 'select', options: ['bursting', 'provisioned', 'elastic'], default: 'bursting' },
        { key: 'encrypted', label: 'Encrypted', type: 'checkbox', default: true },
        { key: 'provisioned_throughput', label: 'Provisioned Throughput (MiB/s)', type: 'text', default: '100', desc: 'Only for provisioned mode' },
        { key: 'enable_lifecycle_policy', label: 'Enable Lifecycle Policy', type: 'checkbox', default: false },
        { key: 'lifecycle_transition_days', label: 'Transition to IA Days', type: 'text', default: '30' },
      ],
      generate(cfg) {
        let blocks = '';
        if (cfg.throughput_mode === 'provisioned') {
          blocks += `\n  provisioned_throughput_in_mibps = ${cfg.provisioned_throughput}`;
        }
        if (cfg.enable_lifecycle_policy) {
          blocks += `
  lifecycle_policy {
    transition {
      days = ${cfg.lifecycle_transition_days}
    }
  }`;
        }
        return `resource "aws_efs_file_system" "main" {
  creation_token   = "${cfg.name}"
  performance_mode = "${cfg.performance_mode}"
  throughput_mode  = "${cfg.throughput_mode}"${blocks}
  encrypted        = ${cfg.encrypted}

  tags = {
    Name = "${cfg.name}"
  }
}

resource "aws_efs_mount_target" "main" {
  file_system_id  = aws_efs_file_system.main.id
  subnet_id       = aws_subnet.private.id
  security_groups = [aws_security_group.main.id]
}`;
      },
      outputs(cfg) {
        return `output "efs_id" {
  description = "ID of the EFS file system"
  value       = aws_efs_file_system.main.id
}

output "efs_dns_name" {
  description = "DNS name of the EFS file system"
  value       = aws_efs_file_system.main.dns_name
}`;
      },
    },

    // ── Database ────────────────────────────────────────────────
    rds: {
      group: 'database',
      label: 'RDS Instance',
      fields: [
        { key: 'engine', label: 'Engine', type: 'select', options: ['mysql', 'postgres', 'mariadb'], default: 'mysql' },
        { key: 'engine_version', label: 'Engine Version', type: 'text', default: '8.0', desc: 'e.g. 8.0 for MySQL, 15.4 for PostgreSQL' },
        { key: 'instance_class', label: 'Instance Class', type: 'select', options: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.r5.large', 'db.r5.xlarge'], default: 'db.t3.micro' },
        { key: 'allocated_storage', label: 'Storage (GB)', type: 'text', default: '20' },
        { key: 'max_allocated_storage', label: 'Max Storage (GB)', type: 'text', default: '100', desc: '0 to disable autoscaling' },
        { key: 'db_name', label: 'Database Name', type: 'text', default: 'appdb' },
        { key: 'username', label: 'Master Username', type: 'text', default: 'admin' },
        { key: 'password', label: 'Master Password', type: 'text', default: 'changeme123!', desc: 'Use variables in production!' },
        { key: 'port', label: 'Port', type: 'text', default: '3306' },
        { key: 'multi_az', label: 'Multi-AZ', type: 'checkbox', default: false },
        { key: 'publicly_accessible', label: 'Publicly Accessible', type: 'checkbox', default: false },
        { key: 'backup_retention', label: 'Backup Retention (days)', type: 'text', default: '7' },
        { key: 'skip_final_snapshot', label: 'Skip Final Snapshot', type: 'checkbox', default: true },
        { key: 'deletion_protection', label: 'Deletion Protection', type: 'checkbox', default: false },
      ],
      generate(cfg) {
        const portMap = { mysql: '3306', postgres: '5432', mariadb: '3306' };
        const port = portMap[cfg.engine] || cfg.port;
        return `resource "aws_db_instance" "main" {
  identifier             = "${cfg.db_name}-instance"
  engine                 = "${cfg.engine}"
  engine_version         = "${cfg.engine_version}"
  instance_class         = "${cfg.instance_class}"
  allocated_storage      = ${cfg.allocated_storage}
  max_allocated_storage  = ${cfg.max_allocated_storage != '0' ? cfg.max_allocated_storage : 'null'}
  db_name                = "${cfg.db_name}"
  username               = "${cfg.username}"
  password               = var.db_password
  port                   = ${port}
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  vpc_security_group_ids = [aws_security_group.main.id]
  multi_az               = ${cfg.multi_az}
  publicly_accessible    = ${cfg.publicly_accessible}
  backup_retention_period = ${cfg.backup_retention}
  skip_final_snapshot    = ${cfg.skip_final_snapshot}
  deletion_protection    = ${cfg.deletion_protection}
  storage_encrypted      = true

  tags = {
    Name = "${cfg.db_name}-instance"
  }
}`;
      },
      variables() {
        return `variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}`;
      },
      outputs(cfg) {
        return `output "rds_endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "Hostname of the RDS instance"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.main.port
}`;
      },
    },

    db_subnet_group: {
      group: 'database',
      label: 'DB Subnet Group',
      fields: [
        { key: 'name', label: 'Subnet Group Name', type: 'text', default: 'main-db-subnet-group' },
        { key: 'description', label: 'Description', type: 'text', default: 'DB subnet group for RDS' },
      ],
      generate(cfg) {
        return `resource "aws_db_subnet_group" "main" {
  name        = "${cfg.name}"
  description = "${cfg.description}"
  subnet_ids  = [aws_subnet.private.id, aws_subnet.public.id]

  tags = {
    Name = "${cfg.name}"
  }
}`;
      },
      outputs(cfg) {
        return `output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}`;
      },
    },

    db_parameter_group: {
      group: 'database',
      label: 'Parameter Group',
      fields: [
        { key: 'name', label: 'Parameter Group Name', type: 'text', default: 'main-db-params' },
        { key: 'family', label: 'Parameter Family', type: 'select', options: ['mysql8.0', 'mysql5.7', 'postgres15', 'postgres14', 'mariadb10.6'], default: 'mysql8.0' },
        { key: 'description', label: 'Description', type: 'text', default: 'Custom DB parameter group' },
        { key: 'charset', label: 'Character Set', type: 'text', default: 'utf8mb4', desc: 'MySQL: utf8mb4, Postgres: UTF8' },
        { key: 'collation', label: 'Collation', type: 'text', default: 'utf8mb4_unicode_ci', desc: 'MySQL: utf8mb4_unicode_ci' },
        { key: 'slow_query_log', label: 'Slow Query Log', type: 'checkbox', default: true },
        { key: 'long_query_time', label: 'Long Query Time (s)', type: 'text', default: '2' },
      ],
      generate(cfg) {
        let params = '';
        if (cfg.charset) {
          params += `
  parameter {
    name  = "character_set_server"
    value = "${cfg.charset}"
  }
  parameter {
    name  = "collation_server"
    value = "${cfg.collation}"
  }`;
        }
        if (cfg.slow_query_log) {
          params += `
  parameter {
    name  = "slow_query_log"
    value = "1"
  }
  parameter {
    name  = "long_query_time"
    value = "${cfg.long_query_time}"
  }`;
        }
        return `resource "aws_db_parameter_group" "main" {
  name   = "${cfg.name}"
  family = "${cfg.family}"

  description = "${cfg.description}"${params}

  tags = {
    Name = "${cfg.name}"
  }
}`;
      },
      outputs(cfg) {
        return `output "db_parameter_group_name" {
  description = "Name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}`;
      },
    },

    // ── Kubernetes (EKS) ────────────────────────────────────────
    eks_cluster: {
      group: 'eks',
      label: 'EKS Cluster',
      fields: [
        { key: 'cluster_name', label: 'Cluster Name', type: 'text', default: 'main-eks', desc: 'Name for the EKS cluster' },
        { key: 'kubernetes_version', label: 'Kubernetes Version', type: 'select', options: ['1.29', '1.28', '1.27', '1.26'], default: '1.29' },
        { key: 'enabled_cluster_log_types', label: 'Log Types', type: 'text', default: 'api,audit,authenticator', desc: 'Comma-separated: api,audit,authenticator,controllerManager,scheduler' },
        { key: 'endpoint_private_access', label: 'Private API Endpoint', type: 'checkbox', default: true },
        { key: 'endpoint_public_access', label: 'Public API Endpoint', type: 'checkbox', default: true },
      ],
      generate(cfg) {
        const logs = cfg.enabled_cluster_log_types.split(',').map(l => `"${l.trim()}"`).filter(Boolean).join(', ');
        return `resource "aws_eks_cluster" "main" {
  name     = "${cfg.cluster_name}"
  version  = "${cfg.kubernetes_version}"
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids              = [aws_subnet.private.id, aws_subnet.public.id]
    endpoint_private_access = ${cfg.endpoint_private_access}
    endpoint_public_access  = ${cfg.endpoint_public_access}
    security_group_ids      = [aws_security_group.main.id]
  }

  enabled_cluster_log_types = [${logs}]

  tags = {
    Name = "${cfg.cluster_name}"
  }
}`;
      },
      outputs(cfg) {
        return `output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Endpoint of the EKS cluster"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_certificate_authority" {
  description = "Certificate authority of the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "eks_cluster_version" {
  description = "Kubernetes version of the EKS cluster"
  value       = aws_eks_cluster.main.version
}`;
      },
    },

    eks_node_group: {
      group: 'eks',
      label: 'Node Group',
      fields: [
        { key: 'node_group_name', label: 'Node Group Name', type: 'text', default: 'main-nodes' },
        { key: 'instance_types', label: 'Instance Types', type: 'text', default: 't3.medium', desc: 'Comma-separated list (first is primary)' },
        { key: 'ami_type', label: 'AMI Type', type: 'select', options: ['AL2_x86_64', 'AL2_x86_64_GPU', 'AL2_ARM_64', 'BOTTLEROCKET_x86_64'], default: 'AL2_x86_64' },
        { key: 'capacity_type', label: 'Capacity Type', type: 'select', options: ['ON_DEMAND', 'SPOT', 'CAPACITY_BLOCK'], default: 'ON_DEMAND' },
        { key: 'min_size', label: 'Min Size', type: 'text', default: '1' },
        { key: 'max_size', label: 'Max Size', type: 'text', default: '4' },
        { key: 'desired_size', label: 'Desired Size', type: 'text', default: '2' },
        { key: 'disk_size', label: 'Disk Size (GB)', type: 'text', default: '20' },
      ],
      generate(cfg) {
        const types = cfg.instance_types.split(',').map(t => `"${t.trim()}"`).filter(Boolean).join(', ');
        return `resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${cfg.node_group_name}"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = [aws_subnet.private.id]
  instance_types  = [${types}]
  ami_type        = "${cfg.ami_type}"
  capacity_type   = "${cfg.capacity_type}"
  disk_size       = ${cfg.disk_size}

  scaling_config {
    min_size     = ${cfg.min_size}
    max_size     = ${cfg.max_size}
    desired_size = ${cfg.desired_size}
  }

  update_config {
    max_unavailable = 1
  }

  tags = {
    Name = "${cfg.node_group_name}"
  }
}`;
      },
      outputs(cfg) {
        return `output "eks_node_group_name" {
  description = "Name of the EKS node group"
  value       = aws_eks_node_group.main.node_group_name
}

output "eks_node_group_status" {
  description = "Status of the EKS node group"
  value       = aws_eks_node_group.main.status
}`;
      },
    },

    // ── IAM ─────────────────────────────────────────────────────
    iam_roles: {
      group: 'iam',
      label: 'IAM Roles',
      fields: [
        { key: 'eks_cluster_role', label: 'EKS Cluster Role Name', type: 'text', default: 'eks-cluster-role' },
        { key: 'eks_node_role', label: 'EKS Node Role Name', type: 'text', default: 'eks-node-role' },
        { key: 'ec2_role', label: 'EC2 Role Name', type: 'text', default: 'ec2-role', desc: 'Leave empty to skip' },
      ],
      generate(cfg) {
        let roles = `
data "aws_iam_policy_document" "eks_cluster_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eks_cluster" {
  name               = "${cfg.eks_cluster_role}"
  assume_role_policy = data.aws_iam_policy_document.eks_cluster_assume_role.json
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

data "aws_iam_policy_document" "eks_node_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eks_node" {
  name               = "${cfg.eks_node_role}"
  assume_role_policy = data.aws_iam_policy_document.eks_node_assume_role.json
}

resource "aws_iam_role_policy_attachment" "eks_node_worker" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_node_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_node_ecr" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node.name
}`;
        if (cfg.ec2_role && cfg.ec2_role.trim()) {
          roles += `

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${cfg.ec2_role}"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  role       = aws_iam_role.ec2.name
}`;
        }
        return roles;
      },
      outputs(cfg) {
        return `output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster role"
  value       = aws_iam_role.eks_cluster.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node role"
  value       = aws_iam_role.eks_node.arn
}`;
      },
    },

    iam_policies: {
      group: 'iam',
      label: 'Policy Attachments',
      fields: [
        { key: 'custom_policy_name', label: 'Custom Policy Name', type: 'text', default: 'custom-app-policy' },
        { key: 'custom_policy_desc', label: 'Policy Description', type: 'text', default: 'Custom policy for application permissions' },
        { key: 's3_access', label: 'S3 Access', type: 'select', options: ['none', 'read', 'readwrite', 'full'], default: 'readwrite' },
        { key: 'dynamodb_access', label: 'DynamoDB Access', type: 'select', options: ['none', 'read', 'readwrite', 'full'], default: 'none' },
        { key: 'sqs_access', label: 'SQS Access', type: 'select', options: ['none', 'read', 'readwrite', 'full'], default: 'none' },
        { key: 'sns_access', label: 'SNS Access', type: 'select', options: ['none', 'publish', 'full'], default: 'none' },
        { key: 'attach_to_role', label: 'Attach to Role', type: 'select', options: ['eks_node', 'ec2', 'eks_cluster'], default: 'eks_node' },
      ],
      generate(cfg) {
        let actions = [];
        if (cfg.s3_access !== 'none') {
          const s3Map = { read: ['s3:GetObject', 's3:ListBucket'], readwrite: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'], full: ['s3:*'] };
          actions.push(...s3Map[cfg.s3_access]);
        }
        if (cfg.dynamodb_access !== 'none') {
          const ddbMap = { read: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'], readwrite: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'], full: ['dynamodb:*'] };
          actions.push(...ddbMap[cfg.dynamodb_access]);
        }
        if (cfg.sqs_access !== 'none') {
          const sqsMap = { read: ['sqs:ReceiveMessage', 'sqs:GetQueueAttributes'], readwrite: ['sqs:ReceiveMessage', 'sqs:SendMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'], full: ['sqs:*'] };
          actions.push(...sqsMap[cfg.sqs_access]);
        }
        if (cfg.sns_access !== 'none') {
          const snsMap = { publish: ['sns:Publish'], full: ['sns:*'] };
          actions.push(...snsMap[cfg.sns_access]);
        }
        const roleMap = { eks_node: 'aws_iam_role.eks_node.name', ec2: 'aws_iam_role.ec2.name', eks_cluster: 'aws_iam_role.eks_cluster.name' };
        const attachRole = roleMap[cfg.attach_to_role] || roleMap.eks_node;
        return `data "aws_iam_policy_document" "custom" {
  statement {
    actions   = [${actions.map(a => `"${a}"`).join(', ')}]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "custom" {
  name        = "${cfg.custom_policy_name}"
  description = "${cfg.custom_policy_desc}"
  policy      = data.aws_iam_policy_document.custom.json
}

resource "aws_iam_role_policy_attachment" "custom" {
  role       = ${attachRole}
  policy_arn = aws_iam_policy.custom.arn
}`;
      },
      outputs(cfg) {
        return `output "custom_policy_arn" {
  description = "ARN of the custom IAM policy"
  value       = aws_iam_policy.custom.arn
}`;
      },
    },

    instance_profile: {
      group: 'iam',
      label: 'Instance Profile',
      fields: [
        { key: 'name', label: 'Instance Profile Name', type: 'text', default: 'ec2-instance-profile' },
        { key: 'role_source', label: 'Role Source', type: 'select', options: ['ec2', 'eks_node'], default: 'ec2', desc: 'Which IAM role to attach' },
      ],
      generate(cfg) {
        const roleRef = cfg.role_source === 'eks_node' ? 'aws_iam_role.eks_node.name' : 'aws_iam_role.ec2.name';
        return `resource "aws_iam_instance_profile" "main" {
  name = "${cfg.name}"
  role = ${roleRef}
}`;
      },
      outputs(cfg) {
        return `output "instance_profile_name" {
  description = "Name of the instance profile"
  value       = aws_iam_instance_profile.main.name
}

output "instance_profile_arn" {
  description = "ARN of the instance profile"
  value       = aws_iam_instance_profile.main.arn
}`;
      },
    },

    oidc: {
      group: 'iam',
      label: 'OIDC Provider',
      fields: [
        { key: 'cluster_name', label: 'EKS Cluster Name', type: 'text', default: 'main-eks', desc: 'Must match cluster name if EKS is selected' },
        { key: 'client_id_list', label: 'Client ID List', type: 'text', default: 'sts.amazonaws.com' },
        { key: 'thumbprint_list', label: 'Thumbprint', type: 'text', default: '9e99a48a9960b14926bb7f3b02e22da2b0ab7280', desc: 'CA thumbprint (use default)' },
      ],
      generate(cfg) {
        return `data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["${cfg.client_id_list}"]
  thumbprint_list = ["${cfg.thumbprint_list}"]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = {
    Name = "${cfg.cluster_name}-oidc"
  }
}`;
      },
      outputs(cfg) {
        return `output "oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider"
  value       = aws_iam_openid_connect_provider.eks.url
}`;
      },
    },
  };

  // ============================================================
  // GROUP METADATA
  // ============================================================
  const GROUPS = {
    vpc: { label: 'VPC & Networking', icon: 'devicon-amazonwebservices-plain', resources: ['vpc', 'subnets', 'igw', 'nat', 'route_tables', 'security_groups'] },
    compute: { label: 'Compute', icon: 'devicon-amazonwebservices-plain', resources: ['ec2', 'launch_template', 'asg', 'key_pair'] },
    storage: { label: 'Storage', icon: 'devicon-amazonwebservices-plain', resources: ['s3', 'ebs', 'efs'] },
    database: { label: 'Database', icon: 'devicon-amazonwebservices-plain', resources: ['rds', 'db_subnet_group', 'db_parameter_group'] },
    eks: { label: 'Kubernetes (EKS)', icon: 'devicon-kubernetes-plain', resources: ['eks_cluster', 'eks_node_group'] },
    iam: { label: 'IAM', icon: 'devicon-amazonwebservices-plain', resources: ['iam_roles', 'iam_policies', 'instance_profile', 'oidc'] },
  };

  // ============================================================
  // STATE
  // ============================================================
  const configValues = {};
  const selectedResources = new Set();
  let generatedFiles = {};

  // ============================================================
  // DOM REFERENCES
  // ============================================================
  const els = {};
  function cacheDom() {
    els.resourceCheckboxes = document.querySelectorAll('.resource-checkbox');
    els.groupCheckboxes = document.querySelectorAll('.group-checkbox');
    els.selectAllBtn = document.getElementById('select-all-btn');
    els.selectedCount = document.getElementById('selected-count');
    els.totalCount = document.getElementById('total-count');
    els.configSections = document.getElementById('config-sections');
    els.configPlaceholder = document.getElementById('config-placeholder');
    els.outputOptions = document.getElementById('output-options');
    els.generateActions = document.getElementById('generate-actions');
    els.generateBtn = document.getElementById('generate-btn');
    els.previewBtn = document.getElementById('preview-btn');
    els.modalOverlay = document.getElementById('modal-overlay');
    els.modalClose = document.getElementById('modal-close');
    els.modalTabs = document.getElementById('modal-tabs');
    els.modalTabPanels = document.getElementById('modal-tab-panels');
    els.modalEmpty = document.getElementById('modal-empty');
    els.modalContent = document.getElementById('modal-content');
    els.modalStats = document.getElementById('modal-stats');
    els.copyAllBtn = document.getElementById('copy-all-btn');
    els.downloadZipBtn = document.getElementById('download-zip-btn');
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    initDefaultConfigValues();
    bindEvents();
    updateSelectionUI();
  });

  function initDefaultConfigValues() {
    for (const [key, def] of Object.entries(RESOURCE_DEFS)) {
      configValues[key] = {};
      for (const f of def.fields) {
        configValues[key][f.key] = f.default;
      }
    }
  }

  // ============================================================
  // EVENT BINDING
  // ============================================================
  function bindEvents() {
    els.selectAllBtn.addEventListener('click', toggleSelectAll);

    els.groupCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const group = e.target.dataset.group;
        const checked = e.target.checked;
        GROUPS[group].resources.forEach(r => {
          const checkbox = document.querySelector(`.resource-checkbox[value="${r}"]`);
          if (checkbox) checkbox.checked = checked;
        });
        syncSelection();
      });
    });

    els.resourceCheckboxes.forEach(cb => {
      cb.addEventListener('change', syncSelection);
    });

    els.generateBtn.addEventListener('click', handleGenerate);
    els.previewBtn.addEventListener('click', handlePreview);
    els.modalClose.addEventListener('click', closeModal);
    els.modalOverlay.addEventListener('click', (e) => {
      if (e.target === els.modalOverlay) closeModal();
    });
    els.copyAllBtn.addEventListener('click', handleCopyAll);
    els.downloadZipBtn.addEventListener('click', handleDownloadZip);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ============================================================
  // SELECTION LOGIC
  // ============================================================
  function toggleSelectAll() {
    const allChecked = selectedResources.size === Object.keys(RESOURCE_DEFS).length;
    els.resourceCheckboxes.forEach(cb => {
      cb.checked = !allChecked;
    });
    els.groupCheckboxes.forEach(cb => {
      cb.checked = !allChecked;
      cb.indeterminate = false;
    });
    syncSelection();
  }

  function syncSelection() {
    selectedResources.clear();
    els.resourceCheckboxes.forEach(cb => {
      if (cb.checked) selectedResources.add(cb.value);
    });
    updateGroupCheckboxes();
    updateSelectionUI();
    renderConfigSections();
  }

  function updateGroupCheckboxes() {
    els.groupCheckboxes.forEach(cb => {
      const group = cb.dataset.group;
      const resources = GROUPS[group].resources;
      const checkedCount = resources.filter(r => {
        const el = document.querySelector(`.resource-checkbox[value="${r}"]`);
        return el && el.checked;
      }).length;
      cb.checked = checkedCount === resources.length;
      cb.indeterminate = checkedCount > 0 && checkedCount < resources.length;
    });
  }

  function updateSelectionUI() {
    els.selectedCount.textContent = selectedResources.size;
    const show = selectedResources.size > 0;
    els.configPlaceholder.style.display = show ? 'none' : '';
    els.outputOptions.style.display = show ? 'flex' : 'none';
    els.generateActions.style.display = show ? 'flex' : 'none';
  }

  // ============================================================
  // CONFIG FORM RENDERING
  // ============================================================
  function renderConfigSections() {
    const container = els.configSections;
    const existingPlaceholder = els.configPlaceholder;
    container.innerHTML = '';
    container.appendChild(existingPlaceholder);

    const groupsWithSelections = {};
    for (const resKey of selectedResources) {
      const def = RESOURCE_DEFS[resKey];
      if (!def) continue;
      if (!groupsWithSelections[def.group]) groupsWithSelections[def.group] = [];
      groupsWithSelections[def.group].push(resKey);
    }

    for (const [groupId, resources] of Object.entries(groupsWithSelections)) {
      const groupMeta = GROUPS[groupId];
      const section = document.createElement('div');
      section.className = 'config-section';
      section.innerHTML = `
        <div class="config-section-header">
          <h3><i class="${groupMeta.icon}"></i> ${groupMeta.label}</h3>
          <span class="section-resource-count">${resources.length} resource${resources.length > 1 ? 's' : ''}</span>
        </div>
      `;

      const grid = document.createElement('div');
      grid.className = 'config-grid';

      for (const resKey of resources) {
        const def = RESOURCE_DEFS[resKey];
        const resHeader = document.createElement('div');
        resHeader.className = 'config-resource-header';
        resHeader.innerHTML = `<h4>${def.label}</h4>`;
        grid.appendChild(resHeader);

        for (const field of def.fields) {
          const fieldEl = createField(resKey, field);
          grid.appendChild(fieldEl);
        }
      }

      section.appendChild(grid);
      container.appendChild(section);
    }
  }

  function createField(resourceKey, field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'config-field';

    const label = document.createElement('label');
    label.textContent = field.label;
    wrapper.appendChild(label);

    if (field.type === 'text' || field.type === 'textarea') {
      const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
      input.type = 'text';
      input.value = configValues[resourceKey][field.key] || '';
      if (field.type === 'textarea') {
        input.rows = 3;
        input.style.fontFamily = 'monospace';
        input.style.fontSize = '0.8rem';
      }
      input.addEventListener('input', () => {
        configValues[resourceKey][field.key] = input.value;
      });
      wrapper.appendChild(input);
    } else if (field.type === 'checkbox') {
      const checkWrapper = document.createElement('div');
      checkWrapper.className = 'config-field-checkbox';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = configValues[resourceKey][field.key];
      const checkLabel = document.createElement('span');
      checkLabel.textContent = configValues[resourceKey][field.key] ? 'Enabled' : 'Disabled';
      input.addEventListener('change', () => {
        configValues[resourceKey][field.key] = input.checked;
        checkLabel.textContent = input.checked ? 'Enabled' : 'Disabled';
      });
      checkWrapper.appendChild(input);
      checkWrapper.appendChild(checkLabel);
      wrapper.appendChild(checkWrapper);
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      for (const opt of field.options) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === configValues[resourceKey][field.key]) option.selected = true;
        select.appendChild(option);
      }
      select.addEventListener('change', () => {
        configValues[resourceKey][field.key] = select.value;
      });
      wrapper.appendChild(select);
    }

    if (field.desc) {
      const small = document.createElement('small');
      small.textContent = field.desc;
      wrapper.appendChild(small);
    }

    return wrapper;
  }

  // ============================================================
  // TERRAFORM CODE GENERATION
  // ============================================================
  function handleGenerate() {
    const mode = document.querySelector('input[name="output-mode"]:checked').value;
    if (mode === 'modular') {
      generatedFiles = generateModular();
    } else {
      generatedFiles = generateSingle();
    }
    showToast(`Generated ${Object.keys(generatedFiles).length} files successfully!`);
  }

  function generateSingle() {
    const files = {};
    files['provider.tf'] = generateProvider();
    files['backend.tf'] = generateBackend();
    files['variables.tf'] = generateVariables();
    files['outputs.tf'] = generateOutputs();
    files['main.tf'] = generateMainTf();
    return files;
  }

  function generateModular() {
    const files = {};
    files['provider.tf'] = generateProvider();
    files['backend.tf'] = generateBackend();
    files['variables.tf'] = generateRootVariables();
    files['outputs.tf'] = generateRootOutputs();
    files['main.tf'] = generateRootMainTf();

    const groupModules = {};
    for (const resKey of selectedResources) {
      const def = RESOURCE_DEFS[resKey];
      if (!groupModules[def.group]) groupModules[def.group] = [];
      groupModules[def.group].push(resKey);
    }

    for (const [groupId, resources] of Object.entries(groupModules)) {
      const prefix = `modules/${groupId}/`;
      files[prefix + 'main.tf'] = generateModuleMain(groupId, resources);
      files[prefix + 'variables.tf'] = generateModuleVariables(groupId, resources);
      files[prefix + 'outputs.tf'] = generateModuleOutputs(groupId, resources);
    }

    return files;
  }

  function generateProvider() {
    return `terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`;
  }

  function generateBackend() {
    return `provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}`;
  }

  function generateVariables() {
    let vars = [];
    vars.push(`variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-east-1"
}`);

    vars.push(`variable "project_name" {
  description = "Project name used as prefix for resource naming"
  type        = string
  default     = "myproject"
}`);

    vars.push(`variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}`);

    for (const resKey of selectedResources) {
      const def = RESOURCE_DEFS[resKey];
      if (def.variables) {
        vars.push(def.variables());
      }
    }

    return vars.join('\n\n');
  }

  function generateOutputs() {
    let outs = [];
    for (const resKey of selectedResources) {
      const def = RESOURCE_DEFS[resKey];
      if (def.outputs) {
        outs.push(def.outputs(configValues[resKey]));
      }
    }
    return outs.join('\n\n');
  }

  function generateMainTf() {
    let parts = [];
    for (const resKey of selectedResources) {
      const def = RESOURCE_DEFS[resKey];
      parts.push(def.generate(configValues[resKey]));
    }
    return parts.join('\n\n');
  }

  function generateRootVariables() {
    return `variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used as prefix for resource naming"
  type        = string
  default     = "myproject"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}`;
  }

  function generateRootOutputs() {
    let outs = [];
    outs.push(`output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}`);

    for (const resKey of selectedResources) {
      const def = RESOURCE_DEFS[resKey];
      if (def.outputs) {
        outs.push(def.outputs(configValues[resKey]));
      }
    }
    return outs.join('\n\n');
  }

  function generateRootMainTf() {
    const groupModules = {};
    for (const resKey of selectedResources) {
      const def = RESOURCE_DEFS[resKey];
      if (!groupModules[def.group]) groupModules[def.group] = [];
      groupModules[def.group].push(resKey);
    }

    let parts = [];
    for (const groupId of Object.keys(groupModules)) {
      parts.push(`module "${groupId}" {
  source = "./modules/${groupId}"

  project_name = var.project_name
  environment  = var.environment
}`);
    }
    return parts.join('\n\n');
  }

  function generateModuleMain(groupId, resources) {
    let parts = [];
    for (const resKey of resources) {
      const def = RESOURCE_DEFS[resKey];
      parts.push(def.generate(configValues[resKey]));
    }
    return parts.join('\n\n');
  }

  function generateModuleVariables(groupId, resources) {
    let vars = [];
    vars.push(`variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}`);

    for (const resKey of resources) {
      const def = RESOURCE_DEFS[resKey];
      if (def.variables) {
        vars.push(def.variables());
      }
    }

    return vars.join('\n\n');
  }

  function generateModuleOutputs(groupId, resources) {
    let outs = [];
    for (const resKey of resources) {
      const def = RESOURCE_DEFS[resKey];
      if (def.outputs) {
        outs.push(def.outputs(configValues[resKey]));
      }
    }
    return outs.join('\n\n');
  }

  // ============================================================
  // PREVIEW MODAL
  // ============================================================
  function handlePreview() {
    handleGenerate();
    openModal();
  }

  function openModal() {
    if (Object.keys(generatedFiles).length === 0) return;
    els.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderModalTabs();
  }

  function closeModal() {
    els.modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderModalTabs() {
    const fileNames = Object.keys(generatedFiles);
    els.modalTabs.innerHTML = '';
    els.modalTabPanels.innerHTML = '';
    els.modalEmpty.style.display = 'none';
    els.modalTabPanels.style.display = 'block';

    fileNames.forEach((name, i) => {
      const tab = document.createElement('button');
      tab.className = 'modal-tab' + (i === 0 ? ' active' : '');
      tab.role = 'tab';
      tab.textContent = name;
      tab.addEventListener('click', () => switchTab(i));
      els.modalTabs.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'modal-tab-panel' + (i === 0 ? ' active' : '');
      panel.innerHTML = `<pre><code>${escapeHtml(generatedFiles[name])}</code></pre>`;
      els.modalTabPanels.appendChild(panel);
    });

    const totalSize = new Blob(Object.values(generatedFiles)).size;
    const sizeKB = (totalSize / 1024).toFixed(1);
    els.modalStats.textContent = `${fileNames.length} files | ${sizeKB} KB`;
  }

  function switchTab(index) {
    els.modalTabs.querySelectorAll('.modal-tab').forEach((t, i) => {
      t.classList.toggle('active', i === index);
    });
    els.modalTabPanels.querySelectorAll('.modal-tab-panel').forEach((p, i) => {
      p.classList.toggle('active', i === index);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(message) {
    const existing = document.querySelector('.tf-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'tf-toast';
    toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ============================================================
  // COPY & DOWNLOAD
  // ============================================================
  function handleCopyAll() {
    const allContent = Object.entries(generatedFiles)
      .map(([name, content]) => `# ============================================\n# File: ${name}\n# ============================================\n\n${content}`)
      .join('\n\n\n');
    navigator.clipboard.writeText(allContent).then(() => {
      els.copyAllBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        els.copyAllBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy All';
      }, 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = allContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      els.copyAllBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        els.copyAllBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy All';
      }, 2000);
    });
  }

  function handleDownloadZip() {
    if (Object.keys(generatedFiles).length === 0) {
      handleGenerate();
    }
    const zip = new JSZip();
    for (const [name, content] of Object.entries(generatedFiles)) {
      zip.file(name, content);
    }
    zip.generateAsync({ type: 'blob' }).then(blob => {
      saveAs(blob, 'terraform-aws-infrastructure.zip');
    });
  }
})();
