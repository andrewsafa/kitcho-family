# Kitcho Family Loyalty Program

## Web Application
The web version is currently running and can be accessed at your deployed Replit URL.

## Deployment to Railway with GitHub

This application is configured for easy deployment to Railway with GitHub integration. Below is a quick overview of the deployment process:

### Prerequisites
- GitHub repository with your code
- Railway account (https://railway.app)
- PostgreSQL database (can be provisioned on Railway)

### Deployment Files
The repository includes all necessary deployment files:

1. `railway.toml` - Railway configuration
   - Build and deployment settings
   - Health check configuration
   - Environment variables

2. `Procfile` - Process file for deployment
   - Web process command
   - Database migration commands

3. `.github/workflows/railway.yml` - GitHub Actions workflow
   - Automated CI/CD pipeline
   - Test and deployment steps
   - Verification of deployment

### Health Checks
The application includes built-in health check endpoints:
- `/healthz` - Primary health check (fast)
- `/api/health` - Comprehensive system health
- `/api/health/db` - Database connection status

### Deployment Process
1. Connect your GitHub repository to Railway
2. Set up a PostgreSQL database in Railway
3. Configure environment variables (NODE_ENV, SESSION_SECRET)
4. Deploy the application
5. Monitor logs and health status

### Database Migrations
Migrations run automatically during deployment through our dedicated migration script:
```
tsx server/migrate.ts
```

This script:
1. Verifies database connection
2. Applies schema changes via drizzle-kit
3. Initializes customer verification codes and passwords
4. Reports migration status

For detailed instructions, see [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md).

## Mobile Application Development
To develop the mobile version:

1. Create a new React Native project using Expo:
```bash
npx create-expo-app KitchoFamilyMobile
cd KitchoFamilyMobile
```

2. Install required dependencies:
```bash
npx expo install react-native-paper @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage
```

3. Copy the shared types and schemas:
- Copy `shared/schema.ts` to your mobile project
- Update API endpoints to point to your deployed web application

4. Development:
```bash
npx expo start
```

### Android Development Setup Guide

#### 1. System Requirements
- Windows/Mac/Linux operating system
- Minimum 8GB RAM (16GB recommended)
- At least 10GB free disk space

#### 2. Install Android Studio
1. Download Android Studio from [developer.android.com/studio](https://developer.android.com/studio)
2. Run the installer and follow these steps:
   - Choose "Custom" installation
   - Select all the following components:
     - Android SDK
     - Android SDK Platform
     - Performance (Intel HAXM)
     - Android Virtual Device
   - Choose installation location (remember this path)

#### 3. Configure Environment Variables
1. Set ANDROID_HOME environment variable:
   - Windows:
     ```
     setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
     ```
   - macOS/Linux:
     ```
     export ANDROID_HOME=$HOME/Android/Sdk
     ```

2. Add platform-tools to PATH:
   - Windows: Add `%LOCALAPPDATA%\Android\Sdk\platform-tools`
   - macOS/Linux: Add `$HOME/Android/Sdk/platform-tools`

#### 4. Create Android Virtual Device (AVD)
1. Open Android Studio
2. Click "More Actions" > "Virtual Device Manager"
3. Click "Create Device"
4. Select a phone definition (e.g., Pixel 4)
5. Download and select a system image (recommend API 34)
6. Complete AVD creation

#### 5. Testing Your Setup
1. Start the Android emulator
2. Run the following commands:
```bash
adb devices  # Should list your emulator
npx expo start --android  # Start your app in the emulator
```

### Google Play Store Preparation

#### 1. Required Assets
- App Icon (512x512 PNG)
- Feature Graphic (1024x500 PNG)
- Screenshots (minimum 2):
  - Phone: 16:9 aspect ratio
  - Tablet: 16:10 aspect ratio
- App Bundle (generated via `eas build`)

#### 2. Store Listing Requirements
- App Title (50 characters)
- Short Description (80 characters)
- Full Description (4000 characters)
- App Category
- Content Rating
- Privacy Policy URL
- Contact Information

#### 3. Technical Requirements
- Target API Level 34
- App Bundle format
- App signing by Google Play
- Data safety disclosure

#### 4. Publishing Steps
1. Create Google Play Developer account
2. Set up app signing
3. Create app in Play Console
4. Complete store listing
5. Upload app bundle
6. Submit for review

### Important Notes:
- Test thoroughly on both platforms before submission
- Prepare marketing materials (screenshots, descriptions)
- Plan for app updates and maintenance
- Consider implementing analytics for tracking user engagement

### App Store Assets Checklist
1. Required Images:
   - App Icon (multiple sizes)
   - Screenshots for different devices
   - Feature graphic (Play Store)
   - Promotional graphics

2. Text Content:
   - App name
   - Short description
   - Full description
   - Keywords
   - Privacy policy URL
   - Support URL

3. Media:
   - Promotional video (optional)
   - Preview video (optional)

4. Technical Information:
   - Content rating questionnaire
   - Export compliance
   - Data privacy declarations

### Mobile Features
- Customer registration and login
- View loyalty points and level
- Receive push notifications for:
  - Points updates
  - Special events
  - Special offers
- View transaction history
- Access level benefits

### Publishing
1. iOS App Store Requirements:
- Apple Developer Account ($99/year)
- XCode for building iOS version
- App Store Connect setup

2. Google Play Store Requirements:
- Google Play Developer Account ($25 one-time)
- Android Studio for building Android version
- Google Play Console setup

### Steps to Publish

#### iOS App Store:
1. Configure app settings in Xcode:
   - Bundle identifier
   - Version number
   - Required device capabilities
2. Create certificates and provisioning profiles
3. Build and archive app
4. Submit through App Store Connect

#### Google Play Store:
1. Generate signed APK/Android App Bundle
2. Create Play Store listing
3. Submit app for review
4. Monitor release status