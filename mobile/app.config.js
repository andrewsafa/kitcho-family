export default {
  expo: {
    name: "Kitcho Family",
    slug: "kitcho-family",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.kitchofamily.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.kitchofamily.mobile",
      versionCode: 1,
      permissions: [
        "INTERNET"
      ]
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    extra: {
      apiUrl: process.env.API_URL || "https://kitcho-family.replit.app",
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};