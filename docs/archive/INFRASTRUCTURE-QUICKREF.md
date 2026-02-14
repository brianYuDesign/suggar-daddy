# Infrastructure Quick Reference

## 🚀 Quick Start

```bash
# Start all infrastructure services
docker-compose up -d postgres redis zookeeper kafka

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres redis kafka zookeeper

# Stop services
docker-compose stop postgres redis zookeeper kafka
```

## 🔗 Connection Strings

### From Host Machine (Local Development)
```bash
# PostgreSQL
postgresql://postgres:postgres@localhost:5432/suggar_daddy

# Redis
redis://localhost:6379

# Kafka
localhost:9094

# Zookeeper
localhost:2181
```

### From Docker Containers
```bash
# PostgreSQL
postgresql://postgres:postgres@postgres:5432/suggar_daddy

# Redis
redis://redis:6379

# Kafka
kafka:9092

# Zookeeper
zookeeper:2181
```

## 🧪 Health Check Commands

```bash
# PostgreSQL
docker exec suggar-daddy-postgres pg_isready -U postgres

# Redis
docker exec suggar-daddy-redis redis-cli ping

# Kafka
docker exec suggar-daddy-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# All services
docker-compose ps
```

## 📊 Useful Commands

### PostgreSQL
```bash
# Connect to database
docker exec -it suggar-daddy-postgres psql -U postgres -d suggar_daddy

# Run SQL query
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT version();"

# List databases
docker exec suggar-daddy-postgres psql -U postgres -c "\l"

# Backup database
docker exec suggar-daddy-postgres pg_dump -U postgres suggar_daddy > backup.sql

# Restore database
cat backup.sql | docker exec -i suggar-daddy-postgres psql -U postgres -d suggar_daddy
```

### Redis
```bash
# Connect to Redis CLI
docker exec -it suggar-daddy-redis redis-cli

# Get all keys
docker exec suggar-daddy-redis redis-cli KEYS "*"

# Monitor commands
docker exec suggar-daddy-redis redis-cli MONITOR

# Get info
docker exec suggar-daddy-redis redis-cli INFO
```

### Kafka
```bash
# List topics
docker exec suggar-daddy-kafka kafka-topics --list --bootstrap-server localhost:9092

# Create topic
docker exec suggar-daddy-kafka kafka-topics --create --topic my-topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1

# Describe topic
docker exec suggar-daddy-kafka kafka-topics --describe --topic my-topic --bootstrap-server localhost:9092

# Produce message
docker exec -it suggar-daddy-kafka kafka-console-producer --topic my-topic --bootstrap-server localhost:9092

# Consume messages
docker exec -it suggar-daddy-kafka kafka-console-consumer --topic my-topic --from-beginning --bootstrap-server localhost:9092

# Delete topic
docker exec suggar-daddy-kafka kafka-topics --delete --topic my-topic --bootstrap-server localhost:9092
```

## 🔧 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]

# Rebuild and start
docker-compose up -d --build [service-name]
```

### Port Already in Use
```bash
# Find process using port
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9092  # Kafka
lsof -i :2181  # Zookeeper

# Note the PID and stop the process if needed
```

### Clear All Data (⚠️ Destructive)
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove specific volume
docker volume rm suggar-daddy_postgres_data
```

### Container Won't Stop
```bash
# Force remove
docker rm -f suggar-daddy-postgres
docker rm -f suggar-daddy-redis
docker rm -f suggar-daddy-kafka
docker rm -f suggar-daddy-zookeeper
```

## 📈 Monitoring

### Resource Usage
```bash
# Real-time stats
docker stats

# Check disk usage
docker system df

# Check specific container
docker stats suggar-daddy-postgres
```

### Logs
```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f postgres

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00
```

## 🔐 Security Notes

⚠️ **Development Environment Only**
- Using default passwords
- No encryption configured
- No authentication on Redis
- PLAINTEXT protocol on Kafka

✅ **For Production:**
- Change all default passwords
- Enable SSL/TLS
- Configure authentication
- Set resource limits
- Use secrets management
- Enable audit logging

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
