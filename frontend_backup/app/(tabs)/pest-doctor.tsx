import React from "react";
import { View, StyleSheet } from "react-native";
import PestDoctor from "../../components/Features/PestDoctor";
import AppHeader from "../../components/Layout/AppHeader";
import { useLanguage } from "../../context/LanguageContext";

const PestDoctorScreen: React.FC = () => {
  const { language } = useLanguage();

  return (
    <View style={styles.container}>
      <AppHeader />
      <PestDoctor language={language} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});

export default PestDoctorScreen;

