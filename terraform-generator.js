(() => {
  'use strict';

  // ============================================================
  // PROVIDER DEFINITIONS
  // ============================================================
  const PROVIDERS = {
    aws: {
      label: 'Amazon Web Services',
      shortLabel: 'AWS',
      icon: 'devicon-amazonwebservices-plain',
      regionVar: { name: 'aws_region', default: 'us-east-1', label: 'AWS Region' },
      providerBlock: (region) => `terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}`,
      providerConfig: (regionVar) => `provider "aws" {
  region = var.${regionVar}

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}`,
      groups: {
        vpc:      { label: 'VPC & Networking', icon: 'devicon-amazonwebservices-plain', resources: ['vpc','subnets','igw','nat','route_tables','security_groups'] },
        compute:  { label: 'Compute', icon: 'devicon-amazonwebservices-plain', resources: ['ec2','launch_template','asg','key_pair'] },
        storage:  { label: 'Storage', icon: 'devicon-amazonwebservices-plain', resources: ['s3','ebs','efs'] },
        database: { label: 'Database', icon: 'devicon-amazonwebservices-plain', resources: ['rds','db_subnet_group','db_parameter_group'] },
        eks:      { label: 'Kubernetes (EKS)', icon: 'devicon-kubernetes-plain', resources: ['eks_cluster','eks_node_group'] },
        iam:      { label: 'IAM', icon: 'devicon-amazonwebservices-plain', resources: ['iam_roles','iam_policies','instance_profile','oidc'] },
      },
      resources: {
        vpc: {
          group:'vpc', label:'VPC',
          fields:[
            {key:'cidr_block',label:'CIDR Block',type:'text',default:'10.0.0.0/16',desc:'IP range for the VPC'},
            {key:'enable_dns_support',label:'DNS Support',type:'checkbox',default:true},
            {key:'enable_dns_hostnames',label:'DNS Hostnames',type:'checkbox',default:true},
            {key:'instance_tenancy',label:'Instance Tenancy',type:'select',options:['default','dedicated','host'],default:'default'},
            {key:'tags',label:'Name Tag',type:'text',default:'main-vpc'},
          ],
          generate(cfg){return `resource "aws_vpc" "main" {\n  cidr_block           = "${cfg.cidr_block}"\n  enable_dns_support   = ${cfg.enable_dns_support}\n  enable_dns_hostnames = ${cfg.enable_dns_hostnames}\n  instance_tenancy     = "${cfg.instance_tenancy}"\n\n  tags = {\n    Name = "${cfg.tags}"\n  }\n}`},
          outputs(){return `output "vpc_id" {\n  description = "ID of the VPC"\n  value       = aws_vpc.main.id\n}\n\noutput "vpc_cidr_block" {\n  description = "CIDR block of the VPC"\n  value       = aws_vpc.main.cidr_block\n}`}
        },
        subnets: {
          group:'vpc', label:'Subnets',
          fields:[
            {key:'public_subnet_cidr',label:'Public Subnet CIDR',type:'text',default:'10.0.1.0/24'},
            {key:'private_subnet_cidr',label:'Private Subnet CIDR',type:'text',default:'10.0.2.0/24'},
            {key:'availability_zone',label:'Availability Zone',type:'text',default:'us-east-1a'},
            {key:'public_subnet_name',label:'Public Subnet Name',type:'text',default:'public-subnet'},
            {key:'private_subnet_name',label:'Private Subnet Name',type:'text',default:'private-subnet'},
          ],
          generate(cfg){return `resource "aws_subnet" "public" {\n  vpc_id                  = aws_vpc.main.id\n  cidr_block              = "${cfg.public_subnet_cidr}"\n  availability_zone       = "${cfg.availability_zone}"\n  map_public_ip_on_launch = true\n\n  tags = {\n    Name = "${cfg.public_subnet_name}"\n    Tier = "public"\n  }\n}\n\nresource "aws_subnet" "private" {\n  vpc_id            = aws_vpc.main.id\n  cidr_block        = "${cfg.private_subnet_cidr}"\n  availability_zone = "${cfg.availability_zone}"\n\n  tags = {\n    Name = "${cfg.private_subnet_name}"\n    Tier = "private"\n  }\n}`},
          outputs(){return `output "public_subnet_id" {\n  value = aws_subnet.public.id\n}\n\noutput "private_subnet_id" {\n  value = aws_subnet.private.id\n}`}
        },
        igw: {
          group:'vpc', label:'Internet Gateway',
          fields:[{key:'tags',label:'Name Tag',type:'text',default:'main-igw'}],
          generate(cfg){return `resource "aws_internet_gateway" "main" {\n  vpc_id = aws_vpc.main.id\n\n  tags = {\n    Name = "${cfg.tags}"\n  }\n}`},
          outputs(){return `output "igw_id" {\n  value = aws_internet_gateway.main.id\n}`}
        },
        nat: {
          group:'vpc', label:'NAT Gateway',
          fields:[{key:'tags',label:'Name Tag',type:'text',default:'main-nat'}],
          generate(cfg){return `resource "aws_eip" "nat" {\n  domain = "vpc"\n\n  tags = {\n    Name = "${cfg.tags}-eip"\n  }\n}\n\nresource "aws_nat_gateway" "main" {\n  allocation_id = aws_eip.nat.id\n  subnet_id     = aws_subnet.public.id\n\n  tags = {\n    Name = "${cfg.tags}"\n  }\n\n  depends_on = [aws_internet_gateway.main]\n}`},
          outputs(){return `output "nat_gateway_id" {\n  value = aws_nat_gateway.main.id\n}\n\noutput "nat_eip" {\n  value = aws_eip.nat.public_ip\n}`}
        },
        route_tables: {
          group:'vpc', label:'Route Tables',
          fields:[
            {key:'public_rt_name',label:'Public RT Name',type:'text',default:'public-rt'},
            {key:'private_rt_name',label:'Private RT Name',type:'text',default:'private-rt'},
          ],
          generate(cfg){return `resource "aws_route_table" "public" {\n  vpc_id = aws_vpc.main.id\n\n  route {\n    cidr_block = "0.0.0.0/0"\n    gateway_id = aws_internet_gateway.main.id\n  }\n\n  tags = {\n    Name = "${cfg.public_rt_name}"\n  }\n}\n\nresource "aws_route_table" "private" {\n  vpc_id = aws_vpc.main.id\n\n  route {\n    cidr_block     = "0.0.0.0/0"\n    nat_gateway_id = aws_nat_gateway.main.id\n  }\n\n  tags = {\n    Name = "${cfg.private_rt_name}"\n  }\n}\n\nresource "aws_route_table_association" "public" {\n  subnet_id      = aws_subnet.public.id\n  route_table_id = aws_route_table.public.id\n}\n\nresource "aws_route_table_association" "private" {\n  subnet_id      = aws_subnet.private.id\n  route_table_id = aws_route_table.private.id\n}`},
          outputs(){return `output "public_route_table_id" {\n  value = aws_route_table.public.id\n}\n\noutput "private_route_table_id" {\n  value = aws_route_table.private.id\n}`}
        },
        security_groups: {
          group:'vpc', label:'Security Groups',
          fields:[
            {key:'name',label:'SG Name',type:'text',default:'main-sg'},
            {key:'ssh_cidr',label:'SSH CIDR',type:'text',default:'0.0.0.0/0'},
            {key:'http_cidr',label:'HTTP/HTTPS CIDR',type:'text',default:'0.0.0.0/0'},
            {key:'enable_ssh',label:'Enable SSH',type:'checkbox',default:true},
            {key:'enable_http',label:'Enable HTTP',type:'checkbox',default:true},
            {key:'enable_https',label:'Enable HTTPS',type:'checkbox',default:true},
          ],
          generate(cfg){
            let ing='';
            if(cfg.enable_ssh)ing+=`\n  ingress {\n    description = "SSH"\n    from_port   = 22\n    to_port     = 22\n    protocol    = "tcp"\n    cidr_blocks = ["${cfg.ssh_cidr}"]\n  }`;
            if(cfg.enable_http)ing+=`\n  ingress {\n    description = "HTTP"\n    from_port   = 80\n    to_port     = 80\n    protocol    = "tcp"\n    cidr_blocks = ["${cfg.http_cidr}"]\n  }`;
            if(cfg.enable_https)ing+=`\n  ingress {\n    description = "HTTPS"\n    from_port   = 443\n    to_port     = 443\n    protocol    = "tcp"\n    cidr_blocks = ["${cfg.http_cidr}"]\n  }`;
            return `resource "aws_security_group" "main" {\n  name        = "${cfg.name}"\n  description = "Managed security group"\n  vpc_id      = aws_vpc.main.id${ing}\n\n  egress {\n    from_port   = 0\n    to_port     = 0\n    protocol    = "-1"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n\n  tags = {\n    Name = "${cfg.name}"\n  }\n}`
          },
          outputs(){return `output "security_group_id" {\n  value = aws_security_group.main.id\n}`}
        },
        ec2: {
          group:'compute', label:'EC2 Instances',
          fields:[
            {key:'instance_type',label:'Instance Type',type:'select',options:['t2.micro','t2.small','t2.medium','t3.micro','t3.small','t3.medium','t3.large','m5.large'],default:'t2.micro'},
            {key:'ami_id',label:'AMI ID',type:'text',default:'ami-0c55b159cbfafe1f0',desc:'Amazon Linux 2 (us-east-1)'},
            {key:'key_name',label:'Key Pair',type:'text',default:'my-key'},
            {key:'instance_count',label:'Count',type:'text',default:'1'},
            {key:'subnet_source',label:'Subnet',type:'select',options:['public','private'],default:'public'},
            {key:'tags',label:'Name Tag',type:'text',default:'web-server'},
          ],
          generate(cfg){
            const sub=cfg.subnet_source==='private'?'aws_subnet.private.id':'aws_subnet.public.id';
            return `resource "aws_instance" "main" {\n  count         = ${cfg.instance_count}\n  ami           = "${cfg.ami_id}"\n  instance_type = "${cfg.instance_type}"\n  key_name      = "${cfg.key_name}"\n  subnet_id     = ${sub}\n  vpc_security_group_ids = [aws_security_group.main.id]\n\n  tags = {\n    Name = "\${var.project_name}-${cfg.tags}-\${count.index + 1}"\n  }\n}`
          },
          outputs(){return `output "ec2_instance_ids" {\n  value = aws_instance.main[*].id\n}\n\noutput "ec2_public_ips" {\n  value = aws_instance.main[*].public_ip\n}`}
        },
        launch_template: {
          group:'compute', label:'Launch Template',
          fields:[
            {key:'name_prefix',label:'Name Prefix',type:'text',default:'web-'},
            {key:'instance_type',label:'Instance Type',type:'select',options:['t2.micro','t2.small','t2.medium','t3.micro','t3.small','t3.medium'],default:'t2.small'},
            {key:'ami_id',label:'AMI ID',type:'text',default:'ami-0c55b159cbfafe1f0'},
            {key:'key_name',label:'Key Pair',type:'text',default:'my-key'},
            {key:'associate_public_ip',label:'Public IP',type:'checkbox',default:true},
          ],
          generate(cfg){return `resource "aws_launch_template" "main" {\n  name_prefix   = "${cfg.name_prefix}"\n  image_id      = "${cfg.ami_id}"\n  instance_type = "${cfg.instance_type}"\n  key_name      = "${cfg.key_name}"\n\n  vpc_security_group_ids = [aws_security_group.main.id]\n  associate_public_ip_address = ${cfg.associate_public_ip}\n\n  tag_specifications {\n    resource_type = "instance"\n    tags = {\n      Name = "${cfg.name_prefix}instance"\n    }\n  }\n}`},
          outputs(){return `output "launch_template_id" {\n  value = aws_launch_template.main.id\n}`}
        },
        asg: {
          group:'compute', label:'Auto Scaling Group',
          fields:[
            {key:'name',label:'ASG Name',type:'text',default:'web-asg'},
            {key:'min_size',label:'Min Size',type:'text',default:'1'},
            {key:'max_size',label:'Max Size',type:'text',default:'4'},
            {key:'desired_capacity',label:'Desired',type:'text',default:'2'},
            {key:'health_check_type',label:'Health Check',type:'select',options:['EC2','ELB'],default:'EC2'},
          ],
          generate(cfg){return `resource "aws_autoscaling_group" "main" {\n  name                = "${cfg.name}"\n  min_size            = ${cfg.min_size}\n  max_size            = ${cfg.max_size}\n  desired_capacity    = ${cfg.desired_capacity}\n  vpc_zone_identifier = [aws_subnet.private.id]\n  health_check_type   = "${cfg.health_check_type}"\n\n  launch_template {\n    id      = aws_launch_template.main.id\n    version = "\$Latest"\n  }\n\n  tag {\n    key                 = "Name"\n    value               = "${cfg.name}"\n    propagate_at_launch = true\n  }\n}`},
          outputs(){return `output "asg_name" {\n  value = aws_autoscaling_group.main.name\n}`}
        },
        key_pair: {
          group:'compute', label:'Key Pair',
          fields:[
            {key:'key_name',label:'Key Name',type:'text',default:'my-key'},
            {key:'public_key',label:'Public Key',type:'textarea',default:'ssh-rsa AAAA...'},
          ],
          generate(cfg){return `resource "aws_key_pair" "main" {\n  key_name   = "${cfg.key_name}"\n  public_key = "${cfg.public_key}"\n}`},
          outputs(){return `output "key_pair_name" {\n  value = aws_key_pair.main.key_name\n}`}
        },
        s3: {
          group:'storage', label:'S3 Buckets',
          fields:[
            {key:'bucket_name',label:'Bucket Name',type:'text',default:'my-app-bucket'},
            {key:'enable_versioning',label:'Versioning',type:'checkbox',default:true},
            {key:'enable_encryption',label:'Encryption',type:'checkbox',default:true},
            {key:'force_destroy',label:'Force Destroy',type:'checkbox',default:false},
            {key:'block_public_access',label:'Block Public Access',type:'checkbox',default:true},
          ],
          generate(cfg){
            let b='';
            if(cfg.enable_versioning)b+=`\n  versioning {\n    enabled = true\n  }`;
            if(cfg.enable_encryption)b+=`\n  server_side_encryption_configuration {\n    rule {\n      apply_server_side_encryption_by_default {\n        sse_algorithm = "AES256"\n      }\n    }\n  }`;
            if(cfg.block_public_access)b+=`\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true`;
            return `resource "aws_s3_bucket" "main" {\n  bucket        = "${cfg.bucket_name}"\n  force_destroy = ${cfg.force_destroy}${b}\n\n  tags = {\n    Name = "${cfg.bucket_name}"\n  }\n}`
          },
          outputs(){return `output "s3_bucket_id" {\n  value = aws_s3_bucket.main.id\n}\n\noutput "s3_bucket_arn" {\n  value = aws_s3_bucket.main.arn\n}`}
        },
        ebs: {
          group:'storage', label:'EBS Volumes',
          fields:[
            {key:'size',label:'Size (GB)',type:'text',default:'20'},
            {key:'type',label:'Type',type:'select',options:['gp2','gp3','io1','io2','st1','sc1'],default:'gp3'},
            {key:'availability_zone',label:'AZ',type:'text',default:'us-east-1a'},
            {key:'encrypted',label:'Encrypted',type:'checkbox',default:true},
            {key:'tags',label:'Name Tag',type:'text',default:'data-volume'},
          ],
          generate(cfg){return `resource "aws_ebs_volume" "main" {\n  size              = ${cfg.size}\n  type              = "${cfg.type}"\n  availability_zone = "${cfg.availability_zone}"\n  encrypted         = ${cfg.encrypted}\n\n  tags = {\n    Name = "${cfg.tags}"\n  }\n}`},
          outputs(){return `output "ebs_volume_id" {\n  value = aws_ebs_volume.main.id\n}`}
        },
        efs: {
          group:'storage', label:'EFS',
          fields:[
            {key:'name',label:'Name',type:'text',default:'shared-efs'},
            {key:'performance_mode',label:'Performance',type:'select',options:['generalPurpose','maxIO'],default:'generalPurpose'},
            {key:'throughput_mode',label:'Throughput',type:'select',options:['bursting','provisioned','elastic'],default:'bursting'},
            {key:'encrypted',label:'Encrypted',type:'checkbox',default:true},
          ],
          generate(cfg){return `resource "aws_efs_file_system" "main" {\n  creation_token   = "${cfg.name}"\n  performance_mode = "${cfg.performance_mode}"\n  throughput_mode  = "${cfg.throughput_mode}"\n  encrypted        = ${cfg.encrypted}\n\n  tags = {\n    Name = "${cfg.name}"\n  }\n}\n\nresource "aws_efs_mount_target" "main" {\n  file_system_id  = aws_efs_file_system.main.id\n  subnet_id       = aws_subnet.private.id\n  security_groups = [aws_security_group.main.id]\n}`},
          outputs(){return `output "efs_id" {\n  value = aws_efs_file_system.main.id\n}\n\noutput "efs_dns_name" {\n  value = aws_efs_file_system.main.dns_name\n}`}
        },
        rds: {
          group:'database', label:'RDS Instance',
          fields:[
            {key:'engine',label:'Engine',type:'select',options:['mysql','postgres','mariadb'],default:'mysql'},
            {key:'engine_version',label:'Version',type:'text',default:'8.0'},
            {key:'instance_class',label:'Class',type:'select',options:['db.t3.micro','db.t3.small','db.t3.medium','db.r5.large'],default:'db.t3.micro'},
            {key:'allocated_storage',label:'Storage (GB)',type:'text',default:'20'},
            {key:'db_name',label:'DB Name',type:'text',default:'appdb'},
            {key:'username',label:'Username',type:'text',default:'admin'},
            {key:'password',label:'Password',type:'text',default:'changeme123!'},
            {key:'multi_az',label:'Multi-AZ',type:'checkbox',default:false},
            {key:'publicly_accessible',label:'Public Access',type:'checkbox',default:false},
            {key:'skip_final_snapshot',label:'Skip Final Snapshot',type:'checkbox',default:true},
          ],
          generate(cfg){return `resource "aws_db_instance" "main" {\n  identifier             = "${cfg.db_name}-instance"\n  engine                 = "${cfg.engine}"\n  engine_version         = "${cfg.engine_version}"\n  instance_class         = "${cfg.instance_class}"\n  allocated_storage      = ${cfg.allocated_storage}\n  db_name                = "${cfg.db_name}"\n  username               = "${cfg.username}"\n  password               = var.db_password\n  db_subnet_group_name   = aws_db_subnet_group.main.name\n  parameter_group_name   = aws_db_parameter_group.main.name\n  vpc_security_group_ids = [aws_security_group.main.id]\n  multi_az               = ${cfg.multi_az}\n  publicly_accessible    = ${cfg.publicly_accessible}\n  skip_final_snapshot    = ${cfg.skip_final_snapshot}\n  storage_encrypted      = true\n\n  tags = {\n    Name = "${cfg.db_name}-instance"\n  }\n}`},
          variables(){return `variable "db_password" {\n  description = "Master password for RDS"\n  type        = string\n  sensitive   = true\n}`},
          outputs(){return `output "rds_endpoint" {\n  value = aws_db_instance.main.endpoint\n}\n\noutput "rds_address" {\n  value = aws_db_instance.main.address\n}`}
        },
        db_subnet_group: {
          group:'database', label:'DB Subnet Group',
          fields:[
            {key:'name',label:'Name',type:'text',default:'main-db-subnet-group'},
            {key:'description',label:'Description',type:'text',default:'DB subnet group'},
          ],
          generate(cfg){return `resource "aws_db_subnet_group" "main" {\n  name        = "${cfg.name}"\n  description = "${cfg.description}"\n  subnet_ids  = [aws_subnet.private.id, aws_subnet.public.id]\n\n  tags = {\n    Name = "${cfg.name}"\n  }\n}`},
          outputs(){return `output "db_subnet_group_name" {\n  value = aws_db_subnet_group.main.name\n}`}
        },
        db_parameter_group: {
          group:'database', label:'Parameter Group',
          fields:[
            {key:'name',label:'Name',type:'text',default:'main-db-params'},
            {key:'family',label:'Family',type:'select',options:['mysql8.0','mysql5.7','postgres15','postgres14'],default:'mysql8.0'},
            {key:'charset',label:'Charset',type:'text',default:'utf8mb4'},
            {key:'slow_query_log',label:'Slow Query Log',type:'checkbox',default:true},
          ],
          generate(cfg){
            let p='';
            if(cfg.charset)p+=`\n  parameter {\n    name  = "character_set_server"\n    value = "${cfg.charset}"\n  }`;
            if(cfg.slow_query_log)p+=`\n  parameter {\n    name  = "slow_query_log"\n    value = "1"\n  }`;
            return `resource "aws_db_parameter_group" "main" {\n  name   = "${cfg.name}"\n  family = "${cfg.family}"${p}\n\n  tags = {\n    Name = "${cfg.name}"\n  }\n}`
          },
          outputs(){return `output "db_parameter_group_name" {\n  value = aws_db_parameter_group.main.name\n}`}
        },
        eks_cluster: {
          group:'eks', label:'EKS Cluster',
          fields:[
            {key:'cluster_name',label:'Cluster Name',type:'text',default:'main-eks'},
            {key:'kubernetes_version',label:'K8s Version',type:'select',options:['1.29','1.28','1.27'],default:'1.29'},
            {key:'endpoint_private_access',label:'Private Endpoint',type:'checkbox',default:true},
            {key:'endpoint_public_access',label:'Public Endpoint',type:'checkbox',default:true},
          ],
          generate(cfg){return `resource "aws_eks_cluster" "main" {\n  name     = "${cfg.cluster_name}"\n  version  = "${cfg.kubernetes_version}"\n  role_arn = aws_iam_role.eks_cluster.arn\n\n  vpc_config {\n    subnet_ids              = [aws_subnet.private.id, aws_subnet.public.id]\n    endpoint_private_access = ${cfg.endpoint_private_access}\n    endpoint_public_access  = ${cfg.endpoint_public_access}\n    security_group_ids      = [aws_security_group.main.id]\n  }\n\n  tags = {\n    Name = "${cfg.cluster_name}"\n  }\n}`},
          outputs(){return `output "eks_cluster_name" {\n  value = aws_eks_cluster.main.name\n}\n\noutput "eks_cluster_endpoint" {\n  value = aws_eks_cluster.main.endpoint\n}`}
        },
        eks_node_group: {
          group:'eks', label:'Node Group',
          fields:[
            {key:'node_group_name',label:'Name',type:'text',default:'main-nodes'},
            {key:'instance_types',label:'Instance Types',type:'text',default:'t3.medium'},
            {key:'capacity_type',label:'Capacity',type:'select',options:['ON_DEMAND','SPOT'],default:'ON_DEMAND'},
            {key:'min_size',label:'Min',type:'text',default:'1'},
            {key:'max_size',label:'Max',type:'text',default:'4'},
            {key:'desired_size',label:'Desired',type:'text',default:'2'},
            {key:'disk_size',label:'Disk (GB)',type:'text',default:'20'},
          ],
          generate(cfg){
            const types=cfg.instance_types.split(',').map(t=>`"${t.trim()}"`).join(', ');
            return `resource "aws_eks_node_group" "main" {\n  cluster_name    = aws_eks_cluster.main.name\n  node_group_name = "${cfg.node_group_name}"\n  node_role_arn   = aws_iam_role.eks_node.arn\n  subnet_ids      = [aws_subnet.private.id]\n  instance_types  = [${types}]\n  capacity_type   = "${cfg.capacity_type}"\n  disk_size       = ${cfg.disk_size}\n\n  scaling_config {\n    min_size     = ${cfg.min_size}\n    max_size     = ${cfg.max_size}\n    desired_size = ${cfg.desired_size}\n  }\n\n  tags = {\n    Name = "${cfg.node_group_name}"\n  }\n}`
          },
          outputs(){return `output "eks_node_group_name" {\n  value = aws_eks_node_group.main.node_group_name\n}`}
        },
        iam_roles: {
          group:'iam', label:'IAM Roles',
          fields:[
            {key:'eks_cluster_role',label:'EKS Cluster Role',type:'text',default:'eks-cluster-role'},
            {key:'eks_node_role',label:'EKS Node Role',type:'text',default:'eks-node-role'},
          ],
          generate(cfg){return `data "aws_iam_policy_document" "eks_cluster_assume_role" {\n  statement {\n    actions = ["sts:AssumeRole"]\n    principals {\n      type        = "Service"\n      identifiers = ["eks.amazonaws.com"]\n    }\n  }\n}\n\nresource "aws_iam_role" "eks_cluster" {\n  name               = "${cfg.eks_cluster_role}"\n  assume_role_policy = data.aws_iam_policy_document.eks_cluster_assume_role.json\n}\n\nresource "aws_iam_role_policy_attachment" "eks_cluster_policy" {\n  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"\n  role       = aws_iam_role.eks_cluster.name\n}\n\ndata "aws_iam_policy_document" "eks_node_assume_role" {\n  statement {\n    actions = ["sts:AssumeRole"]\n    principals {\n      type        = "Service"\n      identifiers = ["ec2.amazonaws.com"]\n    }\n  }\n}\n\nresource "aws_iam_role" "eks_node" {\n  name               = "${cfg.eks_node_role}"\n  assume_role_policy = data.aws_iam_policy_document.eks_node_assume_role.json\n}\n\nresource "aws_iam_role_policy_attachment" "eks_node_worker" {\n  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"\n  role       = aws_iam_role.eks_node.name\n}\n\nresource "aws_iam_role_policy_attachment" "eks_node_cni" {\n  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"\n  role       = aws_iam_role.eks_node.name\n}\n\nresource "aws_iam_role_policy_attachment" "eks_node_ecr" {\n  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"\n  role       = aws_iam_role.eks_node.name\n}`},
          outputs(){return `output "eks_cluster_role_arn" {\n  value = aws_iam_role.eks_cluster.arn\n}\n\noutput "eks_node_role_arn" {\n  value = aws_iam_role.eks_node.arn\n}`}
        },
        iam_policies: {
          group:'iam', label:'Policy Attachments',
          fields:[
            {key:'custom_policy_name',label:'Policy Name',type:'text',default:'custom-app-policy'},
            {key:'s3_access',label:'S3 Access',type:'select',options:['none','read','readwrite'],default:'readwrite'},
            {key:'attach_to_role',label:'Attach to Role',type:'select',options:['eks_node','eks_cluster'],default:'eks_node'},
          ],
          generate(cfg){
            let actions=[];
            if(cfg.s3_access!=='none'){const m={read:['s3:GetObject','s3:ListBucket'],readwrite:['s3:GetObject','s3:PutObject','s3:DeleteObject','s3:ListBucket']};actions.push(...m[cfg.s3_access]);}
            const roleMap={eks_node:'aws_iam_role.eks_node.name',eks_cluster:'aws_iam_role.eks_cluster.name'};
            return `data "aws_iam_policy_document" "custom" {\n  statement {\n    actions   = [${actions.map(a=>`"${a}"`).join(', ')}]\n    resources = ["*"]\n  }\n}\n\nresource "aws_iam_policy" "custom" {\n  name   = "${cfg.custom_policy_name}"\n  policy = data.aws_iam_policy_document.custom.json\n}\n\nresource "aws_iam_role_policy_attachment" "custom" {\n  role       = ${roleMap[cfg.attach_to_role]||roleMap.eks_node}\n  policy_arn = aws_iam_policy.custom.arn\n}`
          },
          outputs(){return `output "custom_policy_arn" {\n  value = aws_iam_policy.custom.arn\n}`}
        },
        instance_profile: {
          group:'iam', label:'Instance Profile',
          fields:[
            {key:'name',label:'Name',type:'text',default:'ec2-instance-profile'},
            {key:'role_source',label:'Role',type:'select',options:['ec2','eks_node'],default:'ec2'},
          ],
          generate(cfg){
            const r=cfg.role_source==='eks_node'?'aws_iam_role.eks_node.name':'aws_iam_role.ec2.name';
            return `resource "aws_iam_instance_profile" "main" {\n  name = "${cfg.name}"\n  role = ${r}\n}`
          },
          outputs(){return `output "instance_profile_name" {\n  value = aws_iam_instance_profile.main.name\n}`}
        },
        oidc: {
          group:'iam', label:'OIDC Provider',
          fields:[
            {key:'cluster_name',label:'Cluster Name',type:'text',default:'main-eks'},
            {key:'client_id_list',label:'Client ID',type:'text',default:'sts.amazonaws.com'},
          ],
          generate(cfg){return `data "tls_certificate" "eks" {\n  url = aws_eks_cluster.main.identity[0].oidc[0].issuer\n}\n\nresource "aws_iam_openid_connect_provider" "eks" {\n  client_id_list  = ["${cfg.client_id_list}"]\n  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"]\n  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer\n\n  tags = {\n    Name = "${cfg.cluster_name}-oidc"\n  }\n}`},
          outputs(){return `output "oidc_provider_arn" {\n  value = aws_iam_openid_connect_provider.eks.arn\n}`}
        },
      },
    },

    // ============================================================
    // GCP
    // ============================================================
    gcp: {
      label: 'Google Cloud Platform',
      shortLabel: 'GCP',
      icon: 'devicon-googlecloud-plain',
      regionVar: { name: 'gcp_region', default: 'us-central1', label: 'GCP Region' },
      providerBlock: () => `terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}`,
      providerConfig: (regionVar) => `provider "google" {
  project = var.gcp_project_id
  region  = var.${regionVar}
}`,
      groups: {
        network:   { label: 'VPC & Networking', icon: 'devicon-googlecloud-plain', resources: ['gcp_vpc','gcp_subnets','gcp_firewall','gcp_cloud_nat','gcp_cloud_router','gcp_cloud_cdn'] },
        compute:   { label: 'Compute', icon: 'devicon-googlecloud-plain', resources: ['gcp_compute_instance','gcp_instance_template','gcp_mig','gcp_cloud_run'] },
        storage:   { label: 'Storage', icon: 'devicon-googlecloud-plain', resources: ['gcp_gcs_bucket','gcp_persistent_disk','gcp_filestore'] },
        database:  { label: 'Database', icon: 'devicon-googlecloud-plain', resources: ['gcp_cloud_sql_mysql','gcp_cloud_sql_postgres','gcp_firestore','gcp_memorystore_redis'] },
        gke:       { label: 'Kubernetes (GKE)', icon: 'devicon-kubernetes-plain', resources: ['gcp_gke_cluster','gcp_gke_node_pool'] },
        iam:       { label: 'IAM', icon: 'devicon-googlecloud-plain', resources: ['gcp_service_account','gcp_iam_bindings','gcp_project_iam','gcp_workload_identity'] },
      },
      resources: {
        gcp_vpc: {
          group:'network', label:'VPC Network',
          fields:[
            {key:'name',label:'VPC Name',type:'text',default:'main-vpc'},
            {key:'auto_create_subnets',label:'Auto Create Subnets',type:'checkbox',default:false},
            {key:'routing_mode',label:'Routing Mode',type:'select',options:['REGIONAL','GLOBAL'],default:'REGIONAL'},
          ],
          generate(cfg){return `resource "google_compute_network" "main" {\n  name                    = "${cfg.name}"\n  auto_create_subnetworks = ${cfg.auto_create_subnets}\n  routing_mode            = "${cfg.routing_mode}"\n}`},
          outputs(){return `output "vpc_id" {\n  value = google_compute_network.main.id\n}\n\noutput "vpc_name" {\n  value = google_compute_network.main.name\n}`}
        },
        gcp_subnets: {
          group:'network', label:'Subnets',
          fields:[
            {key:'public_subnet_cidr',label:'Public CIDR',type:'text',default:'10.0.1.0/24'},
            {key:'private_subnet_cidr',label:'Private CIDR',type:'text',default:'10.0.2.0/24'},
            {key:'region',label:'Region',type:'text',default:'us-central1'},
            {key:'public_subnet_name',label:'Public Subnet',type:'text',default:'public-subnet'},
            {key:'private_subnet_name',label:'Private Subnet',type:'text',default:'private-subnet'},
          ],
          generate(cfg){return `resource "google_compute_subnetwork" "public" {\n  name          = "${cfg.public_subnet_name}"\n  ip_cidr_range = "${cfg.public_subnet_cidr}"\n  region        = "${cfg.region}"\n  network       = google_compute_network.main.id\n\n  log_config {\n    aggregation_interval = "INTERVAL_5_SEC"\n    flow_sampling        = 0.5\n  }\n}\n\nresource "google_compute_subnetwork" "private" {\n  name                     = "${cfg.private_subnet_name}"\n  ip_cidr_range            = "${cfg.private_subnet_cidr}"\n  region                   = "${cfg.region}"\n  network                  = google_compute_network.main.id\n  private_ip_google_access = true\n}`},
          outputs(){return `output "public_subnet_id" {\n  value = google_compute_subnetwork.public.id\n}\n\noutput "private_subnet_id" {\n  value = google_compute_subnetwork.private.id\n}`}
        },
        gcp_firewall: {
          group:'network', label:'Firewall Rules',
          fields:[
            {key:'ssh_source',label:'SSH Source CIDR',type:'text',default:'0.0.0.0/0'},
            {key:'http_source',label:'HTTP Source CIDR',type:'text',default:'0.0.0.0/0'},
            {key:'enable_ssh',label:'Allow SSH',type:'checkbox',default:true},
            {key:'enable_http',label:'Allow HTTP',type:'checkbox',default:true},
            {key:'enable_https',label:'Allow HTTPS',type:'checkbox',default:true},
          ],
          generate(cfg){
            let rules='';
            if(cfg.enable_ssh)rules+=`\nresource "google_compute_firewall" "allow_ssh" {\n  name    = "allow-ssh"\n  network = google_compute_network.main.name\n\n  allow {\n    protocol = "tcp"\n    ports    = ["22"]\n  }\n\n  source_ranges = ["${cfg.ssh_source}"]\n}\n\n`;
            if(cfg.enable_http)rules+=`resource "google_compute_firewall" "allow_http" {\n  name    = "allow-http"\n  network = google_compute_network.main.name\n\n  allow {\n    protocol = "tcp"\n    ports    = ["80"]\n  }\n\n  source_ranges = ["${cfg.http_source}"]\n}\n\n`;
            if(cfg.enable_https)rules+=`resource "google_compute_firewall" "allow_https" {\n  name    = "allow-https"\n  network = google_compute_network.main.name\n\n  allow {\n    protocol = "tcp"\n    ports    = ["443"]\n  }\n\n  source_ranges = ["${cfg.http_source}"]\n}`;
            return rules;
          },
          outputs(){return `output "firewall_rules" {\n  value = "Firewall rules created"\n}`}
        },
        gcp_cloud_nat: {
          group:'network', label:'Cloud NAT',
          fields:[
            {key:'name',label:'NAT Name',type:'text',default:'main-nat'},
            {key:'region',label:'Region',type:'text',default:'us-central1'},
          ],
          generate(cfg){return `resource "google_compute_router" "main" {\n  name    = "${cfg.name}-router"\n  region  = "${cfg.region}"\n  network = google_compute_network.main.id\n}\n\nresource "google_compute_router_nat" "main" {\n  name                               = "${cfg.name}"\n  router                             = google_compute_router.main.name\n  region                             = "${cfg.region}"\n  nat_ip_allocate_option             = "AUTO_ONLY"\n  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"\n}`},
          outputs(){return `output "nat_name" {\n  value = google_compute_router_nat.main.name\n}`}
        },
        gcp_cloud_router: {
          group:'network', label:'Cloud Router',
          fields:[
            {key:'name',label:'Router Name',type:'text',default:'main-router'},
            {key:'region',label:'Region',type:'text',default:'us-central1'},
          ],
          generate(cfg){return `resource "google_compute_router" "main" {\n  name    = "${cfg.name}"\n  region  = "${cfg.region}"\n  network = google_compute_network.main.id\n}`},
          outputs(){return `output "router_id" {\n  value = google_compute_router.main.id\n}`}
        },
        gcp_cloud_cdn: {
          group:'network', label:'Cloud CDN',
          fields:[
            {key:'bucket_name',label:'Backend Bucket Name',type:'text',default:'cdn-bucket'},
            {key:'enable_cdn',label:'Enable CDN',type:'checkbox',default:true},
            {key:'origin',label:'Origin Domain',type:'text',default:'storage.googleapis.com'},
          ],
          generate(cfg){return `resource "google_storage_bucket" "cdn" {\n  name          = "${cfg.bucket_name}"\n  location      = "US"\n  force_destroy = true\n\n  website {\n    main_page_suffix = "index.html"\n  }\n}\n\nresource "google_compute_backend_bucket" "cdn" {\n  name        = "${cfg.bucket_name}-backend"\n  bucket_name = google_storage_bucket.cdn.name\n  enable_cdn  = ${cfg.enable_cdn}\n}`},
          outputs(){return `output "cdn_backend_bucket" {\n  value = google_compute_backend_bucket.cdn.name\n}`}
        },
        gcp_compute_instance: {
          group:'compute', label:'Compute Instance',
          fields:[
            {key:'name',label:'Instance Name',type:'text',default:'main-vm'},
            {key:'machine_type',label:'Machine Type',type:'select',options:['e2-micro','e2-small','e2-medium','e2-standard-2','e2-standard-4','n2-standard-2'],default:'e2-medium'},
            {key:'zone',label:'Zone',type:'text',default:'us-central1-a'},
            {key:'image',label:'Boot Image',type:'text',default:'debian-cloud/debian-11'},
            {key:'subnet_source',label:'Subnet',type:'select',options:['public','private'],default:'public'},
            {key:'tags',label:'Name Tag',type:'text',default:'web-server'},
          ],
          generate(cfg){
            const sub=cfg.subnet_source==='private'?'google_compute_subnetwork.private.id':'google_compute_subnetwork.public.id';
            return `resource "google_compute_instance" "main" {\n  name         = "${cfg.name}"\n  machine_type = "${cfg.machine_type}"\n  zone         = "${cfg.zone}"\n\n  boot_disk {\n    initialize_params {\n      image = "${cfg.image}"\n    }\n  }\n\n  network_interface {\n    subnetwork = ${sub}\n    access_config {}\n  }\n\n  tags = ["${cfg.tags}"]\n}`
          },
          outputs(){return `output "instance_id" {\n  value = google_compute_instance.main.id\n}\n\noutput "instance_external_ip" {\n  value = google_compute_instance.main.network_interface[0].access_config[0].nat_ip\n}`}
        },
        gcp_instance_template: {
          group:'compute', label:'Instance Template',
          fields:[
            {key:'name',label:'Template Name',type:'text',default:'web-template'},
            {key:'machine_type',label:'Machine Type',type:'select',options:['e2-small','e2-medium','e2-standard-2'],default:'e2-medium'},
            {key:'image',label:'Boot Image',type:'text',default:'debian-cloud/debian-11'},
            {key:'tags',label:'Tags',type:'text',default:'web-server'},
          ],
          generate(cfg){return `resource "google_compute_instance_template" "main" {\n  name         = "${cfg.name}"\n  machine_type = "${cfg.machine_type}"\n\n  disk {\n    source_image = "${cfg.image}"\n    auto_delete  = true\n    boot         = true\n  }\n\n  network_interface {\n    subnetwork = google_compute_subnetwork.public.id\n    access_config {}\n  }\n\n  tags = ["${cfg.tags}"]\n}`},
          outputs(){return `output "template_id" {\n  value = google_compute_instance_template.main.id\n}`}
        },
        gcp_mig: {
          group:'compute', label:'Managed Instance Group',
          fields:[
            {key:'name',label:'MIG Name',type:'text',default:'web-mig'},
            {key:'zone',label:'Zone',type:'text',default:'us-central1-a'},
            {key:'target_size',label:'Target Size',type:'text',default:'2'},
            {key:'min_replicas',label:'Min Replicas',type:'text',default:'1'},
            {key:'max_replicas',label:'Max Replicas',type:'text',default:'5'},
          ],
          generate(cfg){return `resource "google_compute_region_instance_group_manager" "main" {\n  name               = "${cfg.name}"\n  base_instance_name = "${cfg.name}-vm"\n  zone               = "${cfg.zone}"\n  target_size        = ${cfg.target_size}\n\n  version {\n    instance_template = google_compute_instance_template.main.id\n  }\n\n  auto_healing_policies {\n    health_check      = google_compute_health_check.main.id\n    initial_delay_sec = 300\n  }\n}\n\nresource "google_compute_autoscaler" "main" {\n  name   = "${cfg.name}-autoscaler"\n  zone   = "${cfg.zone}"\n  target = google_compute_region_instance_group_manager.main.id\n\n  autoscaling_policy {\n    min_replicas    = ${cfg.min_replicas}\n    max_replicas    = ${cfg.max_replicas}\n    cooldown_period = 60\n  }\n}\n\nresource "google_compute_health_check" "main" {\n  name = "${cfg.name}-hc"\n\n  http_health_check {\n    port = 80\n  }\n}`},
          outputs(){return `output "mig_name" {\n  value = google_compute_region_instance_group_manager.main.name\n}`}
        },
        gcp_cloud_run: {
          group:'compute', label:'Cloud Run',
          fields:[
            {key:'name',label:'Service Name',type:'text',default:'web-service'},
            {key:'image',label:'Container Image',type:'text',default:'gcr.io/cloudrun/hello'},
            {key:'port',label:'Container Port',type:'text',default:'8080'},
            {key:'region',label:'Region',type:'text',default:'us-central1'},
            {key:'min_instances',label:'Min Instances',type:'text',default:'0'},
            {key:'max_instances',label:'Max Instances',type:'text',default:'10'},
          ],
          generate(cfg){return `resource "google_cloud_run_service" "main" {\n  name     = "${cfg.name}"\n  location = "${cfg.region}"\n\n  template {\n    spec {\n      containers {\n        image = "${cfg.image}"\n        ports {\n          container_port = ${cfg.port}\n        }\n      }\n      container_concurrency = 80\n      timeout_seconds       = 300\n    }\n\n    metadata {\n      annotations = {\n        "autoscaling.knative.dev/minScale" = "${cfg.min_instances}"\n        "autoscaling.knative.dev/maxScale" = "${cfg.max_instances}"\n      }\n    }\n  }\n\n  traffic {\    percent         = 100\n    latest_revision = true\n  }\n}`},
          outputs(){return `output "cloud_run_url" {\n  value = google_cloud_run_service.main.status[0].url\n}`}
        },
        gcp_gcs_bucket: {
          group:'storage', label:'Cloud Storage Bucket',
          fields:[
            {key:'name',label:'Bucket Name',type:'text',default:'my-app-bucket'},
            {key:'location',label:'Location',type:'select',options:['US','EU','ASIA','us-central1','us-east1'],default:'US'},
            {key:'storage_class',label:'Storage Class',type:'select',options:['STANDARD','NEARLINE','COLDLINE','ARCHIVE'],default:'STANDARD'},
            {key:'force_destroy',label:'Force Destroy',type:'checkbox',default:false},
            {key:'versioning',label:'Versioning',type:'checkbox',default:true},
          ],
          generate(cfg){
            let v='';
            if(cfg.versioning)v+=`\n  versioning {\n    enabled = true\n  }`;
            return `resource "google_storage_bucket" "main" {\n  name          = "${cfg.name}"\n  location      = "${cfg.location}"\n  storage_class = "${cfg.storage_class}"\n  force_destroy = ${cfg.force_destroy}${v}\n}`
          },
          outputs(){return `output "bucket_name" {\n  value = google_storage_bucket.main.name\n}\n\noutput "bucket_url" {\n  value = google_storage_bucket.main.url\n}`}
        },
        gcp_persistent_disk: {
          group:'storage', label:'Persistent Disk',
          fields:[
            {key:'name',label:'Disk Name',type:'text',default:'data-disk'},
            {key:'type',label:'Disk Type',type:'select',options:['pd-standard','pd-balanced','pd-ssd'],default:'pd-balanced'},
            {key:'size',label:'Size (GB)',type:'text',default:'100'},
            {key:'zone',label:'Zone',type:'text',default:'us-central1-a'},
            {key:'image',label:'Source Image',type:'text',default:'debian-cloud/debian-11'},
          ],
          generate(cfg){return `resource "google_compute_disk" "main" {\n  name    = "${cfg.name}"\n  type    = "${cfg.type}"\n  zone    = "${cfg.zone}"\n  size    = ${cfg.size}\n  image   = "${cfg.image}"\n}`},
          outputs(){return `output "disk_id" {\n  value = google_compute_disk.main.id\n}`}
        },
        gcp_filestore: {
          group:'storage', label:'Filestore',
          fields:[
            {key:'name',label:'Instance Name',type:'text',default:'shared-filestore'},
            {key:'tier',label:'Tier',type:'select',options:['BASIC_HDD','BASIC_SSD','ENTERPRISE'],default:'BASIC_SSD'},
            {key:'capacity_gb',label:'Capacity (GB)',type:'text',default:'1024'},
            {key:'network',label:'Network',type:'text',default:'default'},
          ],
          generate(cfg){return `resource "google_filestore_instance" "main" {\n  name     = "${cfg.name}"\n  tier     = "${cfg.tier}"\n  location = "us-central1-b"\n\n  file_shares {\n    capacity_gb = ${cfg.capacity_gb}\n    name        = "share1"\n  }\n\n  networks {\n    network = "${cfg.network}"\n    modes   = ["MODE_IPV4"]\n  }\n}`},
          outputs(){return `output "filestore_ip" {\n  value = google_filestore_instance.main.networks[0].ip_addresses[0]\n}`}
        },
        gcp_cloud_sql_mysql: {
          group:'database', label:'Cloud SQL (MySQL)',
          fields:[
            {key:'name',label:'Instance Name',type:'text',default:'mysql-db'},
            {key:'database_version',label:'Version',type:'select',options:['MYSQL_8_0','MYSQL_5_7'],default:'MYSQL_8_0'},
            {key:'tier',label:'Tier',type:'select',options:['db-f1-micro','db-g1-small','db-n1-standard-1','db-n1-standard-2'],default:'db-f1-micro'},
            {key:'region',label:'Region',type:'text',default:'us-central1'},
            {key:'db_name',label:'DB Name',type:'text',default:'appdb'},
            {key:'db_user',label:'User',type:'text',default:'admin'},
            {key:'db_password',label:'Password',type:'text',default:'changeme123'},
          ],
          generate(cfg){return `resource "google_sql_database_instance" "mysql" {\n  name             = "${cfg.name}"\n  database_version = "${cfg.database_version}"\n  region           = "${cfg.region}"\n\n  settings {\n    tier = "${cfg.tier}"\n\n    backup_configuration {\n      enabled = true\n    }\n\n    ip_configuration {\n      ipv4_enabled    = true\n      authorized_networks {\n        name  = "all"\n        value = "0.0.0.0/0"\n      }\n    }\n  }\n}\n\nresource "google_sql_database" "main" {\n  name     = "${cfg.db_name}"\n  instance = google_sql_database_instance.mysql.name\n}\n\nresource "google_sql_user" "main" {\n  name     = "${cfg.db_user}"\n  instance = google_sql_database_instance.mysql.name\n  password = var.db_password\n}`},
          variables(){return `variable "db_password" {\n  description = "Database password"\n  type        = string\n  sensitive   = true\n}`},
          outputs(){return `output "mysql_connection_name" {\n  value = google_sql_database_instance.mysql.connection_name\n}\n\noutput "mysql_public_ip" {\n  value = google_sql_database_instance.mysql.public_ip_address\n}`}
        },
        gcp_cloud_sql_postgres: {
          group:'database', label:'Cloud SQL (PostgreSQL)',
          fields:[
            {key:'name',label:'Instance Name',type:'text',default:'postgres-db'},
            {key:'database_version',label:'Version',type:'select',options:['POSTGRES_15','POSTGRES_14','POSTGRES_13'],default:'POSTGRES_15'},
            {key:'tier',label:'Tier',type:'select',options:['db-f1-micro','db-g1-small','db-n1-standard-1','db-n1-standard-2'],default:'db-f1-micro'},
            {key:'region',label:'Region',type:'text',default:'us-central1'},
            {key:'db_name',label:'DB Name',type:'text',default:'appdb'},
            {key:'db_user',label:'User',type:'text',default:'admin'},
            {key:'db_password',label:'Password',type:'text',default:'changeme123'},
          ],
          generate(cfg){return `resource "google_sql_database_instance" "postgres" {\n  name             = "${cfg.name}"\n  database_version = "${cfg.database_version}"\n  region           = "${cfg.region}"\n\n  settings {\n    tier = "${cfg.tier}"\n\n    backup_configuration {\n      enabled = true\n    }\n\n    ip_configuration {\n      ipv4_enabled    = true\n      authorized_networks {\n        name  = "all"\n        value = "0.0.0.0/0"\n      }\n    }\n  }\n}\n\nresource "google_sql_database" "main" {\n  name     = "${cfg.db_name}"\n  instance = google_sql_database_instance.postgres.name\n}\n\nresource "google_sql_user" "main" {\n  name     = "${cfg.db_user}"\n  instance = google_sql_database_instance.postgres.name\n  password = var.db_password\n}`},
          variables(){return `variable "db_password" {\n  description = "Database password"\n  type        = string\n  sensitive   = true\n}`},
          outputs(){return `output "postgres_connection_name" {\n  value = google_sql_database_instance.postgres.connection_name\n}\n\noutput "postgres_public_ip" {\n  value = google_sql_database_instance.postgres.public_ip_address\n}`}
        },
        gcp_firestore: {
          group:'database', label:'Firestore',
          fields:[
            {key:'project_id',label:'Project ID',type:'text',default:'my-project'},
            {key:'location_id',label:'Location',type:'select',options:['us-central','us-east1','europe-west1','asia-east1'],default:'us-central'},
            {key:'type',label:'Database Type',type:'select',options:['FIRESTORE_NATIVE','DATASTORE_MODE'],default:'FIRESTORE_NATIVE'},
          ],
          generate(cfg){return `resource "google_firestore_database" "main" {\n  project     = "${cfg.project_id}"\n  name        = "(default)"\n  location_id = "${cfg.location_id}"\n  type        = "${cfg.type}"\n}`},
          outputs(){return `output "firestore_name" {\n  value = google_firestore_database.main.name\n}`}
        },
        gcp_memorystore_redis: {
          group:'database', label:'Memorystore (Redis)',
          fields:[
            {key:'name',label:'Instance Name',type:'text',default:'cache-redis'},
            {key:'tier',label:'Tier',type:'select',options:['BASIC','STANDARD_HA'],default:'BASIC'},
            {key:'memory_size_gb',label:'Memory (GB)',type:'text',default:'1'},
            {key:'region',label:'Region',type:'text',default:'us-central1'},
            {key:'redis_version',label:'Redis Version',type:'select',options:['REDIS_7_0','REDIS_6_X','REDIS_5_0'],default:'REDIS_7_0'},
          ],
          generate(cfg){return `resource "google_redis_instance" "main" {\n  name           = "${cfg.name}"\n  tier           = "${cfg.tier}"\n  memory_size_gb = ${cfg.memory_size_gb}\n  region         = "${cfg.region}"\n  redis_version  = "${cfg.redis_version}"\n  display_name   = "${cfg.name}"\n\n  authorized_network = google_compute_network.main.id\n}`},
          outputs(){return `output "redis_host" {\n  value = google_redis_instance.main.host\n}\n\noutput "redis_port" {\n  value = google_redis_instance.main.port\n}`}
        },
        gcp_gke_cluster: {
          group:'gke', label:'GKE Cluster',
          fields:[
            {key:'name',label:'Cluster Name',type:'text',default:'main-gke'},
            {key:'location',label:'Location',type:'text',default:'us-central1'},
            {key:'kubernetes_version',label:'K8s Version',type:'select',options:['1.29','1.28','1.27'],default:'1.29'},
            {key:'node_count',label:'Initial Node Count',type:'text',default:'3'},
            {key:'min_node_count',label:'Min Nodes',type:'text',default:'1'},
            {key:'max_node_count',label:'Max Nodes',type:'text',default:'5'},
          ],
          generate(cfg){return `resource "google_container_cluster" "main" {\n  name     = "${cfg.name}"\n  location = "${cfg.location}"\n\n  initial_node_count = ${cfg.node_count}\n\n  min_master_version = "${cfg.kubernetes_version}"\n\n  network    = google_compute_network.main.name\n  subnetwork = google_compute_subnetwork.private.name\n\n  ip_allocation_policy {\n    cluster_secondary_range_name  = "pods"\n    services_secondary_range_name = "services"\n  }\n\n  private_cluster_config {\n    enable_private_nodes    = true\n    enable_private_endpoint = false\n    master_ipv4_cidr_block  = "172.16.0.0/28"\n  }\n\n  autoscaling {\n    min_node_count = ${cfg.min_node_count}\n    max_node_count = ${cfg.max_node_count}\n  }\n\n  release_channel {\    channel = "REGULAR"\n  }\n}`},
          outputs(){return `output "gke_cluster_name" {\n  value = google_container_cluster.main.name\n}\n\noutput "gke_cluster_endpoint" {\n  value = google_container_cluster.main.endpoint\n}\n\noutput "gke_cluster_ca_certificate" {\n  value     = google_container_cluster.main.master_auth[0].cluster_ca_certificate\n  sensitive = true\n}`}
        },
        gcp_gke_node_pool: {
          group:'gke', label:'GKE Node Pool',
          fields:[
            {key:'name',label:'Pool Name',type:'text',default:'default-pool'},
            {key:'machine_type',label:'Machine Type',type:'select',options:['e2-small','e2-medium','e2-standard-2','e2-standard-4','n2-standard-2'],default:'e2-medium'},
            {key:'min_node_count',label:'Min Count',type:'text',default:'1'},
            {key:'max_node_count',label:'Max Count',type:'text',default:'5'},
            {key:'disk_size_gb',label:'Disk (GB)',type:'text',default:'100'},
            {key:'disk_type',label:'Disk Type',type:'select',options:['pd-standard','pd-balanced','pd-ssd'],default:'pd-balanced'},
          ],
          generate(cfg){return `resource "google_container_node_pool" "main" {\n  name       = "${cfg.name}"\n  cluster    = google_container_cluster.main.name\n  location   = google_container_cluster.main.location\n\n  autoscaling {\n    min_node_count = ${cfg.min_node_count}\n    max_node_count = ${cfg.max_node_count}\n  }\n\n  node_config {\n    machine_type = "${cfg.machine_type}"\n    disk_size_gb = ${cfg.disk_size_gb}\n    disk_type    = "${cfg.disk_type}"\n\n    oauth_scopes = [\n      "https://www.googleapis.com/auth/cloud-platform",\n    ]\n  }\n}`},
          outputs(){return `output "node_pool_name" {\n  value = google_container_node_pool.main.name\n}`}
        },
        gcp_service_account: {
          group:'iam', label:'Service Account',
          fields:[
            {key:'account_id',label:'Account ID',type:'text',default:'my-app-sa'},
            {key:'display_name',label:'Display Name',type:'text',default:'My App Service Account'},
            {key:'description',label:'Description',type:'text',default:'Service account for application workloads'},
          ],
          generate(cfg){return `resource "google_service_account" "main" {\n  account_id   = "${cfg.account_id}"\n  display_name = "${cfg.display_name}"\n  description  = "${cfg.description}"\n}`},
          outputs(){return `output "service_account_email" {\n  value = google_service_account.main.email\n}`}
        },
        gcp_iam_bindings: {
          group:'iam', label:'IAM Bindings',
          fields:[
            {key:'role',label:'Role',type:'select',options:['roles/viewer','roles/editor','roles/owner','roles/iam.serviceAccountUser','roles/compute.admin'],default:'roles/editor'},
            {key:'members',label:'Members',type:'text',default:'user:admin@example.com',desc:'Comma-separated members'},
          ],
          generate(cfg){
            const members=cfg.members.split(',').map(m=>`"${m.trim()}"`).join(', ');
            return `resource "google_project_iam_binding" "main" {\n  project = var.gcp_project_id\n  role    = "${cfg.role}"\n\n  members = [\n    ${members}\n  ]\n}`
          },
          outputs(){return `output "iam_binding_role" {\n  value = google_project_iam_binding.main.role\n}`}
        },
        gcp_project_iam: {
          group:'iam', label:'Project IAM',
          fields:[
            {key:'role',label:'Role',type:'select',options:['roles/viewer','roles/editor','roles/owner','roles/storage.admin','roles/cloudsql.admin'],default:'roles/editor'},
            {key:'member',label:'Member',type:'text',default:'serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com'},
          ],
          generate(cfg){return `resource "google_project_iam_member" "main" {\n  project = var.gcp_project_id\n  role    = "${cfg.role}"\n  member  = "${cfg.member}"\n}`},
          outputs(){return `output "project_iam_member" {\n  value = google_project_iam_member.main.member\n}`}
        },
        gcp_workload_identity: {
          group:'iam', label:'Workload Identity',
          fields:[
            {key:'namespace',label:'K8s Namespace',type:'text',default:'default'},
            {key:'k8s_sa_name',label:'K8s SA Name',type:'text',default:'my-app'},
            {key:'gcp_sa_name',label:'GCP SA Email',type:'text',default:'my-app-sa@my-project.iam.gserviceaccount.com'},
          ],
          generate(cfg){return `resource "google_service_account_iam_binding" "workload_identity" {\n  service_account_id = google_service_account.main.name\n  role               = "roles/iam.workloadIdentityUser"\n\n  members = [\n    "serviceAccount:\${var.gcp_project_id}.svc.id.goog[\${cfg.namespace}/\${cfg.k8s_sa_name}]",\n  ]\n}`},
          outputs(){return `output "workload_identity_binding" {\n  value = google_service_account_iam_binding.workload_identity.id\n}`}
        },
      },
    },

    // ============================================================
    // AZURE
    // ============================================================
    azure: {
      label: 'Microsoft Azure',
      shortLabel: 'Azure',
      icon: 'devicon-azure-plain',
      regionVar: { name: 'azure_location', default: 'East US', label: 'Azure Region' },
      providerBlock: () => `terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}`,
      providerConfig: (regionVar) => `provider "azurerm" {
  features {}

  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
}`,
      groups: {
        vnet:      { label: 'VNet & Networking', icon: 'devicon-azure-plain', resources: ['az_vnet','az_subnets','az_nsg','az_public_ip','az_firewall','az_app_gateway'] },
        compute:   { label: 'Compute', icon: 'devicon-azure-plain', resources: ['az_virtual_machine','az_vm_scale_set','az_container_instances'] },
        storage:   { label: 'Storage', icon: 'devicon-azure-plain', resources: ['az_storage_account','az_managed_disk','az_file_share'] },
        database:  { label: 'Database', icon: 'devicon-azure-plain', resources: ['az_sql','az_cosmos_db','az_postgresql','az_redis_cache'] },
        aks:       { label: 'Kubernetes (AKS)', icon: 'devicon-kubernetes-plain', resources: ['az_aks_cluster','az_aks_node_pool'] },
        iam:       { label: 'IAM & Security', icon: 'devicon-azure-plain', resources: ['az_service_principal','az_role_assignment','az_managed_identity','az_key_vault'] },
      },
      resources: {
        az_vnet: {
          group:'vnet', label:'Virtual Network',
          fields:[
            {key:'name',label:'VNet Name',type:'text',default:'main-vnet'},
            {key:'address_space',label:'Address Space',type:'text',default:'10.0.0.0/16'},
            {key:'resource_group',label:'Resource Group',type:'text',default:'main-rg'},
          ],
          generate(cfg){return `resource "azurerm_resource_group" "main" {\n  name     = "${cfg.resource_group}"\n  location = var.azure_location\n}\n\nresource "azurerm_virtual_network" "main" {\n  name                = "${cfg.name}"\n  address_space       = ["${cfg.address_space}"]\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n}`},
          outputs(){return `output "vnet_id" {\n  value = azurerm_virtual_network.main.id\n}\n\noutput "vnet_name" {\n  value = azurerm_virtual_network.main.name\n}`}
        },
        az_subnets: {
          group:'vnet', label:'Subnets',
          fields:[
            {key:'public_subnet_name',label:'Public Subnet',type:'text',default:'public-subnet'},
            {key:'public_cidr',label:'Public CIDR',type:'text',default:'10.0.1.0/24'},
            {key:'private_subnet_name',label:'Private Subnet',type:'text',default:'private-subnet'},
            {key:'private_cidr',label:'Private CIDR',type:'text',default:'10.0.2.0/24'},
          ],
          generate(cfg){return `resource "azurerm_subnet" "public" {\n  name                 = "${cfg.public_subnet_name}"\n  resource_group_name  = azurerm_resource_group.main.name\n  virtual_network_name = azurerm_virtual_network.main.name\n  address_prefixes     = ["${cfg.public_cidr}"]\n}\n\nresource "azurerm_subnet" "private" {\n  name                 = "${cfg.private_subnet_name}"\n  resource_group_name  = azurerm_resource_group.main.name\n  virtual_network_name = azurerm_virtual_network.main.name\n  address_prefixes     = ["${cfg.private_cidr}"]\n}`},
          outputs(){return `output "public_subnet_id" {\n  value = azurerm_subnet.public.id\n}\n\noutput "private_subnet_id" {\n  value = azurerm_subnet.private.id\n}`}
        },
        az_nsg: {
          group:'vnet', label:'Network Security Group',
          fields:[
            {key:'name',label:'NSG Name',type:'text',default:'main-nsg'},
            {key:'ssh_source',label:'SSH Source',type:'text',default:'*'},
            {key:'http_source',label:'HTTP Source',type:'text',default:'*'},
            {key:'enable_ssh',label:'Allow SSH',type:'checkbox',default:true},
            {key:'enable_http',label:'Allow HTTP',type:'checkbox',default:true},
            {key:'enable_https',label:'Allow HTTPS',type:'checkbox',default:true},
          ],
          generate(cfg){
            let rules='';
            if(cfg.enable_ssh)rules+=`\n  security_rule {\n    name                       = "AllowSSH"\n    priority                   = 100\n    direction                  = "Inbound"\n    access                     = "Allow"\n    protocol                   = "Tcp"\n    source_port_range          = "*"\n    destination_port_range     = "22"\n    source_address_prefix      = "${cfg.ssh_source}"\n    destination_address_prefix = "*"\n  }`;
            if(cfg.enable_http)rules+=`\n  security_rule {\n    name                       = "AllowHTTP"\n    priority                   = 110\n    direction                  = "Inbound"\n    access                     = "Allow"\n    protocol                   = "Tcp"\n    source_port_range          = "*"\n    destination_port_range     = "80"\n    source_address_prefix      = "${cfg.http_source}"\n    destination_address_prefix = "*"\n  }`;
            if(cfg.enable_https)rules+=`\n  security_rule {\n    name                       = "AllowHTTPS"\n    priority                   = 120\n    direction                  = "Inbound"\n    access                     = "Allow"\n    protocol                   = "Tcp"\n    source_port_range          = "*"\n    destination_port_range     = "443"\n    source_address_prefix      = "${cfg.http_source}"\n    destination_address_prefix = "*"\n  }`;
            return `resource "azurerm_network_security_group" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name${rules}\n}`
          },
          outputs(){return `output "nsg_id" {\n  value = azurerm_network_security_group.main.id\n}`}
        },
        az_public_ip: {
          group:'vnet', label:'Public IP',
          fields:[
            {key:'name',label:'IP Name',type:'text',default:'main-pip'},
            {key:'allocation',label:'Allocation',type:'select',options:['Static','Dynamic'],default:'Static'},
            {key:'sku',label:'SKU',type:'select',options:['Basic','Standard'],default:'Standard'},
          ],
          generate(cfg){return `resource "azurerm_public_ip" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  allocation_method   = "${cfg.allocation}"\n  sku                 = "${cfg.sku}"\n}`},
          outputs(){return `output "public_ip_address" {\n  value = azurerm_public_ip.main.ip_address\n}`}
        },
        az_firewall: {
          group:'vnet', label:'Azure Firewall',
          fields:[
            {key:'name',label:'Firewall Name',type:'text',default:'main-fw'},
            {key:'sku',label:'SKU',type:'select',options:['AZFW_VNet','AZFW_Hub'],default:'AZFW_VNet'},
            {key:'tier',label:'Tier',type:'select',options:['Standard','Premium'],default:'Standard'},
          ],
          generate(cfg){return `resource "azurerm_firewall" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  sku_name            = "${cfg.sku}"\n  sku_tier            = "${cfg.tier}"\n\n  ip_configuration {\n    name                 = "configuration"\n    subnet_id            = azurerm_subnet.firewall.id\n    public_ip_address_id = azurerm_public_ip.fw.id\n  }\n}\n\nresource "azurerm_subnet" "firewall" {\n  name                 = "AzureFirewallSubnet"\n  resource_group_name  = azurerm_resource_group.main.name\n  virtual_network_name = azurerm_virtual_network.main.name\n  address_prefixes     = ["10.0.3.0/26"]\n}\n\nresource "azurerm_public_ip" "fw" {\n  name                = "${cfg.name}-pip"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  allocation_method   = "Static"\n  sku                 = "Standard"\n}`},
          outputs(){return `output "firewall_private_ip" {\n  value = azurerm_firewall.main.ip_configuration[0].private_ip_address\n}`}
        },
        az_app_gateway: {
          group:'vnet', label:'Application Gateway',
          fields:[
            {key:'name',label:'Gateway Name',type:'text',default:'main-appgw'},
            {key:'sku',label:'SKU',type:'select',options:['Standard_v2','WAF_v2'],default:'Standard_v2'},
            {key:'capacity',label:'Capacity',type:'text',default:'2'},
            {key:'frontend_port',label:'Frontend Port',type:'text',default:'80'},
            {key:'backend_port',label:'Backend Port',type:'text',default:'80'},
          ],
          generate(cfg){return `resource "azurerm_application_gateway" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n\n  sku {\n    name     = "${cfg.sku}"\n    tier     = "${cfg.sku}"\n    capacity = ${cfg.capacity}\n  }\n\n  frontend_ip_configuration {\n    name                 = "public"\n    public_ip_address_id = azurerm_public_ip.main.id\n  }\n\n  frontend_port {\n    name = "http"\n    port = ${cfg.frontend_port}\n  }\n\n  backend_address_pool {\n    name = "backend-pool"\n  }\n\n  backend_http_settings {\n    name                  = "http-settings"\n    cookie_based_affinity = "Disabled"\n    path                  = "/"\n    port                  = ${cfg.backend_port}\n    protocol              = "Http"\n    request_timeout       = 60\n  }\n\n  http_listener {\n    name                           = "http-listener"\n    frontend_ip_configuration_name = "public"\n    frontend_port_name             = "http"\n    protocol                       = "Http"\n  }\n\n  request_routing_rule {\n    name                       = "routing-rule"\n    rule_type                  = "Basic"\    http_listener_name          = "http-listener"\n    backend_address_pool_name  = "backend-pool"\n    backend_http_settings_name = "http-settings"\n  }\n}`},
          outputs(){return `output "appgw_id" {\n  value = azurerm_application_gateway.main.id\n}`}
        },
        az_virtual_machine: {
          group:'compute', label:'Virtual Machine',
          fields:[
            {key:'name',label:'VM Name',type:'text',default:'main-vm'},
            {key:'size',label:'VM Size',type:'select',options:['Standard_B1s','Standard_B2s','Standard_D2s_v3','Standard_D4s_v3','Standard_E2s_v3'],default:'Standard_B2s'},
            {key:'os_type',label:'OS',type:'select',options:['linux','windows'],default:'linux'},
            {key:'image',label:'Image',type:'text',default:'Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest'},
            {key:'admin_username',label:'Admin User',type:'text',default:'azureuser'},
            {key:'subnet_source',label:'Subnet',type:'select',options:['public','private'],default:'public'},
          ],
          generate(cfg){
            const sub=cfg.subnet_source==='private'?'azurerm_subnet.private.id':'azurerm_subnet.public.id';
            return `resource "azurerm_network_interface" "main" {\n  name                = "${cfg.name}-nic"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n\n  ip_configuration {\n    name                          = "internal"\n    subnet_id                     = ${sub}\n    private_ip_address_allocation = "Dynamic"\n  }\n}\n\nresource "azurerm_linux_virtual_machine" "main" {\n  name                  = "${cfg.name}"\n  location              = azurerm_resource_group.main.location\n  resource_group_name   = azurerm_resource_group.main.name\n  size                  = "${cfg.size}"\n  admin_username        = "${cfg.admin_username}"\n  network_interface_ids = [azurerm_network_interface.main.id]\n\n  os_disk {\n    caching              = "ReadWrite"\n    storage_account_type = "Standard_LRS"\n  }\n\n  source_image_reference {\n    publisher = split(":", "${cfg.image}")[0]\n    offer     = split(":", "${cfg.image}")[1]\n    sku       = split(":", "${cfg.image}")[2]\n    version   = split(":", "${cfg.image}")[3]\n  }\n}`
          },
          outputs(){return `output "vm_id" {\n  value = azurerm_linux_virtual_machine.main.id\n}\n\noutput "vm_private_ip" {\n  value = azurerm_linux_virtual_machine.main.private_ip_address\n}`}
        },
        az_vm_scale_set: {
          group:'compute', label:'VM Scale Set',
          fields:[
            {key:'name',label:'VMSS Name',type:'text',default:'web-vmss'},
            {key:'sku',label:'VM SKU',type:'select',options:['Standard_B1s','Standard_B2s','Standard_D2s_v3'],default:'Standard_B2s'},
            {key:'instances',label:'Instances',type:'text',default:'2'},
            {key:'admin_username',label:'Admin User',type:'text',default:'azureuser'},
            {key:'admin_password',label:'Admin Password',type:'text',default:'P@ssw0rd1234!'},
          ],
          generate(cfg){return `resource "azurerm_linux_virtual_machine_scale_set" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  sku                 = "${cfg.sku}"\n  instances           = ${cfg.instances}\n  admin_username      = "${cfg.admin_username}"\n  admin_password      = "${cfg.admin_password}"\n\n  network_interface {\n    name    = "nic"\n    primary = true\n\n    ip_configuration {\n      name      = "internal"\n      primary   = true\n      subnet_id = azurerm_subnet.public.id\n    }\n  }\n\n  os_disk {\n    caching              = "ReadWrite"\n    storage_account_type = "Standard_LRS"\n  }\n\n  source_image_reference {\n    publisher = "Canonical"\n    offer     = "0001-com-ubuntu-server-jammy"\n    sku       = "22_04-lts"\n    version   = "latest"\n  }\n}`},
          outputs(){return `output "vmss_id" {\n  value = azurerm_linux_virtual_machine_scale_set.main.id\n}`}
        },
        az_container_instances: {
          group:'compute', label:'Container Instances',
          fields:[
            {key:'name',label:'Container Name',type:'text',default:'main-container'},
            {key:'image',label:'Container Image',type:'text',default:'nginx:alpine'},
            {key:'cpu',label:'CPU cores',type:'text',default:'1'},
            {key:'memory_gb',label:'Memory (GB)',type:'text',default:'1.5'},
            {key:'port',label:'Port',type:'text',default:'80'},
            {key:'os_type',label:'OS',type:'select',options:['Linux','Windows'],default:'Linux'},
          ],
          generate(cfg){return `resource "azurerm_container_group" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  ip_type             = "Public"\n  os_type             = "${cfg.os_type}"\n\n  container {\n    name   = "${cfg.name}"\n    image  = "${cfg.image}"\n    cpu    = ${cfg.cpu}\n    memory = ${cfg.memory_gb}\n\n    ports {\      port     = ${cfg.port}\n      protocol = "TCP"\n    }\n  }\n}`},
          outputs(){return `output "container_ip" {\n  value = azurerm_container_group.main.ip_address\n}`}
        },
        az_storage_account: {
          group:'storage', label:'Storage Account',
          fields:[
            {key:'name',label:'Account Name',type:'text',default:'myappstorage',desc:'Lowercase, no hyphens'},
            {key:'resource_group',label:'Resource Group',type:'text',default:'main-rg'},
            {key:'tier',label:'Access Tier',type:'select',options:['Hot','Cool','Cold','Archive'],default:'Hot'},
            {key:'replication',label:'Replication',type:'select',options:['LRS','GRS','RAGRS','ZRS','GZRS','RAGZRS'],default:'LRS'},
            {key:'https_only',label:'HTTPS Only',type:'checkbox',default:true},
            {key:'min_tls',label:'Min TLS',type:'select',options:['TLS1_2','TLS1_0'],default:'TLS1_2'},
          ],
          generate(cfg){return `resource "azurerm_storage_account" "main" {\n  name                     = "${cfg.name}"\n  resource_group_name      = azurerm_resource_group.main.name\n  location                 = azurerm_resource_group.main.location\n  account_tier             = "${cfg.tier}"\n  account_replication_type = "${cfg.replication}"\n  https_traffic_only_enabled = ${cfg.https_only}\n  min_tls_version          = "${cfg.min_tls}"\n}`},
          outputs(){return `output "storage_account_id" {\n  value = azurerm_storage_account.main.id\n}\n\noutput "storage_account_primary_blob_endpoint" {\n  value = azurerm_storage_account.main.primary_blob_endpoint\n}`}
        },
        az_managed_disk: {
          group:'storage', label:'Managed Disk',
          fields:[
            {key:'name',label:'Disk Name',type:'text',default:'data-disk'},
            {key:'storage_type',label:'Storage Type',type:'select',options:['Standard_LRS','StandardSSD_LRS','Premium_LRS','Premium_ZRS','StandardSSD_ZRS'],default:'StandardSSD_LRS'},
            {key:'size_gb',label:'Size (GB)',type:'text',default:'128'},
            {key:'os_type',label:'OS Type',type:'select',options:['None','Linux','Windows'],default:'None'},
            {key:'create_option',label:'Create Option',type:'select',options:['Empty','FromImage','Import'],default:'Empty'},
          ],
          generate(cfg){return `resource "azurerm_managed_disk" "main" {\n  name                 = "${cfg.name}"\n  location             = azurerm_resource_group.main.location\n  resource_group_name  = azurerm_resource_group.main.name\n  storage_account_type = "${cfg.storage_type}"\n  create_option        = "${cfg.create_option}"\n  disk_size_gb         = ${cfg.size_gb}\n  os_type              = "${cfg.os_type}"\n}`},
          outputs(){return `output "disk_id" {\n  value = azurerm_managed_disk.main.id\n}`}
        },
        az_file_share: {
          group:'storage', label:'File Share',
          fields:[
            {key:'share_name',label:'Share Name',type:'text',default:'shared-files'},
            {key:'quota_gb',label:'Quota (GB)',type:'text',default:'100'},
            {key:'account_name',label:'Storage Account',type:'text',default:'myappstorage'},
          ],
          generate(cfg){return `resource "azurerm_storage_share" "main" {\n  name                 = "${cfg.share_name}"\n  storage_account_name = "${cfg.account_name}"\n  quota                = ${cfg.quota_gb}\n}`},
          outputs(){return `output "file_share_id" {\n  value = azurerm_storage_share.main.id\n}`}
        },
        az_sql: {
          group:'database', label:'Azure SQL',
          fields:[
            {key:'name',label:'Server Name',type:'text',default:'main-sql'},
            {key:'sku',label:'SKU',type:'select',options:['Basic','S0','S1','S2','P1','P2'],default:'S0'},
            {key:'db_name',label:'Database Name',type:'text',default:'appdb'},
            {key:'admin_user',label:'Admin User',type:'text',default:'sqladmin'},
            {key:'admin_password',label:'Admin Password',type:'text',default:'P@ssw0rd1234!'},
            {key:'max_size_gb',label:'Max Size (GB)',type:'text',default:'2'},
          ],
          generate(cfg){return `resource "azurerm_mssql_server" "main" {\n  name                         = "${cfg.name}"\n  resource_group_name          = azurerm_resource_group.main.name\n  location                     = azurerm_resource_group.main.location\n  version                      = "12.0"\n  administrator_login          = "${cfg.admin_user}"\n  administrator_login_password = "${cfg.admin_password}"\n}\n\nresource "azurerm_mssql_database" "main" {\n  name      = "${cfg.db_name}"\n  server_id = azurerm_mssql_server.main.id\n  sku_name  = "${cfg.sku}"\n  max_size_gb = ${cfg.max_size_gb}\n}`},
          outputs(){return `output "sql_server_fqdn" {\n  value = azurerm_mssql_server.main.fully_qualified_domain_name\n}\n\noutput "sql_database_id" {\n  value = azurerm_mssql_database.main.id\n}`}
        },
        az_cosmos_db: {
          group:'database', label:'Cosmos DB',
          fields:[
            {key:'name',label:'Account Name',type:'text',default:'main-cosmos'},
            {key:'api',label:'API',type:'select',options:['sql','mongodb','cassandra','table','gremlin'],default:'sql'},
            {key:'consistency_level',label:'Consistency',type:'select',options:['Session','Eventual','Strong','BoundedStaleness','ConsistentPrefix'],default:'Session'},
            {key:'max_throughput',label:'Max RU/s',type:'text',default:'400'},
          ],
          generate(cfg){return `resource "azurerm_cosmosdb_account" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  offer_type          = "Standard"\n  kind                = "${cfg.api === 'mongodb' ? 'MongoDB' : 'GlobalDocumentDB'}"\n\n  consistency_policy {\n    consistency_level = "${cfg.consistency_level}"\n  }\n\n  geo_location {\n    location          = azurerm_resource_group.main.location\n    failover_priority = 0\n  }\n\n  capabilities {\n    name = "EnableServerless"\n  }\n}\n\nresource "azurerm_cosmosdb_sql_database" "main" {\n  name                = "${cfg.name}-db"\n  resource_group_name = azurerm_resource_group.main.name\n  account_name        = azurerm_cosmosdb_account.main.name\n}`},
          outputs(){return `output "cosmos_endpoint" {\n  value = azurerm_cosmosdb_account.main.endpoint\n}\n\noutput "cosmos_primary_key" {\n  value     = azurerm_cosmosdb_account.main.primary_key\n  sensitive = true\n}`}
        },
        az_postgresql: {
          group:'database', label:'Azure PostgreSQL',
          fields:[
            {key:'server_name',label:'Server Name',type:'text',default:'main-pg'},
            {key:'sku',label:'SKU',type:'select',options:['B_Gen5_1','B_Gen5_2','GP_Gen5_2','GP_Gen5_4'],default:'B_Gen5_1'},
            {key:'storage_mb',label:'Storage (MB)',type:'text',default:'32768'},
            {key:'db_version',label:'Version',type:'select',options:['15','14','13','12'],default:'15'},
            {key:'admin_user',label:'Admin User',type:'text',default:'pgadmin'},
            {key:'admin_password',label:'Admin Password',type:'text',default:'P@ssw0rd1234!'},
          ],
          generate(cfg){return `resource "azurerm_postgresql_flexible_server" "main" {\n  name                   = "${cfg.server_name}"\n  resource_group_name    = azurerm_resource_group.main.name\n  location               = azurerm_resource_group.main.location\n  version                = ${cfg.db_version}\n  sku_name               = "${cfg.sku}"\n  storage_mb             = ${cfg.storage_mb}\n  administrator_login    = "${cfg.admin_user}"\n  administrator_password = "${cfg.admin_password}"\n}\n\nresource "azurerm_postgresql_flexible_server_database" "main" {\n  name      = "appdb"\n  server_id = azurerm_postgresql_flexible_server.main.id\n  collation = "en_US.utf8"\n  charset   = "utf8"\n}`},
          outputs(){return `output "postgresql_fqdn" {\n  value = azurerm_postgresql_flexible_server.main.fqdn\n}`}
        },
        az_redis_cache: {
          group:'database', label:'Azure Cache for Redis',
          fields:[
            {key:'name',label:'Cache Name',type:'text',default:'main-redis'},
            {key:'sku',label:'SKU',type:'select',options:['Basic','Standard','Premium'],default:'Basic'},
            {key:'family',label:'Family',type:'select',options:['C','P'],default:'C'},
            {key:'capacity',label:'Capacity',type:'select',options:['0','1','2','3','4','5','6'],default:'0'},
            {key:'minimum_tls_version',label:'TLS Version',type:'select',options:['1.2','1.0'],default:'1.2'},
          ],
          generate(cfg){return `resource "azurerm_redis_cache" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  capacity            = ${cfg.capacity}\n  family              = "${cfg.family}"\n  sku_name            = "${cfg.sku}"\n  minimum_tls_version = "${cfg.minimum_tls_version}"\n}`},
          outputs(){return `output "redis_hostname" {\n  value = azurerm_redis_cache.main.hostname\n}\n\noutput "redis_ssl_port" {\n  value = azurerm_redis_cache.main.ssl_port\n}`}
        },
        az_aks_cluster: {
          group:'aks', label:'AKS Cluster',
          fields:[
            {key:'name',label:'Cluster Name',type:'text',default:'main-aks'},
            {key:'dns_prefix',label:'DNS Prefix',type:'text',default:'aks'},
            {key:'kubernetes_version',label:'K8s Version',type:'select',options:['1.29','1.28','1.27'],default:'1.29'},
            {key:'node_count',label:'Node Count',type:'text',default:'3'},
            {key:'vm_size',label:'VM Size',type:'select',options:['Standard_B2s','Standard_D2s_v3','Standard_D4s_v3','Standard_E2s_v3'],default:'Standard_D2s_v3'},
            {key:'os_disk_size_gb',label:'Disk Size (GB)',type:'text',default:'128'},
          ],
          generate(cfg){return `resource "azurerm_kubernetes_cluster" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n  dns_prefix          = "${cfg.dns_prefix}"\n  kubernetes_version  = "${cfg.kubernetes_version}"\n\n  default_node_pool {\n    name                = "default"\n    node_count          = ${cfg.node_count}\n    vm_size             = "${cfg.vm_size}"\n    os_disk_size_gb     = ${cfg.os_disk_size_gb}\n    vnet_subnet_id      = azurerm_subnet.private.id\n  }\n\n  identity {\n    type = "SystemAssigned"\n  }\n\n  network_profile {\n    network_plugin = "azure"\n    network_policy = "azure"\n  }\n}`},
          outputs(){return `output "aks_cluster_name" {\n  value = azurerm_kubernetes_cluster.main.name\n}\n\noutput "aks_cluster_fqdn" {\n  value = azurerm_kubernetes_cluster.main.fqdn\n}\n\noutput "aks_kube_config" {\n  value     = azurerm_kubernetes_cluster.main.kube_config_raw\n  sensitive = true\n}`}
        },
        az_aks_node_pool: {
          group:'aks', label:'AKS Node Pool',
          fields:[
            {key:'name',label:'Pool Name',type:'text',default:'workerpool'},
            {key:'vm_size',label:'VM Size',type:'select',options:['Standard_B2s','Standard_D2s_v3','Standard_D4s_v3','Standard_E2s_v3'],default:'Standard_D2s_v3'},
            {key:'node_count',label:'Node Count',type:'text',default:'2'},
            {key:'min_count',label:'Min Count',type:'text',default:'1'},
            {key:'max_count',label:'Max Count',type:'text',default:'5'},
            {key:'os_disk_size_gb',label:'Disk Size (GB)',type:'text',default:'128'},
            {key:'mode',label:'Mode',type:'select',options:['User','System'],default:'User'},
          ],
          generate(cfg){return `resource "azurerm_kubernetes_cluster_node_pool" "main" {\n  name                  = "${cfg.name}"\n  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id\n  vm_size               = "${cfg.vm_size}"\n  node_count            = ${cfg.node_count}\n  min_count             = ${cfg.min_count}\n  max_count             = ${cfg.max_count}\n  os_disk_size_gb       = ${cfg.os_disk_size_gb}\n  mode                  = "${cfg.mode}"\n  vnet_subnet_id        = azurerm_subnet.private.id\n}`},
          outputs(){return `output "node_pool_id" {\n  value = azurerm_kubernetes_cluster_node_pool.main.id\n}`}
        },
        az_service_principal: {
          group:'iam', label:'Service Principal',
          fields:[
            {key:'display_name',label:'Display Name',type:'text',default:'my-app-sp'},
            {key:'description',label:'Description',type:'text',default:'Service principal for application'},
          ],
          generate(cfg){return `resource "azuread_application" "main" {\n  display_name = "${cfg.display_name}"\n  description  = "${cfg.description}"\n}\n\nresource "azuread_service_principal" "main" {\n  application_id = azuread_application.main.application_id\n}\n\nresource "azuread_service_principal_password" "main" {\n  service_principal_id = azuread_service_principal.main.id\n}`},
          outputs(){return `output "service_principal_id" {\n  value = azuread_service_principal.main.application_id\n}\n\noutput "service_principal_object_id" {\n  value = azuread_service_principal.main.object_id\n}`}
        },
        az_role_assignment: {
          group:'iam', label:'Role Assignment',
          fields:[
            {key:'role',label:'Role',type:'select',options:['Contributor','Reader','Owner','User Access Administrator','Storage Blob Data Contributor'],default:'Contributor'},
            {key:'scope',label:'Scope',type:'text',default:'/subscriptions/...',desc:'Resource group or subscription scope'},
          ],
          generate(cfg){return `resource "azurerm_role_assignment" "main" {\n  scope                = "${cfg.scope}"\n  role_definition_name = "${cfg.role}"\n  principal_id         = azuread_service_principal.main.object_id\n}`},
          outputs(){return `output "role_assignment_id" {\n  value = azurerm_role_assignment.main.id\n}`}
        },
        az_managed_identity: {
          group:'iam', label:'Managed Identity',
          fields:[
            {key:'name',label:'Identity Name',type:'text',default:'main-identity'},
            {key:'location',label:'Location',type:'text',default:'East US'},
          ],
          generate(cfg){return `resource "azurerm_user_assigned_identity" "main" {\n  name                = "${cfg.name}"\n  location            = azurerm_resource_group.main.location\n  resource_group_name = azurerm_resource_group.main.name\n}`},
          outputs(){return `output "identity_principal_id" {\n  value = azurerm_user_assigned_identity.main.principal_id\n}\n\noutput "identity_client_id" {\n  value = azurerm_user_assigned_identity.main.client_id\n}`}
        },
        az_key_vault: {
          group:'iam', label:'Key Vault',
          fields:[
            {key:'name',label:'Vault Name',type:'text',default:'main-kv',desc:'Globally unique, 3-24 chars'},
            {key:'sku',label:'SKU',type:'select',options:['standard','premium'],default:'standard'},
            {key:'tenant_id',label:'Tenant ID',type:'text',default:'your-tenant-id'},
            {key:'soft_delete_retention',label:'Soft Delete Days',type:'text',default:'7'},
            {key:'purge_protection',label:'Purge Protection',type:'checkbox',default:true},
          ],
          generate(cfg){return `data "azurerm_client_config" "current" {}\n\nresource "azurerm_key_vault" "main" {\n  name                       = "${cfg.name}"\n  location                   = azurerm_resource_group.main.location\n  resource_group_name        = azurerm_resource_group.main.name\n  tenant_id                  = "${cfg.tenant_id}"\n  sku_name                   = "${cfg.sku}"\n  soft_delete_retention_days = ${cfg.soft_delete_retention}\n  purge_protection_enabled   = ${cfg.purge_protection}\n\n  access_policy {\n    tenant_id = data.azurerm_client_config.current.tenant_id\n    object_id = data.azurerm_client_config.current.object_id\n\n    secret_permissions = [\n      "Get", "List", "Set", "Delete", "Purge",\n    ]\n  }\n}`},
          outputs(){return `output "key_vault_id" {\n  value = azurerm_key_vault.main.id\n}\n\noutput "key_vault_uri" {\n  value = azurerm_key_vault.main.vault_uri\n}`}
        },
      },
    },
  };

  // ============================================================
  // STATE
  // ============================================================
  let activeProvider = 'aws';
  const configValues = {};
  const selectedResources = new Set();
  let generatedFiles = {};

  // ============================================================
  // DOM
  // ============================================================
  const els = {};
  function cacheDom() {
    els.providerTabs = document.querySelectorAll('.provider-tab');
    els.resourcePanel = document.getElementById('resource-groups');
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
    els.modalStats = document.getElementById('modal-stats');
    els.copyAllBtn = document.getElementById('copy-all-btn');
    els.downloadZipBtn = document.getElementById('download-zip-btn');
    els.heroTitle = document.getElementById('hero-provider-name');
    els.heroDesc = document.getElementById('hero-provider-desc');
    els.heroStats = document.getElementById('hero-stats');
    els.downloadFilename = document.getElementById('download-filename');
  }

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    initDefaultConfigValues();
    renderResourcePanel();
    bindEvents();
    updateSelectionUI();
  });

  function initDefaultConfigValues() {
    configValues[activeProvider] = {};
    const provider = PROVIDERS[activeProvider];
    for (const [key, def] of Object.entries(provider.resources)) {
      configValues[activeProvider][key] = {};
      for (const f of def.fields) {
        configValues[activeProvider][key][f.key] = f.default;
      }
    }
  }

  // ============================================================
  // EVENTS
  // ============================================================
  function bindEvents() {
    els.selectAllBtn.addEventListener('click', toggleSelectAll);

    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('group-checkbox')) {
        const group = e.target.dataset.group;
        const checked = e.target.checked;
        const provider = PROVIDERS[activeProvider];
        provider.groups[group].resources.forEach(r => {
          const cb = document.querySelector(`.resource-checkbox[value="${r}"]`);
          if (cb) cb.checked = checked;
        });
        syncSelection();
      }
      if (e.target.classList.contains('resource-checkbox')) {
        syncSelection();
      }
    });

    els.generateBtn.addEventListener('click', handleGenerate);
    els.previewBtn.addEventListener('click', handlePreview);
    els.modalClose.addEventListener('click', closeModal);
    els.modalOverlay.addEventListener('click', (e) => { if (e.target === els.modalOverlay) closeModal(); });
    els.copyAllBtn.addEventListener('click', handleCopyAll);
    els.downloadZipBtn.addEventListener('click', handleDownloadZip);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    document.querySelectorAll('.provider-tab').forEach(tab => {
      tab.addEventListener('click', () => switchProvider(tab.dataset.provider));
    });
  }

  // ============================================================
  // PROVIDER SWITCHING
  // ============================================================
  function switchProvider(providerKey) {
    if (providerKey === activeProvider) return;
    activeProvider = providerKey;
    selectedResources.clear();

    document.querySelectorAll('.provider-tab').forEach(t => t.classList.toggle('active', t.dataset.provider === activeProvider));

    const provider = PROVIDERS[activeProvider];
    if (!configValues[activeProvider]) {
      configValues[activeProvider] = {};
      for (const [key, def] of Object.entries(provider.resources)) {
        configValues[activeProvider][key] = {};
        for (const f of def.fields) {
          configValues[activeProvider][key][f.key] = f.default;
        }
      }
    }

    if (els.heroTitle) els.heroTitle.textContent = provider.shortLabel;
    if (els.heroDesc) els.heroDesc.textContent = `Generate production-ready Terraform configurations for ${provider.label}`;
    const totalRes = Object.keys(provider.resources).length;
    if (els.heroStats) els.heroStats.innerHTML = `<div class="stat"><span>${totalRes}</span> Resources</div><div class="stat"><span>2</span> Output Modes</div><div class="stat"><span>1</span> Click Deploy</div>`;
    if (els.totalCount) els.totalCount.textContent = totalRes;
    if (els.downloadFilename) els.downloadFilename.textContent = `terraform-${activeProvider}-infrastructure.zip`;

    renderResourcePanel();
    renderConfigSections();
    updateSelectionUI();
  }

  // ============================================================
  // RESOURCE PANEL RENDERING
  // ============================================================
  function renderResourcePanel() {
    const provider = PROVIDERS[activeProvider];
    const container = els.resourcePanel;
    container.innerHTML = '';

    let first = true;
    for (const [groupId, groupDef] of Object.entries(provider.groups)) {
      const details = document.createElement('details');
      details.className = 'resource-group';
      details.id = `group-${groupId}`;
      if (first) { details.open = true; first = false; }

      let resourcesHtml = '';
      groupDef.resources.forEach(resKey => {
        const resDef = provider.resources[resKey];
        resourcesHtml += `
          <label class="resource-item" data-resource="${resKey}">
            <input type="checkbox" class="resource-checkbox" value="${resKey}">
            <i class="${groupDef.icon} resource-icon"></i>
            <span>${resDef.label}</span>
          </label>`;
      });

      details.innerHTML = `
        <summary class="group-header">
          <div class="group-toggle">
            <input type="checkbox" class="group-checkbox" data-group="${groupId}" id="group-check-${groupId}">
            <label for="group-check-${groupId}"></label>
          </div>
          <div class="group-info">
            <i class="${groupDef.icon} group-icon"></i>
            <span class="group-name">${groupDef.label}</span>
            <span class="group-count">${groupDef.resources.length} resources</span>
          </div>
          <i class="fa-solid fa-chevron-down group-chevron"></i>
        </summary>
        <div class="group-content">${resourcesHtml}</div>`;

      container.appendChild(details);
    }
  }

  // ============================================================
  // SELECTION
  // ============================================================
  function toggleSelectAll() {
    const provider = PROVIDERS[activeProvider];
    const allRes = Object.keys(provider.resources);
    const allChecked = selectedResources.size === allRes.length;
    document.querySelectorAll('.resource-checkbox').forEach(cb => { cb.checked = !allChecked; });
    document.querySelectorAll('.group-checkbox').forEach(cb => { cb.checked = !allChecked; cb.indeterminate = false; });
    syncSelection();
  }

  function syncSelection() {
    selectedResources.clear();
    document.querySelectorAll('.resource-checkbox').forEach(cb => { if (cb.checked) selectedResources.add(cb.value); });
    updateGroupCheckboxes();
    updateSelectionUI();
    renderConfigSections();
  }

  function updateGroupCheckboxes() {
    document.querySelectorAll('.group-checkbox').forEach(cb => {
      const group = cb.dataset.group;
      const provider = PROVIDERS[activeProvider];
      const resources = provider.groups[group].resources;
      const checked = resources.filter(r => { const el = document.querySelector(`.resource-checkbox[value="${r}"]`); return el && el.checked; }).length;
      cb.checked = checked === resources.length;
      cb.indeterminate = checked > 0 && checked < resources.length;
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
  // CONFIG FORMS
  // ============================================================
  function renderConfigSections() {
    const container = els.configSections;
    container.innerHTML = '';
    container.appendChild(els.configPlaceholder);

    const provider = PROVIDERS[activeProvider];
    const groupsWithSelections = {};
    for (const resKey of selectedResources) {
      const def = provider.resources[resKey];
      if (!def) continue;
      if (!groupsWithSelections[def.group]) groupsWithSelections[def.group] = [];
      groupsWithSelections[def.group].push(resKey);
    }

    for (const [groupId, resources] of Object.entries(groupsWithSelections)) {
      const groupMeta = provider.groups[groupId];
      const section = document.createElement('div');
      section.className = 'config-section';
      section.innerHTML = `<div class="config-section-header"><h3><i class="${groupMeta.icon}"></i> ${groupMeta.label}</h3><span class="section-resource-count">${resources.length} resource${resources.length>1?'s':''}</span></div>`;

      const grid = document.createElement('div');
      grid.className = 'config-grid';

      for (const resKey of resources) {
        const def = provider.resources[resKey];
        grid.innerHTML += `<div class="config-resource-header"><h4>${def.label}</h4></div>`;
        for (const field of def.fields) {
          grid.appendChild(createField(resKey, field));
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
      input.value = configValues[activeProvider][resourceKey][field.key] || '';
      if (field.type === 'textarea') { input.rows = 3; input.style.fontFamily = 'monospace'; input.style.fontSize = '0.8rem'; }
      input.addEventListener('input', () => { configValues[activeProvider][resourceKey][field.key] = input.value; });
      wrapper.appendChild(input);
    } else if (field.type === 'checkbox') {
      const cw = document.createElement('div');
      cw.className = 'config-field-checkbox';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = configValues[activeProvider][resourceKey][field.key];
      const sp = document.createElement('span');
      sp.textContent = input.checked ? 'Enabled' : 'Disabled';
      input.addEventListener('change', () => { configValues[activeProvider][resourceKey][field.key] = input.checked; sp.textContent = input.checked ? 'Enabled' : 'Disabled'; });
      cw.appendChild(input);
      cw.appendChild(sp);
      wrapper.appendChild(cw);
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      for (const opt of field.options) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (opt === configValues[activeProvider][resourceKey][field.key]) o.selected = true;
        select.appendChild(o);
      }
      select.addEventListener('change', () => { configValues[activeProvider][resourceKey][field.key] = select.value; });
      wrapper.appendChild(select);
    }

    if (field.desc) { const sm = document.createElement('small'); sm.textContent = field.desc; wrapper.appendChild(sm); }
    return wrapper;
  }

  // ============================================================
  // GENERATION
  // ============================================================
  function handleGenerate() {
    const mode = document.querySelector('input[name="output-mode"]:checked').value;
    const provider = PROVIDERS[activeProvider];
    generatedFiles = mode === 'modular' ? generateModular(provider) : generateSingle(provider);
    showToast(`Generated ${Object.keys(generatedFiles).length} files successfully!`);
  }

  function generateSingle(provider) {
    const files = {};
    files['provider.tf'] = provider.providerBlock();
    files['backend.tf'] = provider.providerConfig(provider.regionVar.name);
    files['variables.tf'] = generateVariables(provider);
    files['outputs.tf'] = generateOutputs(provider);
    files['main.tf'] = generateMainTf(provider);
    return files;
  }

  function generateModular(provider) {
    const files = {};
    files['provider.tf'] = provider.providerBlock();
    files['backend.tf'] = provider.providerConfig(provider.regionVar.name);
    files['variables.tf'] = generateRootVariables(provider);
    files['outputs.tf'] = generateRootOutputs(provider);
    files['main.tf'] = generateRootMainTf(provider);

    const groupModules = {};
    for (const resKey of selectedResources) {
      const def = provider.resources[resKey];
      if (!groupModules[def.group]) groupModules[def.group] = [];
      groupModules[def.group].push(resKey);
    }
    for (const [groupId, resources] of Object.entries(groupModules)) {
      const p = `modules/${groupId}/`;
      files[p+'main.tf'] = generateModuleMain(provider, groupId, resources);
      files[p+'variables.tf'] = generateModuleVariables(provider, groupId, resources);
      files[p+'outputs.tf'] = generateModuleOutputs(provider, groupId, resources);
    }
    return files;
  }

  function generateVariables(provider) {
    let vars = [`variable "${provider.regionVar.name}" {\n  description = "${provider.regionVar.label}"\n  type        = string\n  default     = "${provider.regionVar.default}"\n}`, `variable "project_name" {\n  description = "Project name"\n  type        = string\n  default     = "myproject"\n}`, `variable "environment" {\n  description = "Environment name"\n  type        = string\n  default     = "dev"\n}`];
    if (activeProvider === 'gcp') vars.push(`variable "gcp_project_id" {\n  description = "GCP Project ID"\n  type        = string\n}`);
    if (activeProvider === 'azure') vars.push(`variable "azure_subscription_id" {\n  description = "Azure Subscription ID"\n  type        = string\n}\n\nvariable "azure_tenant_id" {\n  description = "Azure Tenant ID"\n  type        = string\n}`);
    for (const resKey of selectedResources) {
      const def = provider.resources[resKey];
      if (def.variables) vars.push(def.variables());
    }
    return vars.join('\n\n');
  }

  function generateOutputs(provider) {
    let outs = [];
    for (const resKey of selectedResources) {
      const def = provider.resources[resKey];
      if (def.outputs) outs.push(def.outputs());
    }
    return outs.join('\n\n');
  }

  function generateMainTf(provider) {
    let parts = [];
    for (const resKey of selectedResources) {
      const def = provider.resources[resKey];
      parts.push(def.generate(configValues[activeProvider][resKey]));
    }
    return parts.join('\n\n');
  }

  function generateRootVariables(provider) {
    let vars = [`variable "${provider.regionVar.name}" {\n  description = "${provider.regionVar.label}"\n  type        = string\n  default     = "${provider.regionVar.default}"\n}`, `variable "project_name" {\n  description = "Project name"\n  type        = string\n  default     = "myproject"\n}`, `variable "environment" {\n  description = "Environment"\n  type        = string\n  default     = "dev"\n}`];
    if (activeProvider === 'gcp') vars.push(`variable "gcp_project_id" {\n  description = "GCP Project ID"\n  type        = string\n}`);
    if (activeProvider === 'azure') vars.push(`variable "azure_subscription_id" {\n  type = string\n}\n\nvariable "azure_tenant_id" {\n  type = string\n}`);
    return vars.join('\n\n');
  }

  function generateRootOutputs(provider) {
    let outs = [`output "${provider.regionVar.name}" {\n  value = var.${provider.regionVar.name}\n}`];
    for (const resKey of selectedResources) {
      const def = provider.resources[resKey];
      if (def.outputs) outs.push(def.outputs());
    }
    return outs.join('\n\n');
  }

  function generateRootMainTf(provider) {
    const groupModules = {};
    for (const resKey of selectedResources) {
      const def = provider.resources[resKey];
      if (!groupModules[def.group]) groupModules[def.group] = [];
      groupModules[def.group].push(resKey);
    }
    let parts = [];
    for (const groupId of Object.keys(groupModules)) {
      parts.push(`module "${groupId}" {\n  source = "./modules/${groupId}"\n\n  project_name = var.project_name\n  environment  = var.environment\n}`);
    }
    return parts.join('\n\n');
  }

  function generateModuleMain(provider, groupId, resources) {
    let parts = [];
    for (const resKey of resources) {
      const def = provider.resources[resKey];
      parts.push(def.generate(configValues[activeProvider][resKey]));
    }
    return parts.join('\n\n');
  }

  function generateModuleVariables(provider, groupId, resources) {
    let vars = [`variable "project_name" {\n  type = string\n}`, `variable "environment" {\n  type = string\n}`];
    for (const resKey of resources) {
      const def = provider.resources[resKey];
      if (def.variables) vars.push(def.variables());
    }
    return vars.join('\n\n');
  }

  function generateModuleOutputs(provider, groupId, resources) {
    let outs = [];
    for (const resKey of resources) {
      const def = provider.resources[resKey];
      if (def.outputs) outs.push(def.outputs());
    }
    return outs.join('\n\n');
  }

  // ============================================================
  // MODAL
  // ============================================================
  function handlePreview() { handleGenerate(); openModal(); }
  function openModal() {
    if (!Object.keys(generatedFiles).length) return;
    els.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderModalTabs();
  }
  function closeModal() { els.modalOverlay.classList.remove('open'); document.body.style.overflow = ''; }

  function renderModalTabs() {
    const fileNames = Object.keys(generatedFiles);
    els.modalTabs.innerHTML = '';
    els.modalTabPanels.innerHTML = '';
    els.modalEmpty.style.display = 'none';
    els.modalTabPanels.style.display = 'block';

    fileNames.forEach((name, i) => {
      const tab = document.createElement('button');
      tab.className = 'modal-tab' + (i === 0 ? ' active' : '');
      tab.textContent = name;
      tab.addEventListener('click', () => switchTab(i));
      els.modalTabs.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'modal-tab-panel' + (i === 0 ? ' active' : '');
      panel.innerHTML = `<pre><code>${escapeHtml(generatedFiles[name])}</code></pre>`;
      els.modalTabPanels.appendChild(panel);
    });

    const totalSize = new Blob(Object.values(generatedFiles)).size;
    els.modalStats.textContent = `${fileNames.length} files | ${(totalSize/1024).toFixed(1)} KB`;
  }

  function switchTab(index) {
    els.modalTabs.querySelectorAll('.modal-tab').forEach((t, i) => t.classList.toggle('active', i === index));
    els.modalTabPanels.querySelectorAll('.modal-tab-panel').forEach((p, i) => p.classList.toggle('active', i === index));
  }

  function escapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ============================================================
  // COPY & DOWNLOAD
  // ============================================================
  function handleCopyAll() {
    const all = Object.entries(generatedFiles).map(([n,c]) => `# ============================================\n# File: ${n}\n# ============================================\n\n${c}`).join('\n\n\n');
    navigator.clipboard.writeText(all).then(() => {
      els.copyAllBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => { els.copyAllBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy All'; }, 2000);
    }).catch(() => {
      const ta = document.createElement('textarea'); ta.value = all; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      els.copyAllBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => { els.copyAllBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy All'; }, 2000);
    });
  }

  function handleDownloadZip() {
    if (!Object.keys(generatedFiles).length) handleGenerate();
    const zip = new JSZip();
    for (const [name, content] of Object.entries(generatedFiles)) zip.file(name, content);
    zip.generateAsync({ type: 'blob' }).then(blob => { saveAs(blob, `terraform-${activeProvider}-infrastructure.zip`); });
  }

  function showToast(message) {
    const existing = document.querySelector('.tf-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'tf-toast';
    toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
  }
})();
