import type { ExpoConfig } from "expo/config";

const appScheme = process.env.EXPO_APP_SCHEME ?? "dueflow";

const config: ExpoConfig = {
  name: "DueFlow",
  slug: "dueflow-mobile",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  scheme: appScheme,
  splash: {
    resizeMode: "contain",
    backgroundColor: "#101A33",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.dueflow.mobile",
  },
  android: {
    package: "com.dueflow.mobile",
  },
  plugins: ["expo-notifications"],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
    appScheme,
  },
};

export default config;
