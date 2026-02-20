import { useEffect } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { trpcClient } from "@/lib/trpc";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  }),
});

function normalizePlatform() {
  return Device.osName === "iOS" ? "IOS" : "ANDROID";
}

export function usePushRegistration(input: {
  enabled: boolean;
  orgId: string | null;
  appVersion: string;
}) {
  useEffect(() => {
    if (!input.enabled || !input.orgId) {
      return;
    }
    const orgId = input.orgId;

    let mounted = true;

    const register = async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        let finalStatus = permission.status;

        if (finalStatus !== "granted") {
          const request = await Notifications.requestPermissionsAsync();
          finalStatus = request.status;
        }

        if (finalStatus !== "granted" || !mounted) {
          return;
        }

        const pushToken = await Notifications.getExpoPushTokenAsync();
        if (!pushToken.data || !mounted) {
          return;
        }

        const installation = await Notifications.getDevicePushTokenAsync().catch(() => null);
        const deviceId = `${Device.modelId ?? "unknown"}:${installation?.type ?? "expo"}`;

        await trpcClient.notifications.registerDeviceToken.mutate({
          orgId,
          deviceId,
          expoPushToken: pushToken.data,
          platform: normalizePlatform(),
          appVersion: input.appVersion,
        });
      } catch {
        // Push registration should never block session usage.
      }
    };

    void register();

    return () => {
      mounted = false;
    };
  }, [input.appVersion, input.enabled, input.orgId]);
}
