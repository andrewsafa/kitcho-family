# Kitcho Family Deployment Guide

This guide provides step-by-step instructions for deploying the Kitcho Family loyalty program application to both Railway and AWS Elastic Beanstalk.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Railway Deployment](#railway-deployment)
- [AWS Elastic Beanstalk Deployment](#aws-elastic-beanstalk-deployment)
- [Database Migration Process](#database-migration-process)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

1. A PostgreSQL database provisioned
2. Node.js 18+ and npm installed locally
3. Git repository with the latest code
4. Railway or AWS account with appropriate permissions

## Environment Variables

The following environment variables are required for proper functioning:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Long random string for session encryption | Yes |
| `NODE_ENV` | Set to `production` for production deployments | Yes |
| `PORT` | Application port (if not using platform default) | No |
| `LOG_LEVEL` | Logging verbosity (defaults to "info") | No |

## Railway Deployment

Railway offers the simplest deployment experience with their GitHub integration.

### Method 1: Deploy via GitHub

1. Fork or push the repository to GitHub
2. Log in to [Railway Dashboard](https://railway.app/dashboard)
3. Create a new project and select "Deploy from GitHub repo"
4. Select your repository
5. Add a PostgreSQL service from the "New" button
6. Manually add the `SESSION_SECRET` environment variable
7. Deploy your project
8. Wait for the deployment to complete and access your application

### Method 2: Deploy via Railway CLI

1. Install the Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Log in to Railway:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Deploy the application:
   ```bash
   railway up
   ```

5. Monitor the deployment:
   ```bash
   railway status
   ```

### Railway Configuration

Railway uses the `railway.toml` file for configuration. The key settings are:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run generate && npm run build"

[deploy]
startCommand = "npm run migrate --omit=dev && NODE_ENV=production tsx server/index.ts"
healthcheckPath = "/healthz"
healthcheckTimeout = 5000
restartPolicyType = "on_failure"
numReplicas = 1
```

## AWS Elastic Beanstalk Deployment

### Method 1: Deploy via AWS Console

1. Package your application:
   ```bash
   npm run build
   npm run generate
   mkdir -p deploy
   cp -r dist deploy/
   cp -r migrations deploy/
   cp -r scripts deploy/
   cp -r .ebextensions deploy/
   cp -r public deploy/
   cp package.json package-lock.json Procfile deploy/
   cd deploy && zip -r ../deploy.zip .
   cd ..
   ```

2. Log in to [AWS Elastic Beanstalk Console](https://console.aws.amazon.com/elasticbeanstalk)
3. Create a new application or environment
4. Upload the `deploy.zip` file
5. Configure environment variables (DATABASE_URL, SESSION_SECRET)
6. Deploy and wait for the environment to be ready

### Method 2: Deploy via EB CLI

1. Install the EB CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize your EB configuration:
   ```bash
   eb init
   ```

3. Create an environment:
   ```bash
   eb create kitcho-family-production
   ```

4. Deploy your application:
   ```bash
   eb deploy
   ```

5. Set environment variables:
   ```bash
   eb setenv DATABASE_URL=postgres://... SESSION_SECRET=your-secret
   ```

### AWS Configuration

AWS Elastic Beanstalk uses the `.ebextensions/nodecommand.config` file:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm run migrate --omit=dev && NODE_ENV=production tsx server/index.ts"
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /healthz

container_commands:
  01_generate_migrations:
    command: "node scripts/generate-migrations.js"
  02_install_node_dependencies:
    command: "npm ci --omit=dev"
  03_build:
    command: "npm run build"
```

## Database Migration Process

The application handles database migrations automatically during deployment. The process:

1. Checks for the existence of migrations in the `./migrations` directory
2. Connects to the database specified in `DATABASE_URL`
3. Applies migrations with retry logic for reliability
4. Logs the migration process and any errors

To manually run migrations:

```bash
npm run migrate
```

To generate new migrations after schema changes:

```bash
npm run generate
```

## Health Checks

The application provides three health check endpoints:

- `/healthz`: Fast, simple health check for platform monitoring
- `/api/health`: Comprehensive health check with system components status
- `/api/health/db`: Database-specific health check

You can monitor these endpoints to ensure your application is running correctly:

```bash
curl https://your-app-url.com/api/health
```

## Troubleshooting

### Common Issues

#### Database Connection Failures
- Verify `DATABASE_URL` is correctly formatted and accessible from your deployment platform
- Check if database server is running and accepting connections
- Verify IP allowlisting if your database has network restrictions

#### Migration Failures
- Check migration logs for specific SQL errors
- Ensure the database user has sufficient privileges
- Try running migrations manually via `npm run migrate`

#### Application Not Starting
- Check the logs in your deployment platform
- Verify all required environment variables are set
- Ensure the PostgreSQL version is compatible (12+)

### Getting Support

If you encounter issues not covered in this guide:

1. Check the application logs on your deployment platform
2. Review the [GitHub issues](https://github.com/your-org/kitcho-family/issues)
3. Contact the development team for assistance

---

© Kitcho Family 2025