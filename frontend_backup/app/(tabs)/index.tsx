import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import HomeView from "../../components/Views/HomeView";
import AppHeader from "../../components/Layout/AppHeader";
import { useLanguage } from "../../context/LanguageContext";
import { AppView } from "../../types";

/**
 * Home tab: wraps existing HomeView and routes
 * card actions to the correct tab screens.
 */
export default function HomeScreen() {
  const { language } = useLanguage();
  const router = useRouter();

  const handleSetView = (view: AppView) => {
    switch (view) {
      case AppView.CHAT:
        router.push("/(tabs)/chat");
        break;
      case AppView.PEST_DOCTOR:
        router.push("/(tabs)/pest-doctor");
        break;
      case AppView.MARKET:
        router.push("/(tabs)/market");
        break;
      case AppView.PROFILE:
        router.push("/(tabs)/my-farm");
        break;
      case AppView.HOME:
      default:
        router.push("/(tabs)");
        break;
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      <HomeView language={language} setView={handleSetView} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});

