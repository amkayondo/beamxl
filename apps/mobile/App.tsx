import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { mobileConfig } from "@/config";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePushRegistration } from "@/hooks/use-push-registration";
import { authClient } from "@/lib/auth-client";
import { MainTabs } from "@/navigation/main-tabs";
import type { RootStackParamList } from "@/navigation/types";
import { SignInScreen } from "@/screens/sign-in-screen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const sessionQuery = (authClient as any).useSession?.() as {
    data?: { user?: { id: string } } | null;
    isPending?: boolean;
  };
  const session = sessionQuery?.data ?? null;
  const sessionLoading = sessionQuery?.isPending ?? false;

  const activeOrg = useActiveOrg(Boolean(session?.user?.id));

  usePushRegistration({
    enabled: Boolean(session?.user?.id && activeOrg.orgId),
    orgId: activeOrg.orgId,
    appVersion: "1.0.0",
  });

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: keyof RootStackParamList;
      };

      if (data?.screen && navigationRef.isReady()) {
        navigationRef.navigate(data.screen);
      }
    });

    return () => subscription.remove();
  }, []);

  if (sessionLoading || (session?.user && activeOrg.loading)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2A73FF" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={{
          prefixes: [`${mobileConfig.appScheme}://`],
        }}
      >
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session?.user ? (
            <Stack.Screen name="Auth" component={SignInScreen} />
          ) : activeOrg.orgId ? (
            <Stack.Screen name="Main">{() => <MainTabs orgId={activeOrg.orgId!} />}</Stack.Screen>
          ) : (
            <Stack.Screen name="Auth" component={MissingOrgScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function MissingOrgScreen() {
  return (
    <SafeAreaView style={styles.loaderWrap}>
      <Text style={styles.errorTitle}>No organization found</Text>
      <Text style={styles.errorText}>Create or join an organization in web first, then reopen mobile.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: "#0A1426",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  errorTitle: {
    color: "#EBF2FF",
    fontSize: 18,
    fontWeight: "700",
  },
  errorText: {
    color: "#99AAC8",
    fontSize: 14,
    textAlign: "center",
  },
});
