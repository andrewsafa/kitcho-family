# AWS Elastic Beanstalk Deployment Guide

This guide walks you through deploying the Kitcho Family loyalty program to AWS Elastic Beanstalk with an RDS PostgreSQL database.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. EB CLI installed (`pip install awsebcli`)
4. Git repository with your application code

## Step 1: Prepare Your Application

Ensure your application is properly configured for AWS deployment:

- The `.ebextensions/nodecommand.config` file is present and correctly configured
- Your `package.json` has the appropriate scripts for building and running the application
- Database migration scripts are in place

### Important Notes on package.json

Note that the package.json file contains two scripts sections. The following scripts should be used for deployment:

```json
"scripts": {
  "build": "vite build",
  "dev": "tsx watch server/index.ts",
  "start": "NODE_ENV=production tsx server/index.ts",
  "migrate": "tsx server/migrate.ts",
  "generate": "drizzle-kit generate:pg",
  "studio": "drizzle-kit studio"
}
```

These scripts handle:
- Building the application (`npm run build`)
- Running database migrations (`npm run migrate`) 
- Starting the server (`npm start`)
- Generating migrations (`npm run generate`)

## Step 2: Initialize Elastic Beanstalk Application

```bash
# Initialize EB project
eb init

# When prompted:
# - Select your region
# - Create a new application (or select existing)
# - Select Node.js platform
# - Choose to use CodeCommit (optional)
# - Set up SSH for instance access (recommended)
```

## Step 3: Create RDS Database

1. Go to AWS RDS Console
2. Click "Create database"
3. Select PostgreSQL
4. Choose appropriate settings for your needs:
   - Dev/Test for development environments
   - Production for production environments
5. Configure instance specifications:
   - DB instance class (e.g., db.t3.micro for development)
   - Multi-AZ deployment (recommended for production)
6. Configure storage:
   - Allocated storage (start with 20GB for development)
   - Enable storage autoscaling for production
7. Set up connectivity:
   - Select your VPC (default is fine for getting started)
   - Create a new security group
   - Set public accessibility according to your needs (No for production)
8. Configure authentication:
   - Set master username and password
9. Additional configuration:
   - Database name: `kitcho_family`
   - Backup retention (recommended for production)
   - Monitoring options as needed
10. Create database

## Step 4: Connect Your Application to RDS

You need to provide the database connection string to your application:

1. In the EB Console, go to your environment
2. Click on "Configuration"
3. Under "Software," click "Edit"
4. Add an environment property:
   - Key: `DATABASE_URL`
   - Value: `postgresql://username:password@your-db-endpoint:5432/kitcho_family`
5. Add another environment property:
   - Key: `SESSION_SECRET`
   - Value: A secure random string
6. Apply changes

## Step 5: Create Elastic Beanstalk Environment

```bash
# Create EB environment
eb create kitcho-family-production

# When prompted:
# - Enter DNS CNAME prefix (or accept default)
# - Choose load balancer type (Application for production)
# - Select whether to enable Spot Instance requests (optional cost-saving)
```

## Step 6: Deploy Your Application

```bash
# Deploy your application
eb deploy
```

## Step 7: Configure Security Groups

Ensure RDS and EB can communicate:

1. In AWS Console, go to EC2 > Security Groups
2. Find the security group for your EB environment
3. Find the security group for your RDS instance
4. Edit the RDS security group to allow inbound traffic on port 5432 from the EB security group

## Step 8: Verify Deployment

1. Once deployment is complete, visit your application:
```bash
eb open
```

2. Check logs if there are issues:
```bash
eb logs
```

## Setting Up Custom Domain (Optional)

1. Register a domain in Route 53 or use an existing domain
2. In Route 53, create a new record:
   - Type: CNAME (or use an Alias if pointing to an ELB)
   - Name: Your subdomain (e.g., app.yourdomain.com)
   - Value: Your EB environment URL

## Setting Up HTTPS (Optional)

1. In EB Console, go to your environment
2. Click on "Configuration"
3. Under "Load balancer," click "Edit"
4. Add a listener:
   - Port: 443
   - Protocol: HTTPS
   - SSL certificate: Select from ACM or upload a new one
5. Apply changes

## Automated Deployments with GitHub Actions

The repository includes a pre-configured GitHub Actions workflow for AWS deployment. To use it:

1. In your GitHub repository, go to Settings > Secrets and Variables > Actions
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `AWS_REGION`: Your AWS region (e.g., us-east-1)

The workflow will:
- Build your application
- Generate database migrations
- Deploy to Elastic Beanstalk

## Database Backups and Maintenance

1. In RDS Console, ensure automated backups are enabled
2. Set up a backup window during low-traffic periods
3. Configure maintenance windows for database updates

## Monitoring

1. Enable CloudWatch monitoring for your EB environment
2. Set up alarms for critical metrics (CPU, memory, disk space)
3. Consider setting up enhanced monitoring for RDS

## Cost Management

1. Use Reserved Instances for production environments to reduce costs
2. Consider using Spot Instances for non-critical environments
3. Set up AWS Budgets to monitor and alert on costs
4. Regularly review and terminate unused resources

## Troubleshooting Common Issues

### Database Connection Issues
- Verify security group settings
- Check DATABASE_URL environment variable
- Ensure RDS instance is in the 'Available' state

### Deployment Failures
- Check EB deployment logs: `eb logs`
- Verify application build process works locally
- Check for disk space issues on the EB instance

### Performance Issues
- Scale up or out your EB environment
- Check RDS performance metrics
- Consider adding caching layers (ElastiCache)