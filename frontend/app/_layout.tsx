import React from "react";
import {
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { LanguageProvider } from "../context/LanguageContext";

/**
 * Root layout for Expo Router.
 * Wraps the app in a shared LanguageProvider and calm SafeAreaView.
 */
export default function RootLayout() {
  return (
    <LanguageProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#f8fafc" },
          }}
        />
      </SafeAreaView>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight || 0 : 0,
  },
});

