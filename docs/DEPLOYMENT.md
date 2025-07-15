# Deployment Guide

## Overview

Exhell uses a comprehensive CI/CD pipeline with multiple environments and deployment strategies.

## Environments

### Development (Local)
- Run locally with Docker Compose
- Uses local PostgreSQL and Redis instances
- Hot reloading enabled

### Staging
- Deployed to Vercel
- Uses Vercel's preview deployments
- Automatic deployment on `develop` branch push

### Production
- Deployed to AWS ECS with Fargate
- Uses RDS PostgreSQL and ElastiCache Redis
- CloudFront CDN for static assets
- Auto-scaling enabled

## CI/CD Pipeline

### GitHub Actions Workflows

1. **CI Pipeline** (`ci.yml`)
   - Runs on every push and PR
   - Linting and TypeScript checks
   - Unit and integration tests
   - Security scanning
   - Build verification

2. **Staging Deployment** (`deploy-staging.yml`)
   - Triggers on push to `develop` branch
   - Deploys to Vercel
   - Creates preview URLs for PRs

3. **Production Deployment** (`deploy-production.yml`)
   - Triggers on push to `main` branch
   - Builds Docker image
   - Pushes to ECR
   - Updates ECS service
   - Invalidates CloudFront cache

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### Without Docker

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Deployment Process

### Deploy to Staging

```bash
# Automatic deployment on push to develop branch
git push origin develop

# Manual deployment
./scripts/deploy.sh staging
```

### Deploy to Production

```bash
# Automatic deployment on push to main branch
git push origin main

# Manual deployment
./scripts/deploy.sh production
```

### Rollback

```bash
# Rollback staging
./scripts/rollback.sh staging

# Rollback production
./scripts/rollback.sh production
```

## Infrastructure

### AWS Resources

The infrastructure is managed with Terraform:

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply
```

### Key AWS Services

1. **ECS Fargate** - Container orchestration
2. **RDS PostgreSQL** - Database
3. **ElastiCache Redis** - Caching and sessions
4. **S3** - File storage
5. **CloudFront** - CDN
6. **ALB** - Load balancing
7. **Route53** - DNS management
8. **ACM** - SSL certificates
9. **Secrets Manager** - Secure credential storage
10. **CloudWatch** - Monitoring and logs

## Environment Variables

### Required Secrets

Set these in GitHub Secrets for CI/CD:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - NextAuth secret key
- `OPENAI_API_KEY` - OpenAI API key
- `TOSS_SECRET_KEY` - TossPayments secret key
- `TOSS_WEBHOOK_SECRET` - TossPayments webhook secret
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `VERCEL_TOKEN` - Vercel deployment token
- `SLACK_WEBHOOK_URL` - Slack notifications

## Monitoring

### CloudWatch Dashboard

Access the CloudWatch dashboard to monitor:
- ECS service metrics
- ALB request metrics
- RDS performance
- Redis metrics
- Application logs

### Alerts

Configured alerts for:
- High CPU/Memory usage
- Unhealthy ECS tasks
- Database connection issues
- High error rates

## Security

### Best Practices

1. All secrets stored in AWS Secrets Manager
2. SSL/TLS encryption for all traffic
3. WAF rules for DDoS protection
4. VPC with private subnets for ECS tasks
5. Security groups with minimal access
6. Regular security scanning in CI/CD

### Updates

Keep dependencies updated:

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
```

## Troubleshooting

### Common Issues

1. **Deployment fails**
   - Check GitHub Actions logs
   - Verify AWS credentials
   - Check ECS service events

2. **Health check fails**
   - Check database connectivity
   - Verify environment variables
   - Check application logs

3. **Performance issues**
   - Review CloudWatch metrics
   - Check auto-scaling settings
   - Analyze slow query logs

### Logs

Access logs via:

```bash
# ECS logs
aws logs tail /ecs/exhell-app --follow

# RDS logs
aws logs tail /aws/rds/instance/exhell-db/postgresql --follow
```

## Cost Optimization

1. Use scheduled scaling for non-business hours
2. Enable S3 lifecycle policies
3. Use reserved instances for RDS
4. Monitor unused resources
5. Enable cost alerts

## Backup and Recovery

1. **Database Backups**
   - Automated daily backups
   - 30-day retention
   - Point-in-time recovery enabled

2. **Disaster Recovery**
   - Multi-AZ RDS deployment
   - ECS tasks across multiple AZs
   - S3 cross-region replication available

## Maintenance

### Regular Tasks

1. Review and rotate secrets quarterly
2. Update dependencies monthly
3. Review CloudWatch logs weekly
4. Test backup restoration quarterly
5. Update infrastructure as needed