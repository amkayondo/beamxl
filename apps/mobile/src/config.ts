import Constants from "expo-constants";

type ExpoExtra = {
  apiBaseUrl?: string;
  appScheme?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const mobileConfig = {
  apiBaseUrl: extra.apiBaseUrl ?? "http://localhost:3000",
  appScheme: extra.appScheme ?? "dueflow",
};
