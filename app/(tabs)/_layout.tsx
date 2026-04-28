import { Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTerminalSessions } from "../contexts/TerminalSessionsContext";
import { useOrientation } from "../utils/orientation";
import { getTabBarHeight } from "../utils/responsive";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { sessions } = useTerminalSessions();
  const pathname = usePathname();
  const { isLandscape } = useOrientation();

  const isSessionsTab = pathname === "/sessions";
  const hasActiveSessions = sessions.length > 0;
  const shouldHideMainTabBar = isSessionsTab && hasActiveSessions;

  const tabBarHeight = getTabBarHeight(isLandscape);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1c1c1c",
        tabBarInactiveTintColor: "#5f5f5d",
        tabBarStyle: shouldHideMainTabBar
          ? { display: "none" }
          : {
              backgroundColor: "#fcfbf8",
              borderTopWidth: 1.5,
              borderTopColor: "#eceae4",
              paddingBottom: insets.bottom,
              height: tabBarHeight + insets.bottom,
            },
        headerShown: false,
        tabBarLabelStyle: isLandscape
          ? { fontSize: 11, marginTop: -2 }
          : undefined,
        tabBarIconStyle: isLandscape ? { marginBottom: -2 } : undefined,
      }}
    >
      <Tabs.Screen
        name="hosts"
        options={{
          title: "Hosts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="server" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="desktop" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
