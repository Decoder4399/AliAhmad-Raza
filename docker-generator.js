(() => {
  'use strict';

  // ============================================================
  // TECH STACK DEFINITIONS
  // ============================================================
  const TECH_STACKS = {
    // ── Application Runtimes ──────────────────────────
    nodejs: {
      group: 'runtimes', label: 'Node.js', icon: 'devicon-nodejs-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-node-app'},
        {key:'node_version',label:'Node Version',type:'select',options:['20','18','22'],default:'20'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'package_manager',label:'Package Manager',type:'select',options:['npm','pnpm','yarn'],default:'npm'},
        {key:'multi_stage',label:'Multi-stage Build',type:'checkbox',default:true},
      ],
      generateDockerfile(cfg){
        const pm=cfg.package_manager;
        const installCmd=pm==='pnpm'?'npm i -g pnpm && pnpm install':pm==='yarn'?'npm i -g yarn && yarn install --frozen-lockfile':'npm ci --only=production';
        const runCmd=pm==='pnpm'?'pnpm run build':pm==='yarn'?'yarn build':'npm run build';
        if(cfg.multi_stage){
          return `# Build stage
FROM node:${cfg.node_version}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN ${pm==='npm'?'npm ci':pm==='pnpm'?'npm i -g pnpm && pnpm install':'yarn install --frozen-lockfile'}
COPY . .
RUN ${runCmd}

# Production stage
FROM node:${cfg.node_version}-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
USER nextjs
EXPOSE ${cfg.port}
CMD ["node", "dist/index.js"]`;
        }
        return `FROM node:${cfg.node_version}-alpine
WORKDIR /app
COPY package*.json ./
RUN ${installCmd}
COPY . .
EXPOSE ${cfg.port}
CMD ["node", "index.js"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    environment:\n      - NODE_ENV=production\n    restart: unless-stopped`;
      }
    },
    python: {
      group: 'runtimes', label: 'Python', icon: 'devicon-python-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-python-app'},
        {key:'python_version',label:'Python Version',type:'select',options:['3.12','3.11','3.10'],default:'3.12'},
        {key:'port',label:'Port',type:'text',default:'8000'},
        {key:'framework',label:'Framework',type:'select',options:['fastapi','django','flask','generic'],default:'fastapi'},
        {key:'multi_stage',label:'Multi-stage Build',type:'checkbox',default:true},
      ],
      generateDockerfile(cfg){
        const cmds={fastapi:'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "'+cfg.port+'"]',django:'CMD ["python", "manage.py", "runserver", "0.0.0.0:'+cfg.port+'"]',flask:'CMD ["python", "app.py"]',generic:'CMD ["python", "main.py"]'};
        if(cfg.multi_stage){
          return `# Build stage
FROM python:${cfg.python_version}-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Production stage
FROM python:${cfg.python_version}-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .
EXPOSE ${cfg.port}
${cmds[cfg.framework]}`;
        }
        return `FROM python:${cfg.python_version}-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${cfg.port}
${cmds[cfg.framework]}`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    environment:\n      - PYTHONUNBUFFERED=1\n    restart: unless-stopped`;
      }
    },
    java: {
      group: 'runtimes', label: 'Java', icon: 'devicon-java-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-java-app'},
        {key:'java_version',label:'Java Version',type:'select',options:['21','17','11'],default:'21'},
        {key:'port',label:'Port',type:'text',default:'8080'},
        {key:'build_tool',label:'Build Tool',type:'select',options:['maven','gradle'],default:'maven'},
        {key:'multi_stage',label:'Multi-stage Build',type:'checkbox',default:true},
      ],
      generateDockerfile(cfg){
        const tool=cfg.build_tool;
        if(cfg.multi_stage){
          return `# Build stage
FROM eclipse-temurin:${cfg.java_version}-jdk AS builder
WORKDIR /app
COPY . .
RUN ${tool==='maven'?'./mvnw clean package -DskipTests':'./gradlew build -x test'}

# Production stage
FROM eclipse-temurin:${cfg.java_version}-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${cfg.port}
CMD ["java", "-jar", "app.jar"]`;
        }
        return `FROM eclipse-temurin:${cfg.java_version}-jdk
WORKDIR /app
COPY . .
RUN ${tool==='maven'?'./mvnw clean package -DskipTests':'./gradlew build -x test'}
EXPOSE ${cfg.port}
CMD ["java", "-jar", "target/*.jar"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    restart: unless-stopped`;
      }
    },
    go: {
      group: 'runtimes', label: 'Go', icon: 'devicon-go-original-wordmark', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-go-app'},
        {key:'go_version',label:'Go Version',type:'select',options:['1.22','1.21','1.20'],default:'1.22'},
        {key:'port',label:'Port',type:'text',default:'8080'},
        {key:'multi_stage',label:'Multi-stage Build',type:'checkbox',default:true},
      ],
      generateDockerfile(cfg){
        if(cfg.multi_stage){
          return `# Build stage
FROM golang:${cfg.go_version}-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main .

# Production stage
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/main /main
EXPOSE ${cfg.port}
CMD ["/main"]`;
        }
        return `FROM golang:${cfg.go_version}-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .
EXPOSE ${cfg.port}
CMD ["./main"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    restart: unless-stopped`;
      }
    },
    dotnet: {
      group: 'runtimes', label: '.NET', icon: 'devicon-dotnetcore-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-dotnet-app'},
        {key:'dotnet_version',label:'.NET Version',type:'select',options:['8.0','7.0','6.0'],default:'8.0'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'multi_stage',label:'Multi-stage Build',type:'checkbox',default:true},
      ],
      generateDockerfile(cfg){
        if(cfg.multi_stage){
          return `# Build stage
FROM mcr.microsoft.com/dotnet/sdk:${cfg.dotnet_version} AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

# Production stage
FROM mcr.microsoft.com/dotnet/aspnet:${cfg.dotnet_version}
WORKDIR /app
COPY --from=build /app .
EXPOSE ${cfg.port}
ENTRYPOINT ["dotnet", "MyApp.dll"]`;
        }
        return `FROM mcr.microsoft.com/dotnet/sdk:${cfg.dotnet_version}
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app
FROM mcr.microsoft.com/dotnet/aspnet:${cfg.dotnet_version}
WORKDIR /app
COPY --from=build /app .
EXPOSE ${cfg.port}
ENTRYPOINT ["dotnet", "MyApp.dll"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    restart: unless-stopped`;
      }
    },
    php: {
      group: 'runtimes', label: 'PHP', icon: 'devicon-php-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-php-app'},
        {key:'php_version',label:'PHP Version',type:'select',options:['8.3','8.2','8.1'],default:'8.3'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'server',label:'Server',type:'select',options:['apache','fpm'],default:'apache'},
      ],
      generateDockerfile(cfg){
        const base=cfg.server==='apache'?`php:${cfg.php_version}-apache`:`php:${cfg.php_version}-fpm`;
        return `FROM ${base}
WORKDIR /var/www/html
COPY . .
RUN docker-php-ext-install pdo pdo_mysql
EXPOSE ${cfg.port}`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    volumes:\n      - ./:/var/www/html\n    restart: unless-stopped`;
      }
    },
    ruby: {
      group: 'runtimes', label: 'Ruby', icon: 'devicon-ruby-plain', type: 'runtime',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-ruby-app'},
        {key:'ruby_version',label:'Ruby Version',type:'select',options:['3.3','3.2','3.1'],default:'3.3'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'multi_stage',label:'Multi-stage Build',type:'checkbox',default:true},
      ],
      generateDockerfile(cfg){
        if(cfg.multi_stage){
          return `# Build stage
FROM ruby:${cfg.ruby_version}-slim AS builder
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .

# Production stage
FROM ruby:${cfg.ruby_version}-slim
WORKDIR /app
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /app .
EXPOSE ${cfg.port}
CMD ["ruby", "app.rb"]`;
        }
        return `FROM ruby:${cfg.ruby_version}-slim
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
EXPOSE ${cfg.port}
CMD ["ruby", "app.rb"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    restart: unless-stopped`;
      }
    },

    // ── Databases ──────────────────────────
    postgres: {
      group: 'databases', label: 'PostgreSQL', icon: 'devicon-postgresql-plain', type: 'database',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['16-alpine','15-alpine','14-alpine'],default:'16-alpine'},
        {key:'port',label:'Port',type:'text',default:'5432'},
        {key:'db_name',label:'Database',type:'text',default:'appdb'},
        {key:'db_user',label:'User',type:'text',default:'admin'},
        {key:'db_password',label:'Password',type:'text',default:'changeme123'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'pgdata'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  postgres:\n    image: postgres:${cfg.image_version}\n    environment:\n      POSTGRES_DB: ${cfg.db_name}\n      POSTGRES_USER: ${cfg.db_user}\n      POSTGRES_PASSWORD: ${cfg.db_password}\n    ports:\n      - "${cfg.port}:5432"\n    volumes:\n      - ${cfg.volume_name}:/var/lib/postgresql/data\n    restart: unless-stopped`;
      }
    },
    mysql: {
      group: 'databases', label: 'MySQL', icon: 'devicon-mysql-plain', type: 'database',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['8.0','8.4','5.7'],default:'8.0'},
        {key:'port',label:'Port',type:'text',default:'3306'},
        {key:'db_name',label:'Database',type:'text',default:'appdb'},
        {key:'db_user',label:'User',type:'text',default:'admin'},
        {key:'db_password',label:'Password',type:'text',default:'changeme123'},
        {key:'root_password',label:'Root Password',type:'text',default:'rootpass123'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'mysqldata'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  mysql:\n    image: mysql:${cfg.image_version}\n    environment:\n      MYSQL_DATABASE: ${cfg.db_name}\n      MYSQL_USER: ${cfg.db_user}\n      MYSQL_PASSWORD: ${cfg.db_password}\n      MYSQL_ROOT_PASSWORD: ${cfg.root_password}\n    ports:\n      - "${cfg.port}:3306"\n    volumes:\n      - ${cfg.volume_name}:/var/lib/mysql\n    restart: unless-stopped`;
      }
    },
    mongodb: {
      group: 'databases', label: 'MongoDB', icon: 'devicon-mongodb-plain', type: 'database',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['7','6','5'],default:'7'},
        {key:'port',label:'Port',type:'text',default:'27017'},
        {key:'db_user',label:'User',type:'text',default:'admin'},
        {key:'db_password',label:'Password',type:'text',default:'changeme123'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'mongodata'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  mongodb:\n    image: mongo:${cfg.image_version}\n    environment:\n      MONGO_INITDB_ROOT_USERNAME: ${cfg.db_user}\n      MONGO_INITDB_ROOT_PASSWORD: ${cfg.db_password}\n    ports:\n      - "${cfg.port}:27017"\n    volumes:\n      - ${cfg.volume_name}:/data/db\n    restart: unless-stopped`;
      }
    },
    redis: {
      group: 'databases', label: 'Redis', icon: 'devicon-redis-plain', type: 'database',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['7-alpine','6-alpine','7'],default:'7-alpine'},
        {key:'port',label:'Port',type:'text',default:'6379'},
        {key:'password',label:'Password',type:'text',default:'',desc:'Leave empty for no password'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'redisdata'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        const passCmd=cfg.password?`\n    command: redis-server --requirepass ${cfg.password}`:'';
        return `  redis:\n    image: redis:${cfg.image_version}${passCmd}\n    ports:\n      - "${cfg.port}:6379"\n    volumes:\n      - ${cfg.volume_name}:/data\n    restart: unless-stopped`;
      }
    },
    elasticsearch: {
      group: 'databases', label: 'Elasticsearch', icon: 'devicon-elasticsearch-plain', type: 'database',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['8.12.0','8.11.0','7.17.16'],default:'8.12.0'},
        {key:'port',label:'Port',type:'text',default:'9200'},
        {key:'cluster_name',label:'Cluster Name',type:'text',default:'docker-cluster'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'esdata'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  elasticsearch:\n    image: elasticsearch:${cfg.image_version}\n    environment:\n      - discovery.type=single-node\n      - cluster.name=${cfg.cluster_name}\n      - ES_JAVA_OPTS=-Xms512m -Xmx512m\n      - xpack.security.enabled=false\n    ports:\n      - "${cfg.port}:9200"\n    volumes:\n      - ${cfg.volume_name}:/usr/share/elasticsearch/data\n    restart: unless-stopped`;
      }
    },

    // ── Web Servers / Reverse Proxies ──────────────────────────
    nginx: {
      group: 'webservers', label: 'Nginx', icon: 'devicon-nginx-original', type: 'webserver',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['alpine','latest','1.25-alpine'],default:'alpine'},
        {key:'http_port',label:'HTTP Port',type:'text',default:'80'},
        {key:'https_port',label:'HTTPS Port',type:'text',default:'443'},
        {key:'server_name',label:'Server Name',type:'text',default:'localhost'},
        {key:'upstream_port',label:'Upstream App Port',type:'text',default:'3000',desc:'Port of the app Nginx proxies to'},
      ],
      generateDockerfile(cfg){
        return `FROM nginx:${cfg.image_version}
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE ${cfg.http_port} ${cfg.https_port}`;
      },
      generateComposeService(cfg){
        return `  nginx:\n    image: nginx:${cfg.image_version}\n    ports:\n      - "${cfg.http_port}:80"\n      - "${cfg.https_port}:443"\n    volumes:\n      - ./nginx.conf:/etc/nginx/nginx.conf:ro\n    depends_on:\n      - app\n    restart: unless-stopped`;
      }
    },
    apache: {
      group: 'webservers', label: 'Apache', icon: 'devicon-apache-plain', type: 'webserver',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['2.4-alpine','2.4','latest'],default:'2.4-alpine'},
        {key:'port',label:'Port',type:'text',default:'80'},
        {key:'server_name',label:'Server Name',type:'text',default:'localhost'},
      ],
      generateDockerfile(cfg){
        return `FROM httpd:${cfg.image_version}
COPY ./public/ /usr/local/apache2/htdocs/
EXPOSE ${cfg.port}`;
      },
      generateComposeService(cfg){
        return `  apache:\n    image: httpd:${cfg.image_version}\n    ports:\n      - "${cfg.port}:80"\n    volumes:\n      - ./public:/usr/local/apache2/htdocs:ro\n    restart: unless-stopped`;
      }
    },
    caddy: {
      group: 'webservers', label: 'Caddy', icon: 'devicon-caddy-plain', type: 'webserver',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['2-alpine','2','latest'],default:'2-alpine'},
        {key:'http_port',label:'HTTP Port',type:'text',default:'80'},
        {key:'https_port',label:'HTTPS Port',type:'text',default:'443'},
        {key:'upstream_port',label:'Upstream App Port',type:'text',default:'3000'},
      ],
      generateDockerfile(cfg){
        return `FROM caddy:${cfg.image_version}
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE ${cfg.http_port} ${cfg.https_port}`;
      },
      generateComposeService(cfg){
        return `  caddy:\n    image: caddy:${cfg.image_version}\n    ports:\n      - "${cfg.http_port}:80"\n      - "${cfg.https_port}:443"\n    volumes:\n      - ./Caddyfile:/etc/caddy/Caddyfile:ro\n      - caddy_data:/data\n      - caddy_config:/config\n    restart: unless-stopped`;
      }
    },

    // ── Message Brokers ──────────────────────────
    rabbitmq: {
      group: 'brokers', label: 'RabbitMQ', icon: 'devicon-rabbitmq-original', type: 'broker',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['3-management-alpine','3-management','3-alpine'],default:'3-management-alpine'},
        {key:'port',label:'AMQP Port',type:'text',default:'5672'},
        {key:'management_port',label:'Management Port',type:'text',default:'15672'},
        {key:'user',label:'User',type:'text',default:'guest'},
        {key:'password',label:'Password',type:'text',default:'guest'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'rabbitmqdata'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  rabbitmq:\n    image: rabbitmq:${cfg.image_version}\n    environment:\n      RABBITMQ_DEFAULT_USER: ${cfg.user}\n      RABBITMQ_DEFAULT_PASS: ${cfg.password}\n    ports:\n      - "${cfg.port}:5672"\n      - "${cfg.management_port}:15672"\n    volumes:\n      - ${cfg.volume_name}:/var/lib/rabbitmq\n    restart: unless-stopped`;
      }
    },
    kafka: {
      group: 'brokers', label: 'Kafka', icon: 'devicon-apachekafka-plain', type: 'broker',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['7.6.0','7.5.0','7.4.0'],default:'7.6.0'},
        {key:'port',label:'Port',type:'text',default:'9092'},
        {key:'zookeeper_port',label:'Zookeeper Port',type:'text',default:'2181'},
        {key:'broker_id',label:'Broker ID',type:'text',default:'1'},
        {key:'topic',label:'Default Topic',type:'text',default:'my-topic'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  zookeeper:\n    image: confluentinc/cp-zookeeper:${cfg.image_version}\n    environment:\n      ZOOKEEPER_CLIENT_PORT: ${cfg.zookeeper_port}\n    ports:\n      - "${cfg.zookeeper_port}:${cfg.zookeeper_port}"\n\n  kafka:\n    image: confluentinc/cp-kafka:${cfg.image_version}\n    depends_on:\n      - zookeeper\n    environment:\n      KAFKA_BROKER_ID: ${cfg.broker_id}\n      KAFKA_ZOOKEEPER_CONNECT: zookeeper:${cfg.zookeeper_port}\n      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:${cfg.port}\n      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1\n    ports:\n      - "${cfg.port}:${cfg.port}"`;
      }
    },
    nats: {
      group: 'brokers', label: 'NATS', icon: 'devicon-natsdotio-plain', type: 'broker',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['2-alpine','2','latest'],default:'2-alpine'},
        {key:'port',label:'Client Port',type:'text',default:'4222'},
        {key:'monitor_port',label:'Monitor Port',type:'text',default:'8222'},
        {key:'http_port',label:'HTTP Port',type:'text',default:'8080'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  nats:\n    image: nats:${cfg.image_version}\n    ports:\n      - "${cfg.port}:4222"\n      - "${cfg.monitor_port}:8222"\n      - "${cfg.http_port}:8222"\n    command: "--http_port ${cfg.http_port}"\n    restart: unless-stopped`;
      }
    },

    // ── Monitoring & Observability ──────────────────────────
    prometheus: {
      group: 'monitoring', label: 'Prometheus', icon: 'devicon-prometheus-original', type: 'monitoring',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['latest','v2.50.0','v2.49.0'],default:'latest'},
        {key:'port',label:'Port',type:'text',default:'9090'},
        {key:'scrape_interval',label:'Scrape Interval',type:'select',options:['15s','30s','60s'],default:'15s'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'prometheus-data'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  prometheus:\n    image: prom/prometheus:${cfg.image_version}\n    ports:\n      - "${cfg.port}:9090"\n    volumes:\n      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro\n      - ${cfg.volume_name}:/prometheus\n    command:\n      - '--config.file=/etc/prometheus/prometheus.yml'\n      - '--storage.tsdb.retention.time=30d'\n    restart: unless-stopped`;
      }
    },
    grafana: {
      group: 'monitoring', label: 'Grafana', icon: 'devicon-grafana-plain', type: 'monitoring',
      fields: [
        {key:'image_version',label:'Version',type:'select',options:['latest','10.3.1','10.2.3'],default:'latest'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'admin_user',label:'Admin User',type:'text',default:'admin'},
        {key:'admin_password',label:'Admin Password',type:'text',default:'admin'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'grafana-data'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  grafana:\n    image: grafana/grafana:${cfg.image_version}\n    environment:\n      GF_SECURITY_ADMIN_USER: ${cfg.admin_user}\n      GF_SECURITY_ADMIN_PASSWORD: ${cfg.admin_password}\n    ports:\n      - "${cfg.port}:3000"\n    volumes:\n      - ${cfg.volume_name}:/var/lib/grafana\n      - ./grafana/provisioning:/etc/grafana/provisioning:ro\n    restart: unless-stopped`;
      }
    },
    elk: {
      group: 'monitoring', label: 'ELK Stack', icon: 'devicon-elasticsearch-plain', type: 'monitoring',
      fields: [
        {key:'elastic_version',label:'ELK Version',type:'select',options:['8.12.0','8.11.0','7.17.16'],default:'8.12.0'},
        {key:'es_port',label:'Elasticsearch Port',type:'text',default:'9200'},
        {key:'kibana_port',label:'Kibana Port',type:'text',default:'5601'},
        {key:'logstash_port',label:'Logstash Port',type:'text',default:'5044'},
        {key:'volume_name',label:'Volume Name',type:'text',default:'elk-data'},
      ],
      generateDockerfile(){return null},
      generateComposeService(cfg){
        return `  elasticsearch:\n    image: elasticsearch:${cfg.elastic_version}\n    environment:\n      - discovery.type=single-node\n      - xpack.security.enabled=false\n      - ES_JAVA_OPTS=-Xms512m -Xmx512m\n    ports:\n      - "${cfg.es_port}:9200"\n    volumes:\n      - ${cfg.volume_name}:/usr/share/elasticsearch/data\n    restart: unless-stopped\n\n  logstash:\n    image: logstash:${cfg.elastic_version}\n    ports:\n      - "${cfg.logstash_port}:5044"\n    volumes:\n      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro\n    depends_on:\n      - elasticsearch\n    restart: unless-stopped\n\n  kibana:\n    image: kibana:${cfg.elastic_version}\n    ports:\n      - "${cfg.kibana_port}:5601"\n    environment:\n      ELASTICSEARCH_HOSTS: http://elasticsearch:9200\n    depends_on:\n      - elasticsearch\n    restart: unless-stopped`;
      }
    },

    // ── Frontend Frameworks ──────────────────────────
    react: {
      group: 'frontend', label: 'React', icon: 'devicon-react-original', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-react-app'},
        {key:'node_version',label:'Node Version',type:'select',options:['20','18','22'],default:'20'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'package_manager',label:'Package Manager',type:'select',options:['npm','pnpm','yarn'],default:'npm'},
      ],
      generateDockerfile(cfg){
        return `# Build stage
FROM node:${cfg.node_version}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN ${cfg.package_manager==='pnpm'?'npm i -g pnpm && pnpm install':cfg.package_manager==='yarn'?'yarn install --frozen-lockfile':'npm ci'}
COPY . .
RUN ${cfg.package_manager==='pnpm'?'pnpm run build':cfg.package_manager==='yarn'?'yarn build':'npm run build'}

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:80"\n    restart: unless-stopped`;
      }
    },
    vue: {
      group: 'frontend', label: 'Vue.js', icon: 'devicon-vuejs-original', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-vue-app'},
        {key:'node_version',label:'Node Version',type:'select',options:['20','18','22'],default:'20'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'package_manager',label:'Package Manager',type:'select',options:['npm','pnpm','yarn'],default:'npm'},
      ],
      generateDockerfile(cfg){
        return `# Build stage
FROM node:${cfg.node_version}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN ${cfg.package_manager==='pnpm'?'npm i -g pnpm && pnpm install':cfg.package_manager==='yarn'?'yarn install --frozen-lockfile':'npm ci'}
COPY . .
RUN ${cfg.package_manager==='pnpm'?'pnpm run build':cfg.package_manager==='yarn'?'yarn build':'npm run build'}

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:80"\n    restart: unless-stopped`;
      }
    },
    angular: {
      group: 'frontend', label: 'Angular', icon: 'devicon-angularjs-plain', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-angular-app'},
        {key:'node_version',label:'Node Version',type:'select',options:['20','18'],default:'20'},
        {key:'port',label:'Port',type:'text',default:'3000'},
      ],
      generateDockerfile(cfg){
        return `# Build stage
FROM node:${cfg.node_version}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist/my-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:80"\n    restart: unless-stopped`;
      }
    },
    nextjs: {
      group: 'frontend', label: 'Next.js', icon: 'devicon-nextjs-plain', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-nextjs-app'},
        {key:'node_version',label:'Node Version',type:'select',options:['20','18','22'],default:'20'},
        {key:'port',label:'Port',type:'text',default:'3000'},
        {key:'package_manager',label:'Package Manager',type:'select',options:['npm','pnpm','yarn'],default:'npm'},
      ],
      generateDockerfile(cfg){
        return `# Build stage
FROM node:${cfg.node_version}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN ${cfg.package_manager==='pnpm'?'npm i -g pnpm && pnpm install':cfg.package_manager==='yarn'?'yarn install --frozen-lockfile':'npm ci'}
COPY . .
RUN ${cfg.package_manager==='pnpm'?'pnpm run build':cfg.package_manager==='yarn'?'yarn build':'npm run build'}

# Production stage
FROM node:${cfg.node_version}-alpine
WORKDIR /app
ENV NODE_ENV production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE ${cfg.port}
ENV PORT ${cfg.port}
CMD ["node", "server.js"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    environment:\n      - NODE_ENV=production\n    restart: unless-stopped`;
      }
    },
    nuxt: {
      group: 'frontend', label: 'Nuxt', icon: 'devicon-nuxtjs-plain', type: 'frontend',
      fields: [
        {key:'app_name',label:'App Name',type:'text',default:'my-nuxt-app'},
        {key:'node_version',label:'Node Version',type:'select',options:['20','18','22'],default:'20'},
        {key:'port',label:'Port',type:'text',default:'3000'},
      ],
      generateDockerfile(cfg){
        return `# Build stage
FROM node:${cfg.node_version}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:${cfg.node_version}-alpine
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE ${cfg.port}
CMD ["node", ".output/server/index.mjs"]`;
      },
      generateComposeService(cfg){
        return `  ${cfg.app_name}:\n    build: .\n    ports:\n      - "${cfg.port}:${cfg.port}"\n    environment:\n      - NODE_ENV=production\n    restart: unless-stopped`;
      }
    },
  };

  // ============================================================
  // GROUPS
  // ============================================================
  const GROUPS = {
    runtimes:   { label: 'Application Runtimes', icon: 'devicon-nodejs-plain', resources: ['nodejs','python','java','go','dotnet','php','ruby'] },
    databases:  { label: 'Databases', icon: 'devicon-docker-plain', resources: ['postgres','mysql','mongodb','redis','elasticsearch'] },
    webservers: { label: 'Web Servers / Proxies', icon: 'devicon-nginx-original', resources: ['nginx','apache','caddy'] },
    brokers:    { label: 'Message Brokers', icon: 'devicon-docker-plain', resources: ['rabbitmq','kafka','nats'] },
    monitoring: { label: 'Monitoring & Observability', icon: 'devicon-grafana-plain', resources: ['prometheus','grafana','elk'] },
    frontend:   { label: 'Frontend Frameworks', icon: 'devicon-react-original', resources: ['react','vue','angular','nextjs','nuxt'] },
  };

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
    els.selectedCount.textContent = selectedStacks.size;
    const show = selectedStacks.size > 0;
    els.configPlaceholder.style.display = show ? 'none' : '';
    els.outputOptions.style.display = show ? 'flex' : 'none';
    els.generateActions.style.display = show ? 'flex' : 'none';
    renderConfigSections();
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
    if (mode === 'compose') {
      generateComposeMode();
    } else {
      generateIndividualMode();
    }
    showToast(`Generated ${Object.keys(generatedFiles).length} files successfully!`);
  }

  function generateComposeMode() {
    let services = '';
    let dockerfiles = [];
    let volumes = {};

    for (const stackKey of selectedStacks) {
      const def = TECH_STACKS[stackKey];
      const cfg = configValues[stackKey];
      const service = def.generateComposeService(cfg);
      if (service) services += service + '\n\n';

      const dockerfile = def.generateDockerfile(cfg);
      if (dockerfile) {
        dockerfiles.push({ name: stackKey, content: dockerfile });
      }

      if (cfg.volume_name) volumes[cfg.volume_name] = {};
    }

    if (dockerfiles.length > 0) {
      dockerfiles.forEach(df => { generatedFiles[`Dockerfile.${df.name}`] = df.content; });
    }

    const volumeSection = Object.keys(volumes).length > 0 ? '\n\nvolumes:\n' + Object.keys(volumes).map(v => `  ${v}:`).join('\n') : '';
    generatedFiles['docker-compose.yml'] = `version: '3.8'\n\nservices:\n${services}${volumeSection}`;
    generatedFiles['.dockerignore'] = `node_modules\n.git\n.env\n*.log\n.DS_Store`;
  }

  function generateIndividualMode() {
    for (const stackKey of selectedStacks) {
      const def = TECH_STACKS[stackKey];
      const cfg = configValues[stackKey];
      const dockerfile = def.generateDockerfile(cfg);
      if (dockerfile) {
        generatedFiles[`Dockerfile.${stackKey}`] = dockerfile;
      }
    }

    let services = '';
    let volumes = {};
    for (const stackKey of selectedStacks) {
      const def = TECH_STACKS[stackKey];
      const cfg = configValues[stackKey];
      const service = def.generateComposeService(cfg);
      if (service) services += service + '\n\n';
      if (cfg.volume_name) volumes[cfg.volume_name] = {};
    }
    const volumeSection = Object.keys(volumes).length > 0 ? '\n\nvolumes:\n' + Object.keys(volumes).map(v => `  ${v}:`).join('\n') : '';
    if (services) generatedFiles['docker-compose.yml'] = `version: '3.8'\n\nservices:\n${services}${volumeSection}`;
    generatedFiles['.dockerignore'] = `node_modules\n.git\n.env\n*.log\n.DS_Store`;
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
    zip.generateAsync({ type: 'blob' }).then(blob => { saveAs(blob, 'docker-infrastructure.zip'); });
  }

  function showToast(message) {
    const existing = document.querySelector('.docker-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'docker-toast';
    toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
  }
})();
