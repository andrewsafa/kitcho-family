# Kitcho Family Mobile App

## Setup Instructions

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on Android:
- Install Android Studio and set up an emulator
- Run `npm run android`

4. Run on iOS (macOS only):
- Install Xcode
- Run `npm run ios`

## Environment Setup

1. Create a `.env` file in the mobile directory with:
```
API_URL=YOUR_REPLIT_APP_URL
```

## Features
- Customer registration
- View loyalty points and level
- Track rewards progress
- View special offers and benefits

## Development Notes
- Built with React Native + Expo
- Uses React Navigation for routing
- React Query for data fetching
- React Native Paper for UI components

## Troubleshooting
- If you encounter build issues, try:
  1. Clear Metro bundler cache: `npm start -- --reset-cache`
  2. Remove node_modules and reinstall: `rm -rf node_modules && npm install`
