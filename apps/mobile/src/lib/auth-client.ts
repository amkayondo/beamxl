import { expoClient } from "@better-auth/expo/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { mobileConfig } from "@/config";

export const authClient = createAuthClient({
  baseURL: mobileConfig.apiBaseUrl,
  plugins: [
    expoClient({
      scheme: mobileConfig.appScheme,
      storagePrefix: "dueflow",
      storage: {
        setItem: (key, value) => {
          SecureStore.setItem(key, value);
        },
        getItem: (key) => {
          return SecureStore.getItem(key) ?? null;
        },
      },
    }),
    magicLinkClient(),
  ],
});
