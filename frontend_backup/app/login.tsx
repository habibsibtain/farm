import React from "react";
import { View, StyleSheet } from "react-native";
import AppHeader from "../components/Layout/AppHeader";
import ProfileView from "../components/Views/ProfileView";
import { useLanguage } from "../context/LanguageContext";

/**
 * Login screen.
 * Reuses ProfileView so the login experience and messaging
 * stay identical to the My Farm tab, while allowing deep linking
 * to a dedicated auth route.
 */
const LoginScreen: React.FC = () => {
  const { language } = useLanguage();

  return (
    <View style={styles.container}>
      <AppHeader />
      <ProfileView language={language} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});

export default LoginScreen;

