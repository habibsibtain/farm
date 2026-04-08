import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import HomeView from "../../components/Views/HomeView";
import AppHeader from "../../components/Layout/AppHeader";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { farmService } from "../../services/api";
import { AppView } from "../../types";

/**
 * Home tab: wraps existing HomeView and routes
 * card actions to the correct tab screens.
 */
export default function HomeScreen() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [farmCount, setFarmCount] = useState<number>(0);

  // Fetch farm count on mount
  useEffect(() => {
    if (user) {
      farmService
        .getFarms()
        .then((res) => setFarmCount(res.farms?.length || 0))
        .catch(() => setFarmCount(0));
    }
  }, [user]);

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
      <HomeView
        language={language}
        setView={handleSetView}
        userName={user?.name}
        farmCount={farmCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});
