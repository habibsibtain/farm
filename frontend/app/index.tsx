import React from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";

/**
 * Entry screen that decides where to send the user first:
 * - Existing user (has token) → main home tabs
 * - New user (no token yet)   → signup/register screen
 *
 * This keeps the first experience focused on account creation,
 * while returning farmers land directly on their familiar home.
 */
export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (status === "authenticated") {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
});

