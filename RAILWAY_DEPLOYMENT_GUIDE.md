# Railway Deployment Guide for Kitcho Family

This guide provides detailed instructions for deploying the Kitcho Family loyalty program to Railway.

## Prerequisites

1. A Railway account (https://railway.app/)
2. A GitHub repository with your project code
3. Basic familiarity with Git and GitHub
4. Node.js 18+ and npm installed locally (for testing)

## Overview

Railway offers the simplest deployment experience with GitHub integration and automated CI/CD. The project includes all necessary configuration files, allowing you to deploy with minimal setup.

## Step 1: Set Up a Railway Project

1. Log in to Railway using your GitHub account or email
2. Create a new project by clicking "New Project"
3. Select "Deploy from GitHub repo"
4. Select your repository from the list
5. Configure settings:
   - Select the main branch as your deployment branch
   - Enable automatic deployments

## Step 2: Add a PostgreSQL Database

1. In your project dashboard, click "New"
2. Select "Database" and then "PostgreSQL"
3. Railway will provision a PostgreSQL database for your project
4. Wait for the database to be created (this may take a few minutes)

Once created, Railway will automatically set the `DATABASE_URL` environment variable in your project.

## Step 3: Configure Environment Variables

1. Go to your project settings tab
2. Click on "Variables"
3. Add the following environment variables:
   - `NODE_ENV`: Set to `production`
   - `SESSION_SECRET`: A long, random string for secure sessions (e.g., use a password generator to create a 32+ character string)

Railway automatically adds several environment variables:
- `DATABASE_URL`: Generated when you provision a PostgreSQL database
- `PORT`: Assigned by Railway for your application to listen on
- `RAILWAY_STATIC_URL` or `RAILWAY_PUBLIC_URL`: The public URL of your deployed application

**Important**: Make sure to create and configure the PostgreSQL database BEFORE deploying your application. The application requires a valid DATABASE_URL to start properly.

## Step 4: Railway.toml Configuration

Your project includes the `railway.toml` file for Railway configuration:

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

[deploy.env]
NODE_ENV = "production"
PORT = "8080"
```

This configuration handles:
- Building the application with Nixpacks
- Running migrations before starting the application
- Health checks and automatic restarts
- Environment variables for production mode

## Step 5: Deploy Your Application

⚠️ **Important: Deployment Order Matters** ⚠️

For successful deployment, follow this specific order:

1. Set up the PostgreSQL database first
2. Configure all environment variables (NODE_ENV, SESSION_SECRET)
3. Then deploy your application

If you configured automatic deployments, Railway will automatically deploy your application whenever you push changes to your main branch. Otherwise:

1. Go to your project's "Deployments" tab
2. Click "Deploy Now"
3. Select the main branch
4. Wait for the deployment to complete

The deployment process typically takes 2-5 minutes, depending on Railway's current load and the complexity of your application.

## Step 6: Alternative Deployment Using Railway CLI

You can also deploy using the Railway CLI:

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
   railway up --detach
   ```

5. Monitor the deployment:
   ```bash
   railway status
   ```

## Step 7: Set Up Custom Domain (Optional)

1. Go to your project's "Settings" tab
2. Click on "Domains"
3. Add a custom domain
4. Follow Railway's instructions to configure your DNS settings
5. Wait for DNS propagation (this can take up to 48 hours)

## Health Check System

The application includes a comprehensive health check system with multiple endpoints:

- `/healthz`: Primary health check endpoint used by Railway (fast, reliable)
- `/api/health`: Comprehensive health check that includes database status
- `/api/health/db`: Dedicated database connection check

This multi-layered health check system ensures that Railway can properly verify your application's health and provides multiple ways to diagnose issues in production.

To check the health status after deployment:
```bash
curl https://your-app-url.railway.app/api/health
```

## Continuous Integration/Deployment (CI/CD)

The repository includes a GitHub Actions workflow for Railway deployment. To use it:

1. In your GitHub repository, go to Settings > Secrets and Variables > Actions
2. Add the following secret:
   - `RAILWAY_TOKEN`: Your Railway API token (from Railway CLI)

To get your Railway token:
1. Install the Railway CLI: `npm i -g @railway/cli`
2. Login to Railway: `railway login`
3. Generate a token: `railway whoami --token`

The workflow will:
1. Build and test your application
2. Deploy the application to Railway
3. Verify deployment with health checks
4. Provide deployment status in the GitHub Actions logs

## Database Migration Process

The application includes an enhanced database migration system with the following features:

- Platform detection for Railway-specific optimizations
- Progressive retry mechanism for reliable migrations
- Detailed logging and diagnostics
- Automatic verification of migration integrity

The migration process runs automatically during deployment with the command:
```bash
npm run migrate --omit=dev
```

To manually generate migrations after schema changes:
```bash
npm run generate
```

## Troubleshooting

If you encounter issues during deployment:

1. Check Railway logs for error messages
2. Verify environment variables are set correctly
3. Ensure your database is properly provisioned and linked
4. Verify the railway.toml configurations
5. Check that the DATABASE_URL is correctly set and accessible

### Common Issues and Solutions

#### Health Check Failures

If your deployment fails due to health check issues:

1. Verify that the health check path in railway.toml (`/healthz`) matches the actual endpoint in your application
2. Check the health check timeout value in railway.toml (currently set to 5000ms)
3. Check application logs to see if the server is starting properly
4. Try accessing the detailed health endpoint `/api/health` for more diagnostic information

#### Database Connection Issues

If your application can't connect to the database:

1. Make sure the PostgreSQL service is provisioned and running
2. Verify that the DATABASE_URL environment variable is correctly linked
3. Check if database migrations are running successfully 
4. Review logs for any SQL or connection errors
5. Try connecting to the database directly using psql to verify credentials

## Important Notes

- Railway provides an ephemeral filesystem. Any files written during runtime (like uploads) will not persist after application restarts. Use external storage services for persistent file storage.
- For production deployments, ensure that your SESSION_SECRET is a secure random string and is kept confidential.
- Monitor your application performance and logs in the Railway dashboard.

## Managing Database Backups

Railway doesn't provide automatic database backups for all tiers. Kitcho Family includes a built-in backup system:

1. The `backup-scheduler.ts` component can automate regular database backups
2. Configure it in the admin dashboard under "System Settings" > "Backup Configuration"
3. Set up email notifications for backup success/failure
4. You can also manually export data from the admin dashboard

## Scaling Your Application

As your application grows:

1. Upgrade your Railway plan for more resources
2. Enable multiple replicas in railway.toml (numReplicas setting)
3. Optimize your database queries and add indexes
4. Implement caching strategies for frequently accessed data
5. Consider using a CDN for static assets

## Performance Monitoring

To monitor your application's performance on Railway:

1. Check the "Metrics" tab in your project dashboard
2. Set up Uptime monitoring to receive alerts if your application goes down
3. Use the built-in logging to track errors and warnings
4. Set up GitHub Actions notifications for deployment failures