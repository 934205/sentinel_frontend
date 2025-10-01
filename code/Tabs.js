// Tabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useTheme } from "./components/ThemeContext"; // ✅ Context

// Import your screens
import Home from "./tabs/home";
import ProgressScreen from "./tabs/progress";
import ProfileScreen from "./tabs/profile";

const Tab = createBottomTabNavigator();

export default function Tabs() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const tabBarActiveColor = isDark ? "#4dabf7" : "#007BFF";
  const tabBarInactiveColor = isDark ? "#aaa" : "#6c757d";
  const tabBarBg = isDark ? "#121212" : "#fff";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: isDark ? "#333" : "#ddd",
        },
        tabBarActiveTintColor: tabBarActiveColor,
        tabBarInactiveTintColor: tabBarInactiveColor,
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: "Progress",
          tabBarIcon: ({ color }) => <Ionicons name="analytics-outline" size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => <FontAwesome5 name="user" size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
