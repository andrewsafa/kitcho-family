# AWS Deployment Guide for Kitcho Family Loyalty Platform

This guide provides step-by-step instructions for deploying the Kitcho Family loyalty platform to Amazon Web Services (AWS).

## Prerequisites

Before deployment, ensure you have:

1. An [AWS Account](https://aws.amazon.com)
2. [AWS CLI](https://aws.amazon.com/cli/) installed and configured
3. Basic familiarity with AWS services
4. A GitHub repository with your Kitcho Family codebase

## Deployment Architecture

The recommended AWS architecture for the Kitcho Family application includes:

1. **Amazon RDS** for PostgreSQL database
2. **AWS Elastic Beanstalk** for application hosting
3. **Amazon S3** for static asset storage
4. **Amazon CloudFront** (optional) for content delivery
5. **AWS Certificate Manager** for SSL certificates

## Deployment Steps

### 1. Set Up Database with Amazon RDS

1. Navigate to the RDS console in AWS
2. Click "Create database"
3. Select "PostgreSQL" as the engine type
4. Choose appropriate settings:
   - Dev/Test for development environments
   - Production for production deployments
5. Configure storage and connectivity settings
6. Create a new security group or use existing
7. Configure database name and credentials
8. Create database
9. Once created, note the database endpoint and connection information

### 2. Configure Application for AWS

1. Create a `.ebextensions` directory in your project root
2. Create a configuration file `.ebextensions/01_env.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    DATABASE_URL: postgresql://username:password@rds-endpoint:5432/database_name
    SESSION_SECRET: your_secure_random_string
```

3. Create a Procfile in your project root (if not already present):

```
web: npm start
```

### 3. Deploy with Elastic Beanstalk

1. Install the EB CLI:
   ```
   pip install awsebcli
   ```

2. Initialize your EB application:
   ```
   eb init
   ```
   - Select your region
   - Create a new application or select existing
   - Select Node.js as the platform
   - Set up SSH for instance access (optional)

3. Create an environment:
   ```
   eb create
   ```
   - Enter environment name (e.g., kitcho-family-prod)
   - Enter DNS CNAME prefix (e.g., kitcho-family)
   - Select load balancer type (Application for production)

4. Deploy your application:
   ```
   eb deploy
   ```

5. Configure database migrations:
   - SSH into your EB instance: `eb ssh`
   - Navigate to the app directory
   - Run migrations manually: `npm run db:push`

### 4. Set Up S3 for Static Assets (Optional)

1. Create an S3 bucket for static assets
2. Configure CORS on the bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["https://your-eb-domain.elasticbeanstalk.com"],
    "ExposeHeaders": []
  }
]
```

3. Update your application code to use S3 for asset storage

### 5. Configure CI/CD with GitHub Actions

Create a file `.github/workflows/aws.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run TypeScript checks
        run: npm run check
        
      - name: Generate deployment package
        run: zip -r deploy.zip . -x "node_modules/*" "*.git*"
        
      - name: Deploy to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: kitcho-family
          environment_name: kitcho-family-prod
          region: us-east-1
          version_label: ${{ github.sha }}
          deployment_package: deploy.zip
```

## Configuration

### Environment Variables

Configure the following environment variables in your Elastic Beanstalk environment:

1. **Required:**
   - `NODE_ENV`: Set to "production"
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A secure random string

2. **Optional:**
   - `PORT`: Default is 5000 but EB typically uses 8080
   - `LOG_LEVEL`: Set to "error", "warn", "info", or "debug"
   - `AWS_S3_BUCKET`: If using S3 for asset storage

### Security Groups

Configure security groups to allow:
1. Inbound access to your Elastic Beanstalk application (port 80/443)
2. Communication between EB and RDS (PostgreSQL port 5432)

## Monitoring and Maintenance

### CloudWatch Logs

1. EB automatically integrates with CloudWatch
2. View logs in the CloudWatch console
3. Set up log-based alarms for error monitoring

### Health Checks

Elastic Beanstalk uses the following health check endpoints:
- `/healthz` - Basic health check
- `/api/health` - Comprehensive system status
- `/api/health/db` - Database connectivity

### Database Backups

1. Configure automated backups in RDS
2. Set appropriate backup retention period
3. Test restore procedures periodically

## Cost Optimization

1. Use t3.micro or t3.small instances for dev/test
2. Configure auto-scaling for production environments
3. Consider reserved instances for consistent workloads
4. Use RDS cost optimization strategies (e.g., reserved instances)

## Troubleshooting

### Application Deployment Issues

1. Check EB deployment logs: `eb logs`
2. Verify environment variables are set correctly
3. Test database connectivity
4. Check security group configurations

### Database Connection Problems

1. Verify RDS is in the same VPC as your EB environment
2. Check security group rules
3. Validate database credentials
4. Test connection from EB instance: `eb ssh` and use `pg_isready`

## Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Amazon RDS for PostgreSQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [Kitcho Family Documentation](/README.md)