(() => {
  'use strict';

  const TECH_STACKS = {
    nodejs: {
      group: 'runtimes', label: 'Node.js', icon: 'devicon-nodejs-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-node-app'},
        {key:'node_version',label:'Node Version',type:'select',options:['20','18','22'],default:'20'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-node-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'node'); }
    },
    python: {
      group: 'runtimes', label: 'Python', icon: 'devicon-python-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-python-app'},
        {key:'python_version',label:'Python Version',type:'select',options:['3.12','3.11','3.10'],default:'3.12'},
        {key:'port',label:'Port',type:'text',default:'8000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-python-app'},
        {key:'framework',label:'Framework',type:'select',options:['fastapi','django','flask','generic'],default:'fastapi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        if(cfg.framework==='django'||cfg.framework==='flask') files['configmap.yaml'] = generateConfigMap(cfg, {APP_FRAMEWORK: cfg.framework});
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'python'); }
    },
    java: {
      group: 'runtimes', label: 'Java', icon: 'devicon-java-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-java-app'},
        {key:'java_version',label:'Java Version',type:'select',options:['21','17','11'],default:'21'},
        {key:'port',label:'Port',type:'text',default:'8080'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-java-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'java'); }
    },
    go: {
      group: 'runtimes', label: 'Go', icon: 'devicon-go-original-wordmark', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-go-app'},
        {key:'port',label:'Port',type:'text',default:'8080'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-go-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'go'); }
    },
    dotnet: {
      group: 'runtimes', label: '.NET', icon: 'devicon-dotnetcore-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-dotnet-app'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-dotnet-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'dotnet'); }
    },
    php: {
      group: 'runtimes', label: 'PHP', icon: 'devicon-php-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-php-app'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-php-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'php'); }
    },
    ruby: {
      group: 'runtimes', label: 'Ruby', icon: 'devicon-ruby-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-ruby-app'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-ruby-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'ruby'); }
    },

    postgres: {
      group: 'databases', label: 'PostgreSQL', icon: 'devicon-postgresql-plain', type: 'database',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-postgres'},
        {key:'image_version',label:'Version',type:'select',options:['16-alpine','15-alpine','14-alpine'],default:'16-alpine'},
        {key:'port',label:'Port',type:'text',default:'5432'},
        {key:'db_name',label:'Database',type:'text',default:'appdb'},
        {key:'db_user',label:'User',type:'text',default:'admin'},
        {key:'db_password',label:'Password',type:'text',default:'changeme123'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'10Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        files['secret.yaml'] = generateSecret(cfg, {POSTGRES_DB: cfg.db_name, POSTGRES_USER: cfg.db_user, POSTGRES_PASSWORD: cfg.db_password});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'postgres'); }
    },
    mysql: {
      group: 'databases', label: 'MySQL', icon: 'devicon-mysql-plain', type: 'database',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-mysql'},
        {key:'image_version',label:'Version',type:'select',options:['8.0','8.4','5.7'],default:'8.0'},
        {key:'port',label:'Port',type:'text',default:'3306'},
        {key:'db_name',label:'Database',type:'text',default:'appdb'},
        {key:'db_user',label:'User',type:'text',default:'admin'},
        {key:'db_password',label:'Password',type:'text',default:'changeme123'},
        {key:'root_password',label:'Root Password',type:'text',default:'rootpass123'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'10Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        files['secret.yaml'] = generateSecret(cfg, {MYSQL_DATABASE: cfg.db_name, MYSQL_USER: cfg.db_user, MYSQL_PASSWORD: cfg.db_password, MYSQL_ROOT_PASSWORD: cfg.root_password});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'mysql'); }
    },
    mongodb: {
      group: 'databases', label: 'MongoDB', icon: 'devicon-mongodb-plain', type: 'database',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-mongodb'},
        {key:'image_version',label:'Version',type:'select',options:['7','6','5'],default:'7'},
        {key:'port',label:'Port',type:'text',default:'27017'},
        {key:'db_user',label:'User',type:'text',default:'admin'},
        {key:'db_password',label:'Password',type:'text',default:'changeme123'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'10Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        files['secret.yaml'] = generateSecret(cfg, {MONGO_INITDB_ROOT_USERNAME: cfg.db_user, MONGO_INITDB_ROOT_PASSWORD: cfg.db_password});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'mongodb'); }
    },
    redis: {
      group: 'databases', label: 'Redis', icon: 'devicon-redis-plain', type: 'database',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-redis'},
        {key:'image_version',label:'Version',type:'select',options:['7-alpine','6-alpine','7'],default:'7-alpine'},
        {key:'port',label:'Port',type:'text',default:'6379'},
        {key:'password',label:'Password',type:'text',default:''},
        {key:'storage_size',label:'Storage Size',type:'text',default:'5Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        if(cfg.password) files['secret.yaml'] = generateSecret(cfg, {REDIS_PASSWORD: cfg.password});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'redis'); }
    },
    elasticsearch: {
      group: 'databases', label: 'Elasticsearch', icon: 'devicon-elasticsearch-plain', type: 'database',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-elasticsearch'},
        {key:'image_version',label:'Version',type:'select',options:['8.12.0','8.11.0','7.17.16'],default:'8.12.0'},
        {key:'port',label:'Port',type:'text',default:'9200'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'20Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        files['configmap.yaml'] = generateConfigMap(cfg, {'discovery.type': 'single-node', 'xpack.security.enabled': 'false', 'ES_JAVA_OPTS': '-Xms512m -Xmx512m'});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'elasticsearch'); }
    },

    nginx: {
      group: 'webservers', label: 'Nginx', icon: 'devicon-nginx-original', type: 'webserver',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-nginx'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'nginx'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        files['configmap.yaml'] = generateConfigMap(cfg, {'nginx.conf': '# custom nginx config'});
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'nginx'); }
    },
    apache: {
      group: 'webservers', label: 'Apache', icon: 'devicon-apache-plain', type: 'webserver',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-apache'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'httpd'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'apache'); }
    },
    caddy: {
      group: 'webservers', label: 'Caddy', icon: 'devicon-caddy-plain', type: 'webserver',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-caddy'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'caddy'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        files['configmap.yaml'] = generateConfigMap(cfg, {'Caddyfile': ':80\n\trespond "Hello from Caddy"'});
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'caddy'); }
    },

    rabbitmq: {
      group: 'brokers', label: 'RabbitMQ', icon: 'devicon-rabbitmq-original', type: 'broker',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-rabbitmq'},
        {key:'image_version',label:'Version',type:'select',options:['3-management-alpine','3-management','3-alpine'],default:'3-management-alpine'},
        {key:'port',label:'AMQP Port',type:'text',default:'5672'},
        {key:'management_port',label:'Management Port',type:'text',default:'15672'},
        {key:'user',label:'User',type:'text',default:'guest'},
        {key:'password',label:'Password',type:'text',default:'guest'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'5Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        files['secret.yaml'] = generateSecret(cfg, {RABBITMQ_DEFAULT_USER: cfg.user, RABBITMQ_DEFAULT_PASS: cfg.password});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'rabbitmq'); }
    },
    kafka: {
      group: 'brokers', label: 'Kafka', icon: 'devicon-apachekafka-plain', type: 'broker',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-kafka'},
        {key:'image_version',label:'Version',type:'select',options:['7.6.0','7.5.0','7.4.0'],default:'7.6.0'},
        {key:'port',label:'Port',type:'text',default:'9092'},
        {key:'zookeeper_port',label:'Zookeeper Port',type:'text',default:'2181'},
        {key:'replicas',label:'Replicas',type:'text',default:'1'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'10Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        files['configmap.yaml'] = generateConfigMap(cfg, {'KAFKA_BROKER_ID': '1', 'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR': '1'});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'kafka'); }
    },
    nats: {
      group: 'brokers', label: 'NATS', icon: 'devicon-natsdotio-plain', type: 'broker',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-nats'},
        {key:'port',label:'Client Port',type:'text',default:'4222'},
        {key:'monitor_port',label:'Monitor Port',type:'text',default:'8222'},
        {key:'replicas',label:'Replicas',type:'text',default:'3'},
      ],
      generateYaml(cfg){
        const files = {};
        files['statefulset.yaml'] = generateStatefulSet(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'statefulset', 'nats'); }
    },

    prometheus: {
      group: 'monitoring', label: 'Prometheus', icon: 'devicon-prometheus-original', type: 'monitoring',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-prometheus'},
        {key:'image_version',label:'Version',type:'select',options:['latest','v2.50.0','v2.49.0'],default:'latest'},
        {key:'port',label:'Port',type:'text',default:'9090'},
        {key:'replicas',label:'Replicas',type:'text',default:'1'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'10Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        files['configmap.yaml'] = generateConfigMap(cfg, {'prometheus.yml': 'global:\\n  scrape_interval: 15s'});
        files['pvc.yaml'] = generatePVC(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'prometheus'); }
    },
    grafana: {
      group: 'monitoring', label: 'Grafana', icon: 'devicon-grafana-plain', type: 'monitoring',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-grafana'},
        {key:'image_version',label:'Version',type:'select',options:['latest','10.3.1','10.2.3'],default:'latest'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'1'},
        {key:'admin_user',label:'Admin User',type:'text',default:'admin'},
        {key:'admin_password',label:'Admin Password',type:'text',default:'admin'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        files['secret.yaml'] = generateSecret(cfg, {GF_SECURITY_ADMIN_USER: cfg.admin_user, GF_SECURITY_ADMIN_PASSWORD: cfg.admin_password});
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'grafana'); }
    },
    elk: {
      group: 'monitoring', label: 'ELK Stack', icon: 'devicon-elasticsearch-plain', type: 'monitoring',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-elk'},
        {key:'elastic_version',label:'ELK Version',type:'select',options:['8.12.0','8.11.0','7.17.16'],default:'8.12.0'},
        {key:'es_port',label:'Elasticsearch Port',type:'text',default:'9200'},
        {key:'kibana_port',label:'Kibana Port',type:'text',default:'5601'},
        {key:'logstash_port',label:'Logstash Port',type:'text',default:'5044'},
        {key:'storage_size',label:'Storage Size',type:'text',default:'10Gi'},
      ],
      generateYaml(cfg){
        const files = {};
        files['elasticsearch/statefulset.yaml'] = generateStatefulSet({...cfg, app_name: cfg.app_name+'-es', port: cfg.es_port, image_version: cfg.elastic_version});
        files['elasticsearch/service.yaml'] = generateService({...cfg, app_name: cfg.app_name+'-es', port: cfg.es_port});
        files['logstash/deployment.yaml'] = generateDeployment({...cfg, app_name: cfg.app_name+'-logstash', port: cfg.logstash_port, image: 'logstash', image_version: cfg.elastic_version});
        files['logstash/service.yaml'] = generateService({...cfg, app_name: cfg.app_name+'-logstash', port: cfg.logstash_port});
        files['kibana/deployment.yaml'] = generateDeployment({...cfg, app_name: cfg.app_name+'-kibana', port: cfg.kibana_port, image: 'kibana', image_version: cfg.elastic_version});
        files['kibana/service.yaml'] = generateService({...cfg, app_name: cfg.app_name+'-kibana', port: cfg.kibana_port});
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'elk'); }
    },

    react: {
      group: 'frontend', label: 'React', icon: 'devicon-react-original', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-react-app'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-react-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'react'); }
    },
    vue: {
      group: 'frontend', label: 'Vue.js', icon: 'devicon-vuejs-original', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-vue-app'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-vue-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'vue'); }
    },
    angular: {
      group: 'frontend', label: 'Angular', icon: 'devicon-angularjs-plain', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-angular-app'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-angular-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'angular'); }
    },
    nextjs: {
      group: 'frontend', label: 'Next.js', icon: 'devicon-nextjs-plain', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-nextjs-app'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-nextjs-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'nextjs'); }
    },
    nuxt: {
      group: 'frontend', label: 'Nuxt', icon: 'devicon-nuxtjs-plain', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-nuxt-app'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'replicas',label:'Replicas',type:'text',default:'2'},
        {key:'image',label:'Image',type:'text',default:'myregistry/my-nuxt-app'},
      ],
      generateYaml(cfg){
        const files = {};
        files['deployment.yaml'] = generateDeployment(cfg);
        files['service.yaml'] = generateService(cfg);
        return files;
      },
      generateHelm(cfg){ return generateHelmChart(cfg, 'deployment', 'nuxt'); }
    },
  };

  const GROUPS = {
    runtimes:   { label: 'Application Runtimes', icon: 'devicon-nodejs-plain', resources: ['nodejs','python','java','go','dotnet','php','ruby'] },
    databases:  { label: 'Databases', icon: 'devicon-docker-plain', resources: ['postgres','mysql','mongodb','redis','elasticsearch'] },
    webservers: { label: 'Web Servers / Proxies', icon: 'devicon-nginx-original', resources: ['nginx','apache','caddy'] },
    brokers:    { label: 'Message Brokers', icon: 'devicon-docker-plain', resources: ['rabbitmq','kafka','nats'] },
    monitoring: { label: 'Monitoring & Observability', icon: 'devicon-grafana-plain', resources: ['prometheus','grafana','elk'] },
    frontend:   { label: 'Frontend Frameworks', icon: 'devicon-react-original', resources: ['react','vue','angular','nextjs','nuxt'] },
  };

  // ============================================================
  // K8S YAML GENERATORS
  // ============================================================
  function appName(cfg){ return cfg.app_name || 'my-app'; }
  function ns(cfg){ return cfg.namespace || 'default'; }
  function svcPort(cfg){ return parseInt(cfg.port) || 80; }
  function replicas(cfg){ return parseInt(cfg.replicas) || 2; }
  function imageRef(cfg){
    const img = cfg.image || ('myregistry/' + appName(cfg));
    const ver = cfg.image_version || 'latest';
    return ver==='latest' ? img+':latest' : img+':'+ver;
  }

  function generateDeployment(cfg){
    const name = appName(cfg);
    const port = svcPort(cfg);
    const rep = replicas(cfg);
    const img = imageRef(cfg);
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${ns(cfg)}
  labels:
    app: ${name}
    managed-by: devsmith
spec:
  replicas: ${rep}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
        - name: ${name}
          image: ${img}
          ports:
            - containerPort: ${port}
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /
              port: ${port}
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: ${port}
            initialDelaySeconds: 15
            periodSeconds: 20`;
  }

  function generateStatefulSet(cfg){
    const name = appName(cfg);
    const port = svcPort(cfg);
    const img = imageRef(cfg);
    return `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${name}
  namespace: ${ns(cfg)}
  labels:
    app: ${name}
    managed-by: devsmith
spec:
  serviceName: ${name}
  replicas: 1
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
        - name: ${name}
          image: ${img}
          ports:
            - containerPort: ${port}
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          volumeMounts:
            - name: ${name}-data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: ${name}-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: ${cfg.storage_size || '10Gi'}`;
  }

  function generateService(cfg){
    const name = appName(cfg);
    const port = svcPort(cfg);
    const isDB = ['database','broker'].includes(cfg.type);
    return `apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${ns(cfg)}
  labels:
    app: ${name}
    managed-by: devsmith
spec:
  type: ${isDB?'ClusterIP':'ClusterIP'}
  selector:
    app: ${name}
  ports:
    - port: ${port}
      targetPort: ${port}
      protocol: TCP`;
  }

  function generateConfigMap(cfg, data){
    const name = appName(cfg);
    let dataBlock = '';
    for(const [k,v] of Object.entries(data)){
      dataBlock += `  ${k}: |\n    ${String(v).replace(/\n/g,'\n    ')}\n`;
    }
    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}-config
  namespace: ${ns(cfg)}
  labels:
    app: ${name}
    managed-by: devsmith
data:
${dataBlock.trimEnd()}`;
  }

  function generateSecret(cfg, data){
    const name = appName(cfg);
    let dataBlock = '';
    for(const [k,v] of Object.entries(data)){
      dataBlock += `  ${k}: "${String(v)}"\n`;
    }
    return `apiVersion: v1
kind: Secret
metadata:
  name: ${name}-secret
  namespace: ${ns(cfg)}
  labels:
    app: ${name}
    managed-by: devsmith
type: Opaque
data:
${dataBlock.trimEnd()}`;
  }

  function generatePVC(cfg){
    const name = appName(cfg);
    return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${name}-pvc
  namespace: ${ns(cfg)}
  labels:
    app: ${name}
    managed-by: devsmith
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${cfg.storage_size || '10Gi'}`;
  }

  function generateHelmChart(cfg, kind, stackKey){
    const name = appName(cfg);
    const port = svcPort(cfg);
    const rep = replicas(cfg);
    const img = imageRef(cfg);

    const chart = {
      'Chart.yaml': `apiVersion: v2
name: ${name}
description: A Helm chart for ${name}
type: application
version: 0.1.0
appVersion: "1.0.0"`,
      'values.yaml': `replicaCount: ${rep}

image:
  repository: ${img.split(':')[0]}
  pullPolicy: IfNotPresent
  tag: "${img.split(':')[1] || 'latest'}"

service:
  type: ClusterIP
  port: ${port}

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80`,
      'templates/_helpers.tpl': `{{/*
Expand the name of the chart.
*/}}
{{- define "${name}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "${name}.labels" -}}
helm.sh/chart: {{ include "${name}.name" . }}
{{ include "${name}.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "${name}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${name}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}`,
      'templates/deployment.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${name}.name" . }}
  labels:
    {{- include "${name}.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "${name}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "${name}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}`,
      'templates/service.yaml': `apiVersion: v1
kind: Service
metadata:
  name: {{ include "${name}.name" . }}
  labels:
    {{- include "${name}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
      protocol: TCP
      name: http
  selector:
    {{- include "${name}.selectorLabels" . | nindent 4 }}`,
    };

    return chart;
  }

  // ============================================================
  // STATE
  // ============================================================
  const configValues = {};
  const selectedStacks = new Set();
  let generatedFiles = {};

  // ============================================================
  // DOM
  // ============================================================
  const els = {};
  function cacheDom() {
    els.techGroups = document.getElementById('tech-groups');
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
  }

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    initDefaultConfigValues();
    renderTechPanel();
    bindEvents();
    updateSelectionUI();
  });

  function initDefaultConfigValues() {
    for (const [key, def] of Object.entries(TECH_STACKS)) {
      configValues[key] = {};
      for (const f of def.fields) configValues[key][f.key] = f.default;
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
        GROUPS[group].resources.forEach(r => {
          const cb = document.querySelector(`.tech-checkbox[value="${r}"]`);
          if (cb) cb.checked = checked;
        });
        syncSelection();
      }
      if (e.target.classList.contains('tech-checkbox')) syncSelection();
    });
    els.generateBtn.addEventListener('click', handleGenerate);
    els.previewBtn.addEventListener('click', handlePreview);
    els.modalClose.addEventListener('click', closeModal);
    els.modalOverlay.addEventListener('click', (e) => { if (e.target === els.modalOverlay) closeModal(); });
    els.copyAllBtn.addEventListener('click', handleCopyAll);
    els.downloadZipBtn.addEventListener('click', handleDownloadZip);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  // ============================================================
  // TECH PANEL
  // ============================================================
  function renderTechPanel() {
    els.techGroups.innerHTML = '';
    let first = true;
    for (const [groupId, groupDef] of Object.entries(GROUPS)) {
      const details = document.createElement('details');
      details.className = 'tech-group';
      if (first) { details.open = true; first = false; }
      let itemsHtml = '';
      groupDef.resources.forEach(resKey => {
        const def = TECH_STACKS[resKey];
        itemsHtml += `
          <label class="tech-item">
            <input type="checkbox" class="tech-checkbox" value="${resKey}">
            <i class="${def.icon} tech-icon"></i>
            <span>${def.label}</span>
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
            <span class="group-count">${groupDef.resources.length} stacks</span>
          </div>
          <i class="fa-solid fa-chevron-down group-chevron"></i>
        </summary>
        <div class="group-content">${itemsHtml}</div>`;
      els.techGroups.appendChild(details);
    }
  }

  // ============================================================
  // SELECTION
  // ============================================================
  function toggleSelectAll() {
    const allRes = Object.keys(TECH_STACKS);
    const allChecked = selectedStacks.size === allRes.length;
    document.querySelectorAll('.tech-checkbox').forEach(cb => { cb.checked = !allChecked; });
    document.querySelectorAll('.group-checkbox').forEach(cb => { cb.checked = !allChecked; cb.indeterminate = false; });
    syncSelection();
  }

  function syncSelection() {
    selectedStacks.clear();
    document.querySelectorAll('.tech-checkbox').forEach(cb => { if (cb.checked) selectedStacks.add(cb.value); });
    document.querySelectorAll('.group-checkbox').forEach(cb => {
      const group = cb.dataset.group;
      const resources = GROUPS[group].resources;
      const checked = resources.filter(r => { const el = document.querySelector(`.tech-checkbox[value="${r}"]`); return el && el.checked; }).length;
      cb.checked = checked === resources.length;
      cb.indeterminate = checked > 0 && checked < resources.length;
    });
    updateSelectionUI();
    renderConfigSections();
  }

  function updateSelectionUI(){
    els.selectedCount.textContent = selectedStacks.size;
    const show = selectedStacks.size > 0;
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

    const groupsWithSelections = {};
    for (const resKey of selectedStacks) {
      const def = TECH_STACKS[resKey];
      if (!groupsWithSelections[def.group]) groupsWithSelections[def.group] = [];
      groupsWithSelections[def.group].push(resKey);
    }

    for (const [groupId, resources] of Object.entries(groupsWithSelections)) {
      const groupMeta = GROUPS[groupId];
      const section = document.createElement('div');
      section.className = 'config-section';
      section.innerHTML = `<div class="config-section-header"><h3><i class="${groupMeta.icon}"></i> ${groupMeta.label}</h3><span class="section-resource-count">${resources.length} stack${resources.length>1?'s':''}</span></div>`;
      const grid = document.createElement('div');
      grid.className = 'config-grid';
      for (const resKey of resources) {
        const def = TECH_STACKS[resKey];
        grid.innerHTML += `<div class="config-resource-header"><h4>${def.label}</h4></div>`;
        for (const field of def.fields) grid.appendChild(createField(resKey, field));
        grid.appendChild(createField(resKey, {key:'namespace',label:'Namespace',type:'text',default:'default'}));
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
    if (field.type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = configValues[resourceKey][field.key] || '';
      input.addEventListener('input', () => { configValues[resourceKey][field.key] = input.value; });
      wrapper.appendChild(input);
    } else if (field.type === 'checkbox') {
      const cw = document.createElement('div');
      cw.className = 'config-field-checkbox';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = configValues[resourceKey][field.key];
      const sp = document.createElement('span');
      sp.textContent = input.checked ? 'Enabled' : 'Disabled';
      input.addEventListener('change', () => { configValues[resourceKey][field.key] = input.checked; sp.textContent = input.checked ? 'Enabled' : 'Disabled'; });
      cw.appendChild(input);
      cw.appendChild(sp);
      wrapper.appendChild(cw);
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      for (const opt of field.options) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (opt === configValues[resourceKey][field.key]) o.selected = true;
        select.appendChild(o);
      }
      select.addEventListener('change', () => { configValues[resourceKey][field.key] = select.value; });
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
    generatedFiles = {};
    if (mode === 'helm') {
      generateHelmMode();
    } else {
      generateYamlMode();
    }
    showToast('Generated ' + Object.keys(generatedFiles).length + ' files successfully!');
  }

  function generateYamlMode() {
    for (const stackKey of selectedStacks) {
      const def = TECH_STACKS[stackKey];
      const cfg = {...configValues[stackKey], type: def.type};
      const stackFiles = def.generateYaml(cfg);
      if (stackFiles) {
        for (const [filename, content] of Object.entries(stackFiles)) {
          generatedFiles[stackKey + '/' + filename] = content;
        }
      }
    }
  }

  function generateHelmMode() {
    const allFiles = {};
    for (const stackKey of selectedStacks) {
      const def = TECH_STACKS[stackKey];
      const cfg = {...configValues[stackKey], type: def.type};
      const helmChart = def.generateHelm(cfg);
      if (helmChart) {
        for (const [filename, content] of Object.entries(helmChart)) {
          allFiles[stackKey + '-chart/' + filename] = content;
        }
      }
    }
    Object.assign(generatedFiles, allFiles);
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
      tab.textContent = name.split('/').pop();
      tab.title = name;
      tab.addEventListener('click', () => switchTab(i));
      els.modalTabs.appendChild(tab);
      const panel = document.createElement('div');
      panel.className = 'modal-tab-panel' + (i === 0 ? ' active' : '');
      panel.innerHTML = '<pre><code>' + escapeHtml(generatedFiles[name]) + '</code></pre>';
      els.modalTabPanels.appendChild(panel);
    });
    const totalSize = new Blob(Object.values(generatedFiles)).size;
    els.modalStats.textContent = fileNames.length + ' files | ' + (totalSize/1024).toFixed(1) + ' KB';
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
    const all = Object.entries(generatedFiles).map(([n,c]) => '# ============================================\n# File: ' + n + '\n# ============================================\n\n' + c).join('\n\n\n');
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
    zip.generateAsync({ type: 'blob' }).then(blob => { saveAs(blob, 'kubernetes-manifests.zip'); });
  }

  function showToast(message) {
    const existing = document.querySelector('.k8s-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'k8s-toast';
    toast.innerHTML = '<i class="fa-solid fa-check-circle"></i> ' + message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
  }
})();
