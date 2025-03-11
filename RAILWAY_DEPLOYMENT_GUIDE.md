# Railway Deployment Guide

This guide provides detailed instructions for deploying the Kitcho Family loyalty program to Railway.

## Prerequisites

1. A Railway account (https://railway.app/)
2. A GitHub repository with your project code
3. Basic familiarity with Git and GitHub
4. Node.js and npm installed locally (for testing)

## Step 1: Set Up a Railway Project

1. Log in to Railway using your GitHub account or email
2. Create a new project by clicking "New Project"
3. Select "Deploy from GitHub repo"
4. Select your repository from the list
5. Configure settings:
   - Select the main branch as your deployment branch
   - Enable automatic deployments
   - Choose "MVC+API" as your project type (if prompted)

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
- `RAILWAY_STATIC_URL`: The public URL of your deployed application
- `RAILWAY_SERVICE_ID`: The unique ID of your service

**Important**: Make sure to create and configure the PostgreSQL database BEFORE deploying your application. The application requires a valid DATABASE_URL to start properly.

## Step 4: Configure Deployment Settings

1. Open your project settings
2. Go to the "Settings" tab
3. Verify the following settings:
   - Build Command: `npm run build`
   - Start Command: `npm run migrate && npm start`
   - Root Directory: `/` (default)
   - Health Check Path: `/healthz` (preferred) or `/` (alternative)
   - Health Check Timeout: `300` (milliseconds)

These settings are already configured in the `railway.toml` file in your repository. The application includes dedicated health check endpoints at both `/healthz` and `/` to ensure Railway can properly verify that your application is running.

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

## Step 6: Set Up Custom Domain (Optional)

1. Go to your project's "Settings" tab
2. Click on "Domains"
3. Add a custom domain
4. Follow Railway's instructions to configure your DNS settings
5. Wait for DNS propagation (this can take up to 48 hours)

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
3. Railway pulls the updated code and starts a new build
4. The build process follows the commands in your railway.toml file
5. Once built, Railway deploys the new version and updates the URL

## Database Migrations

The Procfile is configured to run migrations automatically before starting the application (`npm run migrate && npm start`). This ensures your database schema is always up-to-date.

## Important Notes on package.json

Note that the package.json contains the following scripts that are used for deployment:

```json
"scripts": {
  "dev": "tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "migrate": "tsx server/migrate.ts",
  "generate": "drizzle-kit generate:pg"
}
```

These scripts handle:
- Building the application (`npm run build`)
- Running database migrations (`npm run migrate`) 
- Starting the server (`npm start`)
- Generating migrations (`npm run generate`)

## Troubleshooting

If you encounter issues during deployment:

1. Check Railway logs for error messages
2. Verify environment variables are set correctly
3. Ensure your database is properly provisioned and linked
4. Verify the Procfile and railway.toml configurations
5. Check that the DATABASE_URL is correctly set and accessible

### Common Issues and Solutions

#### Health Check Failures

If your deployment fails due to health check issues:

1. Verify that the health check path in railway.toml (`/healthz`) matches the actual endpoint in your application
2. Increase the health check timeout value in railway.toml (currently set to 300ms)
3. Check application logs to see if the server is starting properly
4. Ensure the application is binding to the correct port (Railway sets PORT environment variable)

#### Database Connection Issues

If your application can't connect to the database:

1. Make sure the PostgreSQL service is provisioned and running
2. Verify that the DATABASE_URL environment variable is correctly linked
3. Check if database migrations are running successfully 
4. Review logs for any SQL or connection errors

## Important Notes

- Railway provides an ephemeral filesystem. Any files written during runtime (like uploads) will not persist after application restarts. Use external storage services for persistent file storage.
- For production deployments, ensure that your SESSION_SECRET is a secure random string and is kept confidential.
- Monitor your application performance and logs in the Railway dashboard.

## Managing Database Backups

Railway doesn't provide automatic database backups for all tiers. Consider implementing the following:

1. Use the backup-scheduler.ts in your application to automate regular database backups
2. Configure email notifications for backup success/failure
3. Store backups in secure cloud storage

## Scaling Your Application

As your application grows:

1. Upgrade your Railway plan for more resources
2. Consider using a CDN for static assets
3. Optimize your database queries
4. Implement caching strategies