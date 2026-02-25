import React from "react";
import { View, StyleSheet } from "react-native";
import AppHeader from "../components/Layout/AppHeader";
import ProfileView from "../components/Views/ProfileView";
import { useLanguage } from "../context/LanguageContext";

/**
 * Register screen.
 * Also reuses ProfileView so farmers see the same gentle
 * “create my account” experience, whether they land on My Farm
 * or this dedicated route.
 */
const RegisterScreen: React.FC = () => {
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

export default RegisterScreen;

