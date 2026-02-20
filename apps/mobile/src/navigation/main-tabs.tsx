import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { ApprovalsScreen } from "@/screens/approvals-screen";
import { ConversationsScreen } from "@/screens/conversations-screen";
import { DashboardScreen } from "@/screens/dashboard-screen";
import { NotificationsScreen } from "@/screens/notifications-screen";
import { TasksGoalsScreen } from "@/screens/tasks-goals-screen";
import type { MainTabParamList } from "@/navigation/types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs({ orgId }: { orgId: string }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2A73FF",
        tabBarInactiveTintColor: "#8EA2C3",
        tabBarStyle: {
          backgroundColor: "#0E1C35",
          borderTopColor: "#21314D",
        },
      }}
    >
      <Tab.Screen name="Dashboard">{() => <DashboardScreen orgId={orgId} />}</Tab.Screen>
      <Tab.Screen name="Approvals">{() => <ApprovalsScreen orgId={orgId} />}</Tab.Screen>
      <Tab.Screen name="Conversations">{() => <ConversationsScreen orgId={orgId} />}</Tab.Screen>
      <Tab.Screen name="Tasks">{() => <TasksGoalsScreen orgId={orgId} />}</Tab.Screen>
      <Tab.Screen name="Notifications">{() => <NotificationsScreen orgId={orgId} />}</Tab.Screen>
    </Tab.Navigator>
  );
}
