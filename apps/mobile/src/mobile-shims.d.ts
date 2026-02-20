declare module "expo" {
  export function registerRootComponent(component: unknown): void;
}

declare module "expo-status-bar" {
  export const StatusBar: (props: Record<string, unknown>) => JSX.Element;
}

declare module "expo-notifications" {
  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowAlert: boolean;
    }>;
  }): void;
  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function getExpoPushTokenAsync(): Promise<{ data: string }>;
  export function getDevicePushTokenAsync(): Promise<{ type: string }>;
  export function addNotificationResponseReceivedListener(
    listener: (response: {
      notification: { request: { content: { data: Record<string, unknown> } } };
    }) => void
  ): { remove: () => void };
}

declare module "expo-constants" {
  const Constants: {
    expoConfig?: {
      extra?: Record<string, unknown>;
    };
  };
  export default Constants;
}

declare module "expo-secure-store" {
  export function setItem(key: string, value: string): void;
  export function getItem(key: string): string | null;
}

declare module "expo-device" {
  export const osName: string | null;
  export const modelId: string | null;
}

declare module "expo-linking" {
  export function createURL(path: string): string;
}

declare module "react-native-safe-area-context" {
  export const SafeAreaProvider: (props: Record<string, unknown>) => JSX.Element;
}

declare module "react-native" {
  export const ActivityIndicator: (props: Record<string, unknown>) => JSX.Element;
  export const SafeAreaView: (props: Record<string, unknown>) => JSX.Element;
  export const ScrollView: (props: Record<string, unknown>) => JSX.Element;
  export const FlatList: (props: Record<string, unknown>) => JSX.Element;
  export const Pressable: (props: Record<string, unknown>) => JSX.Element;
  export const TextInput: (props: Record<string, unknown>) => JSX.Element;
  export const View: (props: Record<string, unknown>) => JSX.Element;
  export const Text: (props: Record<string, unknown>) => JSX.Element;
  export const StyleSheet: { create: <T extends Record<string, unknown>>(styles: T) => T };
  export const Alert: { alert: (...args: unknown[]) => void };
}

declare module "@react-navigation/native" {
  export const NavigationContainer: (props: Record<string, unknown>) => JSX.Element;
  export function createNavigationContainerRef<T>(): {
    isReady: () => boolean;
    navigate: (screen: keyof T) => void;
  };
}

declare module "@react-navigation/native-stack" {
  export function createNativeStackNavigator<T>(): {
    Navigator: (props: Record<string, unknown>) => JSX.Element;
    Screen: (props: Record<string, unknown>) => JSX.Element;
  };
}

declare module "@react-navigation/bottom-tabs" {
  export function createBottomTabNavigator<T>(): {
    Navigator: (props: Record<string, unknown>) => JSX.Element;
    Screen: (props: Record<string, unknown>) => JSX.Element;
  };
}
