# Railway Deployment Guide for Kitcho Family Loyalty Program

This guide walks you through the process of deploying the Kitcho Family Loyalty Program to Railway via GitHub.

## Prerequisites

1. A GitHub account
2. A Railway account (https://railway.app/)
3. Your Kitcho Family project code

## Step 1: Create a GitHub Repository

1. Go to GitHub (https://github.com) and log in to your account
2. Click on the "+" icon in the top-right corner and select "New repository"
3. Name your repository (e.g., "kitcho-family-loyalty")
4. Choose "Public" or "Private" repository visibility as needed
5. Click "Create repository"

## Step 2: Push Your Code to GitHub

1. Initialize Git in your project directory (if not already done):
   ```bash
   git init
   ```

2. Add all your files to the Git repository:
   ```bash
   git add .
   ```

3. Make your first commit:
   ```bash
   git commit -m "Initial commit"
   ```

4. Add your GitHub repository as a remote:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/kitcho-family-loyalty.git
   ```

5. Push your code to GitHub:
   ```bash
   git push -u origin main
   ```

## Step 3: Connect Railway to GitHub

1. Go to Railway (https://railway.app/) and log in to your account
2. Click on "New Project"
3. Select "Deploy from GitHub repo"
4. If you haven't connected your GitHub account yet, click "Connect GitHub" and follow the instructions
5. Once connected, select your "kitcho-family-loyalty" repository
6. Railway will automatically detect the railway.toml and Procfile configuration files

## Step 4: Add PostgreSQL Database on Railway

1. In your new Railway project, click on "New Service"
2. Select "Database" > "PostgreSQL"
3. Railway will provision a PostgreSQL database and automatically inject the `DATABASE_URL` as an environment variable

## Step 5: Configure Environment Variables

1. Click on your web service (the one deployed from GitHub)
2. Navigate to the "Variables" tab
3. Railway will have automatically added the `DATABASE_URL` from your PostgreSQL service
4. Add the following additional variables:
   - `NODE_ENV=production`
   - `SESSION_SECRET=your-secure-session-secret` (use a strong random string)

## Step 6: Run Database Migrations

In Railway, you can run a one-time command to set up your database schema:

1. Click on your web service
2. Go to the "Settings" tab
3. Scroll down to "Custom Deploy Command"
4. Enter: `npm run migrate`
5. Click "Save"
6. Deploy your application (this will run the migration first)

## Step 7: Monitor Deployment

1. Click on the "Deployments" tab to see the deployment progress
2. You can view logs to ensure everything is working correctly
3. Once deployed, click on the URL provided by Railway to open your application

## Step 8: Set Up a Custom Domain (Optional)

1. In your web service, navigate to the "Settings" tab
2. Scroll down to "Domains"
3. Click "Add Domain"
4. Enter your custom domain (e.g., kitchofamily.com)
5. Follow the DNS configuration instructions provided by Railway
6. Wait for DNS propagation (may take up to 24 hours)

## Step 9: Set Up Continuous Deployment

Railway automatically sets up continuous deployment. Whenever you push changes to your GitHub repository, Railway will automatically redeploy your application.

## Troubleshooting

### Database Connection Issues
- Verify that the `DATABASE_URL` environment variable is correctly set
- Check the database service is running in Railway

### Build Failures
- Check the deployment logs for specific error messages
- Ensure all required dependencies are listed in package.json
- Verify that the build script is correctly defined in railway.toml

### Runtime Errors
- View application logs in Railway's "Deployments" tab
- Look for error messages in the console
- Check the environment variables for any missing configurations

## Reverting to Previous Deployment

If a deployment fails or has issues:

1. Go to the "Deployments" tab
2. Find the last successful deployment
3. Click on the three dots menu (⋮)
4. Select "Redeploy"

## Best Practices

1. **Environment Variables**: Never commit sensitive information like API keys or passwords to your repository. Always use environment variables.

2. **Database Backups**: Regularly backup your database using Railway's PostgreSQL backup features.

3. **Monitoring**: Set up monitoring to track the performance and availability of your application.

4. **Error Tracking**: Consider adding error tracking tools like Sentry to catch and fix issues quickly.

5. **Security Headers**: Implement security headers for your application to protect against common web vulnerabilities.

## Support

If you encounter issues with Railway deployment, you can:
- Check Railway's documentation: https://docs.railway.app/
- Contact Railway support through their website
- Open an issue in your GitHub repository