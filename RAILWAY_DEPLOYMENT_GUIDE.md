# Railway Deployment Guide for Kitcho Family Loyalty Platform

This guide provides step-by-step instructions for deploying the Kitcho Family loyalty platform to Railway.app.

## Prerequisites

Before deployment, ensure you have:

1. A [Railway.app](https://railway.app) account
2. A [GitHub](https://github.com) account with your Kitcho Family repository
3. Access to create PostgreSQL databases on Railway
4. Access to set environment variables

## Deployment Steps

### 1. Setup PostgreSQL Database

1. In your Railway dashboard, click "New Project"
2. Select "PostgreSQL" from the template options
3. Once created, navigate to the "Variables" tab of your PostgreSQL service
4. Copy the `DATABASE_URL` value - you'll need this for your application configuration

### 2. Create Application Service

1. In your Railway dashboard, click "New Service" in your project
2. Select "GitHub Repo" to connect your repository
   - You may need to authorize Railway to access your GitHub repositories
   - Select your Kitcho Family repository
3. Railway will automatically detect your Procfile and configure the service accordingly

### 3. Configure Environment Variables

Navigate to the "Variables" tab of your application service and add the following environment variables:

```
NODE_ENV=production
SESSION_SECRET=your_secure_random_string
DATABASE_URL=your_postgresql_connection_string_from_step_1
```

Additional optional variables:
- `PORT`: Railway will automatically assign a port, but you can override it
- `LOG_LEVEL`: Set to `error`, `warn`, `info`, or `debug` (default is `info`)
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`: Only required for initial setup if no admin users exist

### 4. Deploy and Monitor

1. Railway will automatically deploy your application after configuration
2. The deployment process will:
   - Build your application
   - Run database migrations via the `migrate` process in Procfile
   - Start your application via the `web` process in Procfile
3. Monitor deployment logs for any issues
4. Once deployed, you can access your application at the URL provided by Railway

## Continuous Deployment

Railway automatically deploys when changes are pushed to your connected GitHub repository. The deployment process follows these steps:

1. Build the application
2. Run database migrations
3. Start the application server

## Troubleshooting

### Database Connection Issues

If the application cannot connect to the database:
1. Verify the `DATABASE_URL` environment variable is correctly set
2. Check that the PostgreSQL service is running
3. Ensure your IP is allowed in the database firewall settings

### Migration Failures

If database migrations fail:
1. Check application logs for specific error messages
2. Verify database schema compatibility
3. You can manually run migrations by connecting to your Railway shell:
   ```
   npx drizzle-kit push
   ```

### Application Startup Issues

If the application fails to start:
1. Check logs for error messages
2. Verify all required environment variables are set
3. Ensure the build process completed successfully

## Additional Features

### Custom Domains

To use a custom domain with your Railway deployment:
1. Go to your application service
2. Navigate to the "Settings" tab
3. Under "Domains", click "Generate Domain" or "Custom Domain"
4. Follow the instructions to configure your DNS settings

### Environment Variables

For sensitive data or configuration that shouldn't be in your codebase:
1. Go to the "Variables" tab of your service
2. Add your environment variables
3. Railway will automatically restart your service with the new variables

## Maintenance

### Database Backups

Railway PostgreSQL includes automatic backups. To restore a backup:
1. Go to your PostgreSQL service
2. Navigate to the "Backups" tab
3. Select the backup you want to restore
4. Click "Restore"

### Monitoring

Railway provides basic monitoring for your services:
1. CPU and memory usage
2. Logs
3. Deployment status

For more advanced monitoring, consider integrating external services like Datadog or New Relic.

## Resources

- [Railway Documentation](https://docs.railway.app/)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)
- [Custom Domains](https://docs.railway.app/deploy/exposing-your-app#domains)
- [Environment Variables](https://docs.railway.app/develop/variables)
- [Kitcho Family Documentation](/README.md)