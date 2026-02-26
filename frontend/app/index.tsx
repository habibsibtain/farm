import React from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { authService } from "../services/api";

/**
 * Entry screen that decides where to send the user first:
 * - Existing user (has token) → main home tabs
 * - New user (no token yet)   → signup/register screen
 *
 * This keeps the first experience focused on account creation,
 * while returning farmers land directly on their familiar home.
 */
export default function Index() {
  // Synchronous token check is enough here because our storage lookup
  // is lightweight and guarded for native/web.
  const token = authService.getStoredToken();

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/register" />;
}

