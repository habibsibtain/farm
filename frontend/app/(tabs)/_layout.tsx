import React from "react";
import { Tabs } from "expo-router";
import {
  Home,
  MessageSquare,
  ScanLine,
  TrendingUp,
  User,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Bottom tab navigator for main farmer flows.
 * Uses soft greens and calm tones to keep the app feeling like a companion.
 */
export default function TabsLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={2.3} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.assistant"),
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} strokeWidth={2.3} />
          ),
        }}
      />
      <Tabs.Screen
        name="pest-doctor"
        options={{
          title: t("tabs.scan"),
          tabBarIcon: ({ color, size }) => (
            <ScanLine size={size} color={color} strokeWidth={2.3} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: t("tabs.market"),
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size} color={color} strokeWidth={2.3} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-farm"
        options={{
          title: t("tabs.myFarm"),
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={2.3} />
          ),
        }}
      />
    </Tabs>
  );
}

