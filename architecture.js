/* =============================================
   ARCHITECTURE LAB — MAIN LOGIC
   ============================================= */
(function () {
  'use strict';

  /* =============================================
     DATA: ARCHITECTURES
     ============================================= */
  const ARCHITECTURES = {
    'web-app': {
      name: 'Production Web Application',
      services: [
        { id: 'route53', name: 'Route 53', type: 'DNS Management', x: 380, y: 30, w: 140, h: 44, icon: '\uf0ac', color: '#844fba',
          purpose: 'DNS routing with health-based failover and latency-based routing.',
          whenToUse: 'Multi-region apps, health-based failover, latency routing, domain registration.',
          whenNotToUse: 'Simple single-region apps with low traffic; use /etc/hosts or ALB DNS.',
          mistakes: ['No health checks configured', 'TTL too high (delays failover)', 'Not using weighted routing for canary deploys'],
          failure: 'Complete DNS resolution failure. All users unable to reach the application.',
          cost: '$0.50/zone/month + $0.40/M queries' },
        { id: 'cloudfront', name: 'CloudFront', type: 'CDN & Edge Caching', x: 380, y: 110, w: 140, h: 44, icon: '\uf0ed', color: '#844fba',
          purpose: 'Global CDN for static asset delivery, SSL termination, and DDoS protection.',
          whenToUse: 'Static sites, API acceleration, streaming, custom SSL, DDoS protection.',
          whenNotToUse: 'Purely dynamic APIs with no caching; small user-base single-region apps.',
          mistakes: ['Not invalidating cache on deploy', 'Missing origin access identity', 'No cache policy defined'],
          failure: 'Users served stale content or connection errors. Origin server exposed.',
          cost: '$0.085/GB (first 10TB)' },
        { id: 'alb', name: 'Application Load Balancer', type: 'Layer 7 Load Balancer', x: 380, y: 190, w: 140, h: 44, icon: '\uf074', color: '#38bdf8',
          purpose: 'Traffic distribution, SSL termination, path-based routing, and health checks.',
          whenToUse: 'Multi-target routing, WebSocket support, gRPC, container workloads, HTTP/HTTPS.',
          whenNotToUse: 'Non-HTTP protocols (use NLB), extreme low-latency (use NLB), static IP requirement.',
          mistakes: ['Health check path misconfigured', 'No cross-zone load balancing', 'Sticky sessions causing imbalance'],
          failure: 'All traffic to downstream targets is disrupted. 5xx errors for all users.',
          cost: '$0.0225/hour + LCU charges' },
        { id: 'ecs', name: 'ECS Fargate', type: 'Container Orchestration', x: 380, y: 270, w: 140, h: 44, icon: '\uf1b3', color: '#38bdf8',
          purpose: 'Serverless container orchestration. Run Docker containers without managing servers.',
          whenToUse: 'Microservices, variable workloads, team wants serverless containers, quick scaling.',
          whenNotToUse: 'GPU workloads, tight cost budgets (EC2 cheaper at steady state), need daemon sets.',
          mistakes: ['No task-level IAM roles', 'Missing health check grace period', 'Over-provisioned CPU/memory'],
          failure: 'Application containers stop responding. No new tasks can be scheduled.',
          cost: '$0.04048/vCPU/hour + $0.004445/GB/hour' },
        { id: 'rds', name: 'RDS MySQL', type: 'Managed Relational Database', x: 230, y: 350, w: 140, h: 44, icon: '\uf1c0', color: '#10b981',
          purpose: 'Managed relational database with automated backups, patching, and Multi-AZ failover.',
          whenToUse: 'Relational data, ACID transactions, complex queries, managed operations.',
          whenNotToUse: 'NoSQL workloads (use DynamoDB), extreme write throughput, key-value patterns.',
          mistakes: ['Single-AZ deployment', 'No automated backups', 'Publicly accessible endpoint', 'No parameter group tuning'],
          failure: 'All database-dependent features fail. Application returns errors for any data operation.',
          cost: '$0.017/hour (db.t3.micro) to $0.684/hour (db.r5.4xlarge)' },
        { id: 's3', name: 'S3', type: 'Object Storage', x: 530, y: 350, w: 140, h: 44, icon: '\uf187', color: '#10b981',
          purpose: 'Durable object storage for static assets, backups, logs, and data lake.',
          whenToUse: 'Static assets, backups, data lake, log archival, any unstructured data.',
          whenNotToUse: 'Frequent small reads with low latency (use EFS or ElastiCache), block storage (use EBS).',
          mistakes: ['Public bucket policy', 'No versioning enabled', 'No lifecycle rules for cost optimization'],
          failure: 'Static assets unavailable. Backup data inaccessible. Logs lost.',
          cost: '$0.023/GB (first 50TB)' },
        { id: 'ecr', name: 'ECR', type: 'Container Registry', x: 530, y: 270, w: 140, h: 44, icon: '\uf1b2', color: '#38bdf8',
          purpose: 'Managed Docker container registry. Stores and serves container images.',
          whenToUse: 'Storing Docker images for ECS/EKS, image scanning, lifecycle policies.',
          whenNotToUse: 'Generic file storage (use S3), non-container artifacts.',
          mistakes: ['No image scanning enabled', 'No lifecycle policies (cost bloat)', 'Public access without need'],
          failure: 'Cannot pull new images. Deployments fail. Rollbacks impossible.',
          cost: '$0.10/GB/month (storage) + data transfer' },
      ],
      connections: [
        { from: 'route53', to: 'cloudfront' },
        { from: 'cloudfront', to: 'alb' },
        { from: 'alb', to: 'ecs' },
        { from: 'ecs', to: 'rds' },
        { from: 'ecs', to: 's3' },
        { from: 'ecs', to: 'ecr' },
      ]
    },
    'container-platform': {
      name: 'Container Platform (EKS)',
      services: [
        { id: 'route53', name: 'Route 53', type: 'DNS', x: 380, y: 30, w: 140, h: 44, icon: '\uf0ac', color: '#844fba',
          purpose: 'DNS routing for the Kubernetes cluster endpoints.', whenToUse: 'Multi-cluster routing.', whenNotToUse: 'Single cluster.', mistakes: ['No health checks'], failure: 'DNS failure.', cost: '$0.50/zone' },
        { id: 'alb', name: 'ALB / Ingress', type: 'Load Balancer', x: 380, y: 110, w: 140, h: 44, icon: '\uf074', color: '#38bdf8',
          purpose: 'Kubernetes Ingress controller backed by AWS ALB.', whenToUse: 'HTTP routing to K8s services.', whenNotToUse: 'TCP/UDP workloads.', mistakes: ['No WAF integration'], failure: 'Ingress traffic drops.', cost: '$0.0225/hr' },
        { id: 'eks', name: 'EKS Cluster', type: 'Managed Kubernetes', x: 380, y: 190, w: 140, h: 44, icon: '\uf0c2', color: '#326ce6',
          purpose: 'Managed Kubernetes control plane with automatic upgrades.', whenToUse: 'Production K8s, team wants managed control plane.', whenNotToUse: 'Small workloads (use ECS Fargate).', mistakes: ['No pod disruption budgets', 'Missing resource quotas'], failure: 'No new pods scheduled. Existing pods continue running.', cost: '$0.10/hr' },
        { id: 'ec2-nodes', name: 'EC2 Node Group', type: 'Worker Nodes', x: 380, y: 270, w: 140, h: 44, icon: '\uf233', color: '#38bdf8',
          purpose: 'EC2 instances running as Kubernetes worker nodes.', whenToUse: 'Need full node control, GPU, or daemon sets.', whenNotToUse: 'Serverless containers (use Fargate profiles).', mistakes: ['No auto-scaling', 'Same instance type for all workloads'], failure: 'Pods evicted. Workloads disrupted.', cost: 'Variable by instance type' },
        { id: 'ecr', name: 'ECR', type: 'Container Registry', x: 530, y: 190, w: 140, h: 44, icon: '\uf1b2', color: '#38bdf8',
          purpose: 'Store container images for K8s deployments.', whenToUse: 'Any container workload.', whenNotToUse: 'Non-container artifacts.', mistakes: ['No image scanning'], failure: 'Deployments fail.', cost: '$0.10/GB' },
        { id: 'rds', name: 'RDS', type: 'Database', x: 230, y: 270, w: 140, h: 44, icon: '\uf1c0', color: '#10b981',
          purpose: 'Persistent database for containerized applications.', whenToUse: 'Relational data.', whenNotToUse: 'NoSQL.', mistakes: ['Single-AZ'], failure: 'Data layer fails.', cost: 'Variable' },
      ],
      connections: [
        { from: 'route53', to: 'alb' },
        { from: 'alb', to: 'eks' },
        { from: 'eks', to: 'ec2-nodes' },
        { from: 'eks', to: 'ecr' },
        { from: 'ec2-nodes', to: 'rds' },
      ]
    },
    'serverless': {
      name: 'Serverless API',
      services: [
        { id: 'route53', name: 'Route 53', type: 'DNS', x: 380, y: 30, w: 140, h: 44, icon: '\uf0ac', color: '#844fba',
          purpose: 'DNS for the API domain.', whenToUse: 'Custom domain routing.', whenNotToUse: 'Default API Gateway URL.', mistakes: ['No health checks'], failure: 'DNS failure.', cost: '$0.50/zone' },
        { id: 'apigw', name: 'API Gateway', type: 'Managed API', x: 380, y: 110, w: 140, h: 44, icon: '\uf0e8', color: '#ff9900',
          purpose: 'Managed REST/HTTP API with throttling, auth, and request validation.', whenToUse: 'REST APIs, WebSocket, throttling, API keys.', whenNotToUse: 'Internal service mesh (use App Mesh), gRPC (use ALB).', mistakes: ['No throttling', 'Missing WAF', 'No caching'], failure: 'All API requests fail.', cost: '$3.50/million requests' },
        { id: 'lambda', name: 'Lambda', type: 'Serverless Compute', x: 380, y: 190, w: 140, h: 44, icon: '\uf3d5', color: '#ff9900',
          purpose: 'Run code without servers. Automatic scaling to zero.', whenToUse: 'Event-driven, APIs, data processing, cron jobs.', whenNotToUse: 'Long-running (>15min), stateful, GPU.', mistakes: ['No reserved concurrency', 'Missing dead-letter queue', 'Too much in /tmp'], failure: 'Function invocations fail. No fallback.', cost: '$0.0000166667/GB-s' },
        { id: 'dynamodb', name: 'DynamoDB', type: 'NoSQL Database', x: 230, y: 270, w: 140, h: 44, icon: '\uf270', color: '#10b981',
          purpose: 'Fully managed NoSQL with single-digit ms latency.', whenToUse: 'Key-value, gaming, IoT, session data.', whenNotToUse: 'Complex joins, relational data, ad-hoc queries.', mistakes: ['No on-demand for spiky workloads', 'Missing GSI', 'No point-in-time recovery'], failure: 'Data operations fail.', cost: '$1.25/million write request units' },
        { id: 's3', name: 'S3', type: 'Object Storage', x: 530, y: 270, w: 140, h: 44, icon: '\uf187', color: '#10b981',
          purpose: 'Static assets and Lambda deployment packages.', whenToUse: 'Any file storage.', whenNotToUse: 'Block storage.', mistakes: ['Public buckets'], failure: 'Assets unavailable.', cost: '$0.023/GB' },
      ],
      connections: [
        { from: 'route53', to: 'apigw' },
        { from: 'apigw', to: 'lambda' },
        { from: 'lambda', to: 'dynamodb' },
        { from: 'lambda', to: 's3' },
      ]
    },
    'multi-region': {
      name: 'Multi-Region DR Architecture',
      services: [
        { id: 'route53', name: 'Route 53', type: 'DNS Failover', x: 380, y: 30, w: 140, h: 44, icon: '\uf0ac', color: '#844fba',
          purpose: 'DNS failover between primary and secondary regions.', whenToUse: 'Multi-region DR.', whenNotToUse: 'Single-region.', mistakes: ['No health checks'], failure: 'No failover possible.', cost: '$0.50/zone' },
        { id: 'cf-primary', name: 'CloudFront (Primary)', type: 'CDN - Region A', x: 230, y: 120, w: 160, h: 44, icon: '\uf0ed', color: '#38bdf8',
          purpose: 'Edge caching for primary region.', whenToUse: 'Global users.', whenNotToUse: 'Single region.', mistakes: ['No OAI'], failure: 'Stale content.', cost: '$0.085/GB' },
        { id: 'cf-secondary', name: 'CloudFront (Secondary)', type: 'CDN - Region B', x: 530, y: 120, w: 160, h: 44, icon: '\uf0ed', color: '#38bdf8',
          purpose: 'Edge caching for DR region.', whenToUse: 'DR region.', whenNotToUse: 'Single region.', mistakes: ['No OAI'], failure: 'Stale content.', cost: '$0.085/GB' },
        { id: 'ecs-primary', name: 'ECS (Primary)', type: 'Compute - Region A', x: 230, y: 210, w: 160, h: 44, icon: '\uf1b3', color: '#38bdf8',
          purpose: 'Application compute in primary region.', whenToUse: 'Primary workloads.', whenNotToUse: 'DR only.', mistakes: ['No health checks'], failure: 'Primary app down.', cost: '$0.04/vCPU-hr' },
        { id: 'ecs-secondary', name: 'ECS (Secondary)', type: 'Compute - Region B', x: 530, y: 210, w: 160, h: 44, icon: '\uf1b3', color: '#38bdf8',
          purpose: 'Standby compute in DR region.', whenToUse: 'DR failover.', whenNotToUse: 'Single region.', mistakes: ['No scaling'], failure: 'DR region unavailable.', cost: '$0.04/vCPU-hr' },
        { id: 'rds-primary', name: 'RDS Primary', type: 'Database - Region A', x: 230, y: 300, w: 160, h: 44, icon: '\uf1c0', color: '#10b981',
          purpose: 'Primary database with cross-region read replica.', whenToUse: 'Relational DR.', whenNotToUse: 'NoSQL.', mistakes: ['No cross-region replica'], failure: 'Data loss risk.', cost: 'Variable' },
        { id: 'rds-secondary', name: 'RDS Replica', type: 'Database - Region B', x: 530, y: 300, w: 160, h: 44, icon: '\uf1c0', color: '#10b981',
          purpose: 'Cross-region read replica for failover.', whenToUse: 'DR.', whenNotToUse: 'Single region.', mistakes: ['Replication lag too high'], failure: 'Data loss on failover.', cost: 'Variable' },
      ],
      connections: [
        { from: 'route53', to: 'cf-primary' },
        { from: 'route53', to: 'cf-secondary' },
        { from: 'cf-primary', to: 'ecs-primary' },
        { from: 'cf-secondary', to: 'ecs-secondary' },
        { from: 'ecs-primary', to: 'rds-primary' },
        { from: 'ecs-secondary', to: 'rds-secondary' },
        { from: 'rds-primary', to: 'rds-secondary', label: 'replication' },
      ]
    }
  };

  /* =============================================
     DATA: FAILURE SCENARIOS
     ============================================= */
  const SCENARIOS = [
    { id: 'az-failure', name: 'AZ Failure', icon: '\uf0e7', impact: 'HIGH',
      desc: 'An entire Availability Zone becomes unavailable.',
      propagation: [
        { name: 'RDS Primary', status: 'failed', reason: 'If deployed in failed AZ' },
        { name: 'ECS Tasks (AZ-A)', status: 'failed', reason: 'Tasks in failed AZ are terminated' },
        { name: 'ALB', status: 'degraded', reason: 'Health checks fail for AZ-A targets' },
        { name: 'ECS Tasks (AZ-B)', status: 'healthy', reason: 'Healthy, receiving more traffic' },
        { name: 'RDS Standby', status: 'healthy', reason: 'Promoted to primary (Multi-AZ)' },
      ],
      recovery: 'RDS Multi-AZ promotes standby automatically (60-120s). ALB drains failed targets and reroutes to healthy AZ. ECS reschedules tasks in healthy AZ.',
      mitigation: 'Deploy across multiple AZs. Enable Multi-AZ RDS. Use ALB for automatic failover. Configure pod disruption budgets.' },
    { id: 'rds-failure', name: 'RDS Failure', icon: '\uf1c0', impact: 'CRITICAL',
      desc: 'Primary database instance fails or becomes unresponsive.',
      propagation: [
        { name: 'RDS Primary', status: 'failed', reason: 'Instance failure or crash' },
        { name: 'ECS Application', status: 'degraded', reason: 'Database queries fail, 5xx errors' },
        { name: 'ALB', status: 'degraded', reason: 'Receiving 503 from application' },
        { name: 'CloudFront', status: 'degraded', reason: 'Origin returning errors' },
        { name: 'Users', status: 'failed', reason: 'Application unavailable' },
      ],
      recovery: 'Multi-AZ automatic failover (60-120s). Application reconnects to new endpoint. Automated backups allow point-in-time recovery if needed.',
      mitigation: 'Enable Multi-AZ RDS. Use read replicas for read-heavy workloads. Implement connection retry logic. Set up automated backups with retention.' },
    { id: 'dns-failure', name: 'DNS Failure', icon: '\uf0ac', impact: 'CRITICAL',
      desc: 'Route 53 or DNS resolution fails.',
      propagation: [
        { name: 'Route 53', status: 'failed', reason: 'DNS resolution failure' },
        { name: 'CloudFront', status: 'healthy', reason: 'Running but unreachable' },
        { name: 'ALB', status: 'healthy', reason: 'Running but unreachable' },
        { name: 'ECS', status: 'healthy', reason: 'Running but unreachable' },
        { name: 'Users', status: 'failed', reason: 'Cannot resolve domain name' },
      ],
      recovery: 'Route 53 is a managed service with built-in redundancy. If using health checks, Route 53 automatically routes to healthy endpoints. DNS propagation may take TTL duration.',
      mitigation: 'Use Route 53 health checks. Set low TTLs (60s). Use multiple DNS providers as backup. Monitor DNS resolution.' },
    { id: 'region-failure', name: 'Region Failure', icon: '\uf0e7', impact: 'CRITICAL',
      desc: 'Entire AWS region becomes unavailable.',
      propagation: [
        { name: 'All Primary Resources', status: 'failed', reason: 'Region-wide outage' },
        { name: 'CloudFront (Secondary)', status: 'healthy', reason: 'Serves cached content from DR region' },
        { name: 'ECS (Secondary)', status: 'degraded', reason: 'May need manual activation' },
        { name: 'RDS Replica (Secondary)', status: 'healthy', reason: 'Promoted to primary' },
        { name: 'Route 53', status: 'degraded', reason: 'Health checks trigger failover' },
      ],
      recovery: 'Route 53 health checks detect failure and redirect to secondary region. Cross-region RDS replica promoted. ECS services started in DR region. Full recovery in 15-45 minutes.',
      mitigation: 'Implement multi-region architecture. Use Route 53 failover routing. Maintain warm standby in DR region. Test failover regularly.' },
    { id: 'cert-expiry', name: 'Certificate Expiration', icon: '\uf0e3', impact: 'HIGH',
      desc: 'SSL/TLS certificate expires, causing connection errors.',
      propagation: [
        { name: 'ALB / CloudFront', status: 'failed', reason: 'Cannot establish TLS handshake' },
        { name: 'Users', status: 'failed', reason: 'Browser shows security warning' },
        { name: 'API Integrations', status: 'failed', reason: 'SSL verification fails' },
      ],
      recovery: 'Request new certificate from ACM. Update listeners. ACM auto-renews if DNS validation is configured.',
      mitigation: 'Use AWS Certificate Manager with auto-renewal. Set up monitoring for certificate expiry. Use DNS validation for auto-renewal.' },
    { id: 'quota-exhaustion', name: 'Quota Exhaustion', icon: '\uf135', impact: 'MEDIUM',
      desc: 'AWS service quota limit reached (EC2 instances, Lambda concurrency, etc.).',
      propagation: [
        { name: 'Auto Scaling', status: 'failed', reason: 'Cannot launch new instances' },
        { name: 'ECS', status: 'degraded', reason: 'Cannot schedule new tasks' },
        { name: 'Lambda', status: 'degraded', reason: 'Throttled at concurrency limit' },
      ],
      recovery: 'Request quota increase via AWS Support. Monitor CloudWatch for quota metrics.',
      mitigation: 'Monitor CloudWatch quota metrics. Set up alerts. Request increases proactively. Use reserved capacity.' },
    { id: 'network-failure', name: 'Network Failure', icon: '\uf0ec', impact: 'HIGH',
      desc: 'NAT Gateway or VPC connectivity issue.',
      propagation: [
        { name: 'NAT Gateway', status: 'failed', reason: 'Network path disrupted' },
        { name: 'Private Subnet Tasks', status: 'degraded', reason: 'Cannot reach internet' },
        { name: 'Package Downloads', status: 'failed', reason: 'npm/pip fails' },
        { name: 'External APIs', status: 'failed', reason: 'Cannot reach third parties' },
        { name: 'CloudWatch Agent', status: 'degraded', reason: 'Cannot send metrics' },
      ],
      recovery: 'Check NAT Gateway health. Verify route tables. Check network ACLs. May need to recreate NAT Gateway.',
      mitigation: 'Use NAT Gateway in multiple AZs. Monitor NAT Gateway metrics. Set up VPC Flow Logs.' },
    { id: 'cache-failure', name: 'Cache Failure', icon: '\uf1c0', impact: 'MEDIUM',
      desc: 'ElastiCache or CloudFront cache failure.',
      propagation: [
        { name: 'Cache Layer', status: 'failed', reason: 'Cache node failure' },
        { name: 'Database', status: 'degraded', reason: 'Increased load from cache miss' },
        { name: 'Application', status: 'degraded', reason: 'Higher latency from DB queries' },
      ],
      recovery: 'ElastiCache automatic failover for cluster mode. CloudFront continues serving from origin.',
      mitigation: 'Use ElastiCache with Multi-AZ. Implement cache warming. Set up CloudFront origin failover.' },
  ];

  /* =============================================
     DATA: BUTTERFLY EFFECTS
     ============================================= */
  const BUTTERFLY_EFFECTS = {
    'remove-nat': {
      name: 'Remove NAT Gateway',
      nodes: [
        { icon: '\uf0e7', name: 'NAT Gateway', reason: 'Removed from architecture', type: 'root' },
        { icon: '\uf1b3', name: 'ECS Tasks', reason: 'Cannot pull images from external registries', type: 'affected' },
        { icon: '\uf3d5', name: 'Package Downloads', reason: 'npm install / pip install fails — no internet', type: 'affected' },
        { icon: '\uf0e8', name: 'External APIs', reason: 'Webhook calls, third-party integrations blocked', type: 'affected' },
        { icon: '\uf21b', name: 'Monitoring Agent', reason: 'Cannot send metrics to CloudWatch or external services', type: 'affected' },
        { icon: '\uf135', name: 'Secrets Manager', reason: 'Cannot fetch secrets at runtime from AWS API', type: 'affected' },
      ]
    },
    'ecs-to-lambda': {
      name: 'ECS to Lambda Migration',
      nodes: [
        { icon: '\uf1b3', name: 'Compute Layer', reason: 'Containers replaced by functions — stateless execution model', type: 'root' },
        { icon: '\uf126', name: 'Deployment', reason: 'K8s manifests replaced by SAM/CDK Lambda definitions', type: 'affected' },
        { icon: '\uf0ec', name: 'Networking', reason: 'No more VPC placement for containers — Lambda uses ENI', type: 'affected' },
        { icon: '\uf085', name: 'IAM Model', reason: 'Execution roles replace instance roles — per-function granularity', type: 'affected' },
        { icon: '\uf201', name: 'Observability', reason: 'CloudWatch Container Insights replaced by X-Ray tracing', type: 'affected' },
        { icon: '\uf3d1', name: 'Cost Model', reason: 'Pay-per-invocation vs always-on — cheaper at low scale, expensive at high scale', type: 'affected' },
        { icon: '\uf0e8', name: 'Scaling', reason: 'Auto-scaling groups replaced by concurrency limits per function', type: 'affected' },
      ]
    },
    'add-cdn': {
      name: 'Add CloudFront CDN',
      nodes: [
        { icon: '\uf0ed', name: 'CloudFront', reason: 'Added as edge caching and SSL termination layer', type: 'root' },
        { icon: '\uf3c0', name: 'Origin Server', reason: 'Reduced load — cached responses served from edge', type: 'affected' },
        { icon: '\uf0e7', name: 'Latency', reason: 'Improved — content served from nearest edge location', type: 'affected' },
        { icon: '\uf132', name: 'Security', reason: 'DDoS protection via AWS Shield Standard included', type: 'affected' },
        { icon: '\uf3d1', name: 'Cost', reason: 'Additional CloudFront charges but reduced origin costs', type: 'affected' },
        { icon: '\uf0e3', name: 'SSL', reason: 'Free SSL certificates via ACM for custom domains', type: 'affected' },
      ]
    },
    'single-to-multi-az': {
      name: 'Single-AZ to Multi-AZ',
      nodes: [
        { icon: '\uf272', name: 'Availability', reason: 'Architecture now survives single AZ failure', type: 'root' },
        { icon: '\uf1c0', name: 'RDS', reason: 'Multi-AZ standby provides automatic failover (60-120s)', type: 'affected' },
        { icon: '\uf1b3', name: 'ECS', reason: 'Tasks distributed across AZs — PDB ensures availability', type: 'affected' },
        { icon: '\uf074', name: 'ALB', reason: 'Cross-zone load balancing distributes across all AZ targets', type: 'affected' },
        { icon: '\uf3d1', name: 'Cost', reason: '~2x cost for redundant resources across AZs', type: 'affected' },
        { icon: '\uf0e8', name: 'Complexity', reason: 'Subnet planning, route tables, security groups per AZ', type: 'affected' },
      ]
    }
  };

  /* =============================================
     DATA: CRASH TESTS
     ============================================= */
  const CRASH_TESTS = {
    'az-failure': {
      name: 'AZ Failure',
      affected: [
        { name: 'ECS (AZ-A)', status: 'failed', icon: '\uf057' },
        { name: 'RDS Primary', status: 'failed', icon: '\uf057', note: 'if in failed AZ' },
        { name: 'ALB', status: 'degraded', icon: '\uf0e7' },
        { name: 'ECS (AZ-B)', status: 'healthy', icon: '\uf00c' },
        { name: 'RDS Standby', status: 'healthy', icon: '\uf00c', note: 'promoted' },
      ],
      steps: ['Detect AZ degradation via EC2 health checks', 'ALB marks AZ-A targets unhealthy', 'RDS Multi-AZ promotes standby (60-120s)', 'ECS reschedules tasks to AZ-B', 'ALB routes all traffic to AZ-B', 'Health checks pass — recovery complete'],
      mitigation: 'Multi-AZ deployment, pod disruption budgets, automated failover.'
    },
    'db-failure': {
      name: 'Database Failure',
      affected: [
        { name: 'RDS Primary', status: 'failed', icon: '\uf057' },
        { name: 'ECS App', status: 'degraded', icon: '\uf0e7', note: '5xx errors' },
        { name: 'ALB', status: 'degraded', icon: '\uf0e7' },
        { name: 'Users', status: 'failed', icon: '\uf057' },
      ],
      steps: ['Detect RDS failure via CloudWatch alarm', 'RDS Multi-AZ promotes standby', 'Application reconnects to new endpoint', 'Connection pool refreshes', 'Health checks pass — recovery complete'],
      mitigation: 'Multi-AZ RDS, connection retry logic, circuit breaker pattern.'
    },
    'dns-failure': {
      name: 'DNS Failure',
      affected: [
        { name: 'Route 53', status: 'failed', icon: '\uf057' },
        { name: 'All Services', status: 'healthy', icon: '\uf00c', note: 'but unreachable' },
        { name: 'Users', status: 'failed', icon: '\uf057', note: 'cannot resolve' },
      ],
      steps: ['DNS resolution fails for all clients', 'Route 53 health checks detect failure', 'If using failover, backup DNS activates', 'DNS propagation completes (TTL dependent)', 'Users regain access via resolved IP'],
      mitigation: 'Low TTLs, Route 53 health checks, backup DNS provider.'
    },
    'region-failure': {
      name: 'Region Failure',
      affected: [
        { name: 'Primary Region', status: 'failed', icon: '\uf057' },
        { name: 'DR Region', status: 'degraded', icon: '\uf0e7', note: 'activating' },
        { name: 'Route 53', status: 'degraded', icon: '\uf0e7', note: 'failover' },
        { name: 'Users', status: 'degraded', icon: '\uf0e7', note: 'redirected' },
      ],
      steps: ['Route 53 health checks detect region failure', 'DNS failover to secondary region', 'Cross-region RDS replica promoted', 'ECS services started in DR region', 'CloudFront origin switches to DR region', 'Full recovery confirmed'],
      mitigation: 'Multi-region architecture, warm standby, regular DR drills.'
    },
    'cert-expiry': {
      name: 'Certificate Expiration',
      affected: [
        { name: 'ALB', status: 'failed', icon: '\uf057', note: 'TLS handshake fails' },
        { name: 'CloudFront', status: 'failed', icon: '\uf057' },
        { name: 'Users', status: 'failed', icon: '\uf057', note: 'browser warning' },
      ],
      steps: ['Detect certificate expiry via CloudWatch', 'Request new certificate from ACM', 'Update ALB/CloudFront listeners', 'Verify TLS handshake works', 'Confirm user access restored'],
      mitigation: 'ACM auto-renewal with DNS validation, expiry monitoring.'
    },
    'quota-exhaustion': {
      name: 'Quota Exhaustion',
      affected: [
        { name: 'Auto Scaling', status: 'failed', icon: '\uf057' },
        { name: 'ECS', status: 'degraded', icon: '\uf0e7' },
        { name: 'Lambda', status: 'degraded', icon: '\uf0e7', note: 'throttled' },
      ],
      steps: ['Detect quota limit via CloudWatch metrics', 'Identify which quota is exhausted', 'Request quota increase via Support', 'Implement temporary throttling', 'Resume normal operations after increase'],
      mitigation: 'Quota monitoring, proactive increases, reserved capacity.'
    },
    'network-failure': {
      name: 'Network Failure',
      affected: [
        { name: 'NAT Gateway', status: 'failed', icon: '\uf057' },
        { name: 'Private Tasks', status: 'degraded', icon: '\uf0e7', note: 'no internet' },
        { name: 'External APIs', status: 'failed', icon: '\uf057' },
        { name: 'Package Downloads', status: 'failed', icon: '\uf057' },
      ],
      steps: ['Detect NAT Gateway failure', 'Check route tables and network ACLs', 'Verify internet gateway connectivity', 'Recreate NAT Gateway if needed', 'Restore connectivity for private subnets'],
      mitigation: 'Multi-AZ NAT Gateways, VPC Flow Logs, connectivity monitoring.'
    },
    'cache-failure': {
      name: 'Cache Failure',
      affected: [
        { name: 'ElastiCache', status: 'failed', icon: '\uf057' },
        { name: 'Database', status: 'degraded', icon: '\uf0e7', note: 'high load' },
        { name: 'Application', status: 'degraded', icon: '\uf0e7', note: 'high latency' },
      ],
      steps: ['Detect cache node failure', 'ElastiCache promotes replica (cluster mode)', 'Application falls back to database', 'Cache warming begins', 'Normal latency restored'],
      mitigation: 'Multi-AZ cache, cache warming strategy, circuit breaker.'
    }
  };

  /* =============================================
     DATA: RISK ANALYSIS
     ============================================= */
  const RISK_SCORES = [
    { label: 'Reliability', score: 87, color: '#10b981' },
    { label: 'Security', score: 79, color: '#38bdf8' },
    { label: 'Cost Efficiency', score: 72, color: '#eab308' },
    { label: 'Scalability', score: 91, color: '#10b981' },
    { label: 'Observability', score: 68, color: '#f97316' },
    { label: 'Disaster Recovery', score: 61, color: '#f97316' },
  ];

  const RISK_FINDINGS = [
    { severity: 'high', title: 'RDS Single-AZ Deployment', desc: 'Database is deployed in a single Availability Zone. An AZ failure would cause complete database outage with potential data loss.', mitigation: 'Enable Multi-AZ deployment for automatic failover and data redundancy.' },
    { severity: 'high', title: 'No Explicit RTO/RPO Defined', desc: 'Recovery Time Objective and Recovery Point Objective are not formally documented. This makes disaster recovery planning ad-hoc.', mitigation: 'Define RTO/RPO targets and align infrastructure capabilities accordingly.' },
    { severity: 'medium', title: 'Missing Centralized Logging', desc: 'Application and infrastructure logs are not aggregated into a centralized logging system (e.g., CloudWatch Logs, ELK).', mitigation: 'Implement centralized logging with CloudWatch Logs or a dedicated logging stack.' },
    { severity: 'medium', title: 'NAT Gateway Cost Optimization', desc: 'Single NAT Gateway handling all outbound traffic for private subnets. Consider NAT Gateway per AZ for HA, but monitor costs.', mitigation: 'Evaluate NAT Gateway costs vs. using VPC endpoints for AWS services.' },
    { severity: 'medium', title: 'Single-Region Dependency', desc: 'Architecture is deployed in a single AWS region. A region-wide outage would cause complete service disruption.', mitigation: 'Implement multi-region failover for critical workloads.' },
    { severity: 'low', title: 'No WAF Protection', desc: 'Web Application Firewall is not configured on the ALB or CloudFront. Common web exploits are not filtered.', mitigation: 'Enable AWS WAF with managed rule groups for common vulnerabilities.' },
    { severity: 'low', title: 'Missing Backup Verification', desc: 'While automated backups are configured, there is no regular backup restoration testing process.', mitigation: 'Implement regular backup restoration drills and document recovery procedures.' },
  ];

  /* =============================================
     DATA: COST ESTIMATOR
     ============================================= */
  const COST_ITEMS = [
    { id: 'ec2', name: 'EC2 Instances', desc: 't3.medium — 2 vCPU, 4GB RAM', icon: '\uf233', hourlyRate: 0.0416, defaultQty: 2, unit: 'instances' },
    { id: 'rds', name: 'RDS MySQL', desc: 'db.t3.micro — 2 vCPU, 1GB RAM', icon: '\uf1c0', hourlyRate: 0.017, defaultQty: 1, unit: 'instances' },
    { id: 'alb', name: 'ALB', desc: 'Application Load Balancer', icon: '\uf074', hourlyRate: 0.0225, defaultQty: 1, unit: 'load balancers' },
    { id: 'nat', name: 'NAT Gateway', desc: 'Per-AZ NAT Gateway', icon: '\uf0ec', hourlyRate: 0.045, defaultQty: 1, unit: 'gateways' },
    { id: 's3', name: 'S3 Storage', desc: 'Standard storage', icon: '\uf187', hourlyRate: 0, defaultQty: 50, unit: 'GB', monthlyPerUnit: 0.023 },
    { id: 'cloudfront', name: 'CloudFront', desc: 'CDN data transfer', icon: '\uf0ed', hourlyRate: 0, defaultQty: 100, unit: 'GB', monthlyPerUnit: 0.085 },
    { id: 'ecr', name: 'ECR Storage', desc: 'Container image storage', icon: '\uf1b2', hourlyRate: 0, defaultQty: 10, unit: 'GB', monthlyPerUnit: 0.10 },
    { id: 'data', name: 'Data Transfer', desc: 'Outbound internet', icon: '\uf019', hourlyRate: 0, defaultQty: 100, unit: 'GB', monthlyPerUnit: 0.09 },
  ];

  /* =============================================
     DATA: ARCHITECTURE REVIEW
     ============================================= */
  const REVIEW_CATEGORIES = [
    { title: 'Availability', icon: '\uf0e7', questions: [
      { q: 'What happens if the primary AZ becomes unavailable?', explain: 'With Multi-AZ RDS and ECS tasks across AZs, the application degrades gracefully. Without Multi-AZ, a full outage occurs.' },
      { q: 'What is the expected availability percentage?', explain: 'Target 99.9%+ for production workloads. Multi-AZ increases availability from ~99.5% to 99.99%.' },
      { q: 'Are there health checks on all critical components?', explain: 'ALB health checks ensure traffic is only routed to healthy targets. Route 53 health checks enable DNS failover.' },
    ]},
    { title: 'Security', icon: '\uf132', questions: [
      { q: 'How is authentication handled at the API level?', explain: 'API Gateway with Cognito or Lambda authorizers. ALB with OIDC for web apps.' },
      { q: 'Are security groups following least-privilege?', explain: 'Each service should only allow inbound traffic from its immediate upstream. No 0.0.0.0/0 rules on internal SGs.' },
      { q: 'Is encryption in transit and at rest configured?', explain: 'TLS everywhere with ACM certificates. RDS and S3 encryption at rest. S3 SSE-S3 or SSE-KMS.' },
    ]},
    { title: 'Scalability', icon: '\uf0e8', questions: [
      { q: 'How does the system handle traffic spikes?', explain: 'ECS auto-scaling based on CPU/memory. ALB distributes load. RDS read replicas for read-heavy patterns.' },
      { q: 'What are the scaling limits?', explain: 'AWS default quotas (e.g., 1000 ECS tasks per cluster). Monitor and request increases proactively.' },
      { q: 'Is there a caching strategy?', explain: 'CloudFront for static assets, ElastiCache for dynamic content, RDS read replicas for database reads.' },
    ]},
    { title: 'Cost', icon: '\uf3d1', questions: [
      { q: 'What are the primary cost drivers?', explain: 'EC2/ECS compute, RDS instance hours, NAT Gateway data processing, CloudFront data transfer.' },
      { q: 'Are there cost optimization opportunities?', explain: 'Reserved instances for steady-state, Spot for fault-tolerant, S3 lifecycle policies, NAT Gateway cost review.' },
      { q: 'Is there a budget monitoring mechanism?', explain: 'AWS Budgets with alerts. Cost Explorer for analysis. Trusted Advisor recommendations.' },
    ]},
    { title: 'Disaster Recovery', icon: '\uf1e6', questions: [
      { q: 'What is the required RTO/RPO?', explain: 'Business-driven: RTO (how fast to recover) and RPO (how much data loss is acceptable).' },
      { q: 'Is there cross-region replication?', explain: 'RDS cross-region read replicas, S3 cross-region replication, Route 53 failover routing.' },
      { q: 'When was the last DR test performed?', explain: 'DR plans must be tested regularly. Unreliable DR is worse than no DR.' },
    ]},
    { title: 'Observability', icon: '\uf108', questions: [
      { q: 'What metrics are being monitored?', explain: 'CPU, memory, disk, network, request latency, error rates, queue depth, custom application metrics.' },
      { q: 'How are alerts configured?', explain: 'CloudWatch Alarms with SNS topics for email/Slack. PagerDuty for critical alerts.' },
      { q: 'Is distributed tracing implemented?', explain: 'AWS X-Ray for request tracing across services. CloudWatch Service Lens for holistic view.' },
    ]},
  ];

  /* =============================================
     RENDER: ARCHITECTURE DIAGRAM
     ============================================= */
  let currentArch = 'web-app';
  let selectedService = null;

  function renderDiagram(archId) {
    const arch = ARCHITECTURES[archId];
    if (!arch) return;
    const container = document.getElementById('arch-diagram');
    const svgW = 900, svgH = 420;
    let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(56,189,248,0.4)"/></marker></defs>`;

    // Draw connections
    arch.connections.forEach(conn => {
      const from = arch.services.find(s => s.id === conn.from);
      const to = arch.services.find(s => s.id === conn.to);
      if (!from || !to) return;
      const x1 = from.x + (from.w || 140) / 2;
      const y1 = from.y + (from.h || 44);
      const x2 = to.x + (to.w || 140) / 2;
      const y2 = to.y;
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="arch-svg-line" marker-end="url(#arrowhead)" data-from="${conn.from}" data-to="${conn.to}"/>`;
    });

    // Draw nodes
    arch.services.forEach(svc => {
      const w = svc.w || 140, h = svc.h || 44;
      svg += `<g class="arch-svg-node" data-id="${svc.id}" transform="translate(${svc.x}, ${svc.y})">`;
      svg += `<rect width="${w}" height="${h}" rx="8"/>`;
      svg += `<text x="${w/2}" y="${h/2 - 2}" class="node-icon" font-family="Font Awesome 6 Free" font-weight="900" fill="${svc.color || '#38bdf8'}">${svc.icon}</text>`;
      svg += `<text x="${w/2}" y="${h/2 + 14}" font-size="10">${svc.name}</text>`;
      svg += `</g>`;
    });

    svg += '</svg>';
    container.innerHTML = svg;

    // Click handlers
    container.querySelectorAll('.arch-svg-node').forEach(node => {
      node.addEventListener('click', () => {
        const svcId = node.dataset.id;
        const svc = arch.services.find(s => s.id === svcId);
        if (!svc) return;
        // Highlight selected
        container.querySelectorAll('.arch-svg-node').forEach(n => n.classList.remove('selected'));
        node.classList.add('selected');
        renderServiceDetail(svc);
      });
    });
  }

  function renderServiceDetail(svc) {
    const panel = document.getElementById('arch-detail');
    panel.innerHTML = `
      <div class="arch-detail-content">
        <h3><span style="color:${svc.color}"><i class="devicon-${svc.id === 'route53' ? 'amazonwebservices-plain' : svc.id === 'cloudfront' || svc.id === 'cf-primary' || svc.id === 'cf-secondary' ? 'amazonwebservices-plain' : svc.id === 'alb' ? 'amazonwebservices-plain' : svc.id === 'ecs' || svc.id === 'ecs-primary' || svc.id === 'ecs-secondary' || svc.id === 'ec2-nodes' ? 'amazonwebservices-plain' : svc.id === 'rds' || svc.id === 'rds-primary' || svc.id === 'rds-secondary' ? 'amazonwebservices-plain' : svc.id === 's3' ? 'amazonwebservices-plain' : svc.id === 'ecr' ? 'amazonwebservices-plain' : svc.id === 'eks' ? 'amazonwebservices-plain' : svc.id === 'dynamodb' ? 'amazonwebservices-plain' : svc.id === 'apigw' || svc.id === 'lambda' ? 'amazonwebservices-plain' : 'amazonwebservices-plain'}-plain"></i></span></h3>
        <div class="detail-type">${svc.type}</div>
        
        <h4><i class="fa-solid fa-bullseye"></i> Purpose</h4>
        <p>${svc.purpose}</p>
        
        <h4><i class="fa-solid fa-check-circle"></i> When to Use</h4>
        <p>${svc.whenToUse}</p>
        
        <h4><i class="fa-solid fa-times-circle"></i> When NOT to Use</h4>
        <p>${svc.whenNotToUse}</p>
        
        <h4><i class="fa-solid fa-triangle-exclamation"></i> Common Mistakes</h4>
        <ul>${svc.mistakes.map(m => `<li>${m}</li>`).join('')}</ul>
        
        <h4><i class="fa-solid fa-burst"></i> Failure Scenario</h4>
        <p>${svc.failure}</p>
        
        <div class="detail-cost">
          <strong>Estimated Cost:</strong> ${svc.cost}
        </div>
      </div>
    `;
  }

  // Tab switching
  document.querySelectorAll('.arch-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.arch-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentArch = tab.dataset.arch;
      selectedService = null;
      renderDiagram(currentArch);
      document.getElementById('arch-detail').innerHTML = `
        <div class="arch-detail-placeholder">
          <i class="fa-solid fa-hand-pointer"></i>
          <h3>Select a Component</h3>
          <p>Click on any service node in the diagram to see detailed information.</p>
        </div>`;
    });
  });

  /* =============================================
     RENDER: WHAT-IF SIMULATOR
     ============================================= */
  function renderScenarios() {
    const grid = document.getElementById('scenario-grid');
    grid.innerHTML = SCENARIOS.map(s => `
      <div class="scenario-card" data-scenario="${s.id}">
        <i class="fa-solid" style="font-family:'Font Awesome 6 Free';font-weight:900;">${s.icon}</i>
        <span>${s.name}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.scenario-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const scenario = SCENARIOS.find(s => s.id === card.dataset.scenario);
        renderSimResult(scenario);
      });
    });
  }

  function renderSimResult(scenario) {
    const panel = document.getElementById('sim-result');
    panel.style.display = 'block';
    document.getElementById('sim-result-title').textContent = scenario.name + ' — Impact Analysis';
    const impactBadge = document.getElementById('sim-result-impact');
    impactBadge.textContent = scenario.impact;
    impactBadge.className = 'impact-badge ' + scenario.impact.toLowerCase();

    const prop = document.getElementById('sim-propagation');
    prop.innerHTML = scenario.propagation.map((p, i) => `
      <div class="sim-prop-item ${p.status}" style="animation-delay:${i * 0.1}s">
        <span class="prop-icon">${p.status === 'failed' ? '\uf057' : p.status === 'degraded' ? '\uf0e7' : '\uf00c'}</span>
        <span class="prop-name">${p.name}</span>
        <span class="prop-status">${p.reason}</span>
      </div>
    `).join('');

    document.getElementById('sim-recovery-text').textContent = scenario.recovery;
    document.getElementById('sim-mitigation-text').textContent = scenario.mitigation;
  }

  /* =============================================
     RENDER: BUTTERFLY EFFECT
     ============================================= */
  function renderButterfly(effectId) {
    const effect = BUTTERFLY_EFFECTS[effectId];
    if (!effect) return;
    const container = document.getElementById('butterfly-diagram');
    let html = '<div class="butterfly-chain">';
    effect.nodes.forEach((node, i) => {
      if (i > 0) html += '<div class="butterfly-arrow"></div>';
      html += `
        <div class="butterfly-node ${node.type}" style="animation-delay:${i * 0.12}s">
          <span class="bf-icon">${node.icon}</span>
          <span class="bf-name">${node.name}</span>
          <span class="bf-reason">${node.reason}</span>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  document.querySelectorAll('.butterfly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.butterfly-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderButterfly(btn.dataset.effect);
    });
  });

  /* =============================================
     RENDER: CRASH TEST
     ============================================= */
  document.getElementById('run-crash-test').addEventListener('click', () => {
    const scenarioId = document.getElementById('crash-scenario-select').value;
    if (!scenarioId) return;
    const test = CRASH_TESTS[scenarioId];
    if (!test) return;

    const viz = document.getElementById('crash-viz');
    viz.style.display = 'grid';

    // Render timeline
    const timeline = document.getElementById('crash-timeline');
    timeline.innerHTML = `<h3><i class="fa-solid fa-bolt"></i> Recovery Sequence</h3>`;
    test.steps.forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'crash-step';
      div.style.animationDelay = `${i * 0.2}s`;
      div.innerHTML = `<div class="crash-step-num">${i + 1}</div><div class="crash-step-text">${step}</div>`;
      timeline.appendChild(div);
    });

    // Animate steps
    const steps = timeline.querySelectorAll('.crash-step');
    steps.forEach((step, i) => {
      setTimeout(() => {
        if (i > 0) steps[i - 1].classList.remove('active');
        if (i > 0) steps[i - 1].classList.add('complete');
        step.classList.add('active');
        if (i === steps.length - 1) {
          setTimeout(() => { step.classList.remove('active'); step.classList.add('complete'); }, 500);
        }
      }, i * 600);
    });

    // Render summary
    const summary = document.getElementById('crash-summary');
    summary.innerHTML = `<h3><i class="fa-solid fa-triangle-exclamation"></i> Impact Analysis</h3>`;
    let affectedHtml = '<div class="crash-affected">';
    test.affected.forEach(a => {
      affectedHtml += `
        <div class="crash-affected-item">
          <span class="ca-icon" style="color:${a.status === 'failed' ? '#ef4444' : a.status === 'degraded' ? '#eab308' : '#10b981'}">${a.icon}</span>
          <span class="ca-name">${a.name}</span>
          <span class="ca-status">${a.status}${a.note ? ' — ' + a.note : ''}</span>
        </div>`;
    });
    affectedHtml += '</div>';
    summary.innerHTML += affectedHtml;
    summary.innerHTML += `
      <div class="crash-mitigation">
        <h4><i class="fa-solid fa-shield-halved"></i> Recommended Mitigation</h4>
        <p>${test.mitigation}</p>
      </div>`;
  });

  /* =============================================
     RENDER: RISK ANALYZER
     ============================================= */
  function renderRiskScores() {
    const container = document.getElementById('risk-scores');
    container.innerHTML = '<h3 style="font-family:var(--font-display);font-size:1.05rem;font-weight:700;margin-bottom:1rem;">Architecture Health</h3>';
    RISK_SCORES.forEach(r => {
      container.innerHTML += `
        <div class="risk-score-item">
          <span class="risk-score-label">${r.label}</span>
          <div class="risk-score-bar"><div class="risk-score-fill" style="background:${r.color}" data-width="${r.score}%"></div></div>
          <span class="risk-score-value" style="color:${r.color}">${r.score}</span>
        </div>`;
    });

    // Animate bars
    setTimeout(() => {
      container.querySelectorAll('.risk-score-fill').forEach(fill => {
        fill.style.width = fill.dataset.width;
      });
    }, 300);
  }

  function renderRiskFindings() {
    const container = document.getElementById('risk-findings');
    RISK_FINDINGS.forEach(f => {
      const div = document.createElement('div');
      div.className = 'risk-finding';
      div.innerHTML = `
        <div class="risk-finding-header">
          <span class="risk-severity ${f.severity}">${f.severity}</span>
          <span class="risk-finding-title">${f.title}</span>
        </div>
        <div class="risk-finding-desc">
          <p>${f.desc}</p>
          <div class="risk-finding-mitigation"><strong>Mitigation:</strong> ${f.mitigation}</div>
        </div>`;
      div.addEventListener('click', () => div.classList.toggle('expanded'));
      container.appendChild(div);
    });
  }

  /* =============================================
     RENDER: COST ESTIMATOR
     ============================================= */
  function renderCostEstimator() {
    const config = document.getElementById('cost-config');
    COST_ITEMS.forEach(item => {
      const monthly = item.hourlyRate > 0
        ? (item.hourlyRate * 730 * item.defaultQty).toFixed(2)
        : (item.monthlyPerUnit * item.defaultQty).toFixed(2);
      config.innerHTML += `
        <div class="cost-item" data-id="${item.id}" data-hourly="${item.hourlyRate}" data-unit-price="${item.monthlyPerUnit || 0}">
          <div class="cost-item-icon"><i class="fa-solid" style="font-family:'Font Awesome 6 Free';font-weight:900;">${item.icon}</i></div>
          <div class="cost-item-info">
            <div class="cost-item-name">${item.name}</div>
            <div class="cost-item-desc">${item.desc}</div>
          </div>
          <div class="cost-item-qty">
            <label>Qty:</label>
            <input type="number" min="0" value="${item.defaultQty}" data-id="${item.id}">
          </div>
          <div class="cost-item-price" data-price="${item.id}">$${monthly}/mo</div>
        </div>`;
    });

    // Listen for quantity changes
    config.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', updateCostSummary);
    });

    updateCostSummary();
  }

  function updateCostSummary() {
    const summary = document.getElementById('cost-summary');
    let total = 0;
    let lines = '';

    document.querySelectorAll('.cost-item').forEach(item => {
      const id = item.dataset.id;
      const hourly = parseFloat(item.dataset.hourly);
      const unitPrice = parseFloat(item.dataset.unitPrice);
      const qty = parseInt(item.querySelector('input').value) || 0;
      let monthly = 0;

      if (hourly > 0) {
        monthly = hourly * 730 * qty;
      } else {
        monthly = unitPrice * qty;
      }

      total += monthly;
      const priceEl = document.querySelector(`[data-price="${id}"]`);
      if (priceEl) priceEl.textContent = '$' + monthly.toFixed(2) + '/mo';

      if (monthly > 0) {
        lines += `<div class="cost-line"><span class="cl-name">${item.querySelector('.cost-item-name').textContent}</span><span class="cl-price">$${monthly.toFixed(2)}</span></div>`;
      }
    });

    summary.innerHTML = `
      <h3>Monthly Estimate</h3>
      <div class="cost-breakdown">${lines}</div>
      <div class="cost-total">
        <span class="ct-label">Total Estimated</span>
        <span class="ct-value">$${total.toFixed(2)}/mo</span>
      </div>
      <div class="cost-disclaimer">
        Illustrative estimate. Actual AWS pricing varies by region, usage, reserved capacity, savings plans, and configuration. Data transfer costs may vary significantly. Prices as of 2024 — check AWS Pricing Calculator for current rates.
      </div>`;
  }

  /* =============================================
     RENDER: ARCHITECTURE REVIEW
     ============================================= */
  function renderReview() {
    const container = document.getElementById('review-categories');
    REVIEW_CATEGORIES.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'review-category';
      let questionsHtml = '';
      cat.questions.forEach(q => {
        questionsHtml += `
          <div class="review-question">
            <span class="rq-icon"><i class="fa-solid fa-circle-question"></i></span>
            <div>
              <p>${q.q}</p>
              <div class="review-explanation">${q.explain}</div>
            </div>
          </div>`;
      });
      div.innerHTML = `<h3><i class="fa-solid" style="font-family:'Font Awesome 6 Free';font-weight:900;">${cat.icon}</i> ${cat.title}</h3>${questionsHtml}`;
      container.appendChild(div);

      // Toggle explanation
      div.querySelectorAll('.review-question').forEach(q => {
        q.style.cursor = 'pointer';
        q.addEventListener('click', () => q.classList.toggle('expanded'));
      });
    });
  }

  /* =============================================
     INIT
     ============================================= */
  renderDiagram(currentArch);
  renderScenarios();
  renderButterfly('remove-nat');
  renderRiskScores();
  renderRiskFindings();
  renderCostEstimator();
  renderReview();

})();
