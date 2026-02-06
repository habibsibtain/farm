import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sprout } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { Language } from "../../types";

/**
 * Shared app header used across tab screens.
 * Keeps the same calm, farmer-friendly branding and language toggle
 * that previously lived in App.tsx.
 */
const AppHeader: React.FC = () => {
  const { language, cycleLanguage } = useLanguage();

  const languageLabel =
    language === Language.ENGLISH
      ? "English"
      : language === Language.HINDI
      ? "हिंदी"
      : language === Language.PUNJABI
      ? "ਪੰਜਾਬੀ"
      : "తెలుగు";

  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Sprout size={28} color="#16a34a" strokeWidth={2.5} />
        <Text style={styles.title}>
          Kisan<Text style={styles.titleHighlight}>Sahayak</Text>
        </Text>
      </View>

      <Text onPress={cycleLanguage} style={styles.langButton}>
        {languageLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  titleHighlight: {
    color: "#16a34a",
  },
  langButton: {
    fontSize: 14,
    color: "#1e293b",
    padding: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    overflow: "hidden",
  },
});

export default AppHeader;

