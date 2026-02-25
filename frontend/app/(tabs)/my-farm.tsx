import React from "react";
import { View, StyleSheet } from "react-native";
import ProfileView from "../../components/Views/ProfileView";
import AppHeader from "../../components/Layout/AppHeader";
import { useLanguage } from "../../context/LanguageContext";

/**
 * My Farm tab: reuses ProfileView so farmers can
 * log in, see their profile, and manage farms in one calm place.
 */
const MyFarmScreen: React.FC = () => {
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

export default MyFarmScreen;

