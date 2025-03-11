# Railway Deployment Guide for Kitcho Family

This guide outlines the step-by-step process to deploy the Kitcho Family loyalty program application to Railway.app using GitHub integration.

## Prerequisites

1. A GitHub account with your Kitcho Family repository
2. A Railway.app account
3. Basic familiarity with deploying Node.js applications

## Step 1: Prepare Your Repository

Before deploying, ensure your repository is ready:

- All code is committed and pushed to GitHub
- The `Procfile` is set up correctly (already configured with `web: npm run migrate && npm start`)
- The `railway.toml` configuration file is present (already configured)
- Database migrations are generated (using `scripts/generate-migrations.js`)

## Step 2: Connect Railway to GitHub

1. Log in to your Railway.app account
2. Navigate to the dashboard and click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose the GitHub repository containing your Kitcho Family application
5. Authorize Railway to access your GitHub repositories if prompted

## Step 3: Configure the Project in Railway

1. Once your project is created, navigate to the "Variables" tab
2. Add the following environment variables:
   - `SESSION_SECRET` - A secure random string for session management
   - `NODE_ENV` - Set to "production"
   - Any other environment variables your application requires

2. If not automatically provisioned, add a PostgreSQL database:
   - Click "New" and select "Database"
   - Choose "PostgreSQL"
   - Once provisioned, Railway will automatically add the `DATABASE_URL` variable to your project

## Step 4: Link Services

1. In your project, navigate to the "Settings" tab
2. Under "Linked Services," ensure your PostgreSQL database is linked to your application
3. This enables Railway to inject the correct `DATABASE_URL` environment variable

## Step 5: Deploy

1. Railway will automatically deploy your application based on the GitHub integration
2. If you need to trigger a deployment manually:
   - Navigate to the "Deployments" tab
   - Click "Deploy Now"

## Step 6: Verify Deployment

1. Once deployed, Railway will provide a URL for your application
2. Navigate to this URL to ensure your application is running correctly
3. Check the logs in the Railway dashboard to troubleshoot any issues

## Continuous Deployment

With GitHub integration, Railway will automatically deploy new changes when you push to your repository. The process works as follows:

1. You push changes to your GitHub repository
2. Railway detects the changes via webhook
3. Railway pulls the updated code and starts a new build
4. The build process follows the commands in your railway.toml file
5. Once built, Railway deploys the new version and updates the URL

## Database Migrations

The Procfile is configured to run migrations automatically before starting the application (`npm run migrate && npm start`). This ensures your database schema is always up-to-date.

## Troubleshooting

If you encounter issues during deployment:

1. Check Railway logs for error messages
2. Verify environment variables are set correctly
3. Ensure your database is properly provisioned and linked
4. Verify the Procfile and railway.toml configurations
5. Check that the DATABASE_URL is correctly set and accessible

## Important Notes

- Railway provides an ephemeral filesystem. Any files written during runtime (like uploads) will not persist after application restarts. Use external storage services for persistent file storage.
- For production deployments, ensure that your SESSION_SECRET is a secure random string and is kept confidential.
- Monitor your application performance and logs in the Railway dashboard.