import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sprout } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { useLanguage } from "../../context/LanguageContext";
import { SUPPORTED_LANGUAGES } from "../../i18n";

/**
 * Shared app header used across tab screens.
 * Keeps the same calm, farmer-friendly branding and language toggle
 * that previously lived in App.tsx.
 */
const AppHeader: React.FC = () => {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Sprout size={28} color="#16a34a" strokeWidth={2.5} />
        <Text style={styles.title}>
          {t("appName")}
        </Text>
      </View>
      <View style={styles.langPickerWrap}>
        <Picker
          selectedValue={language}
          onValueChange={(value) => {
            void changeLanguage(String(value));
          }}
          style={styles.langPicker}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Picker.Item key={lang.code} label={lang.label} value={lang.code} />
          ))}
        </Picker>
      </View>
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  langPickerWrap: {
    minWidth: 130,
    height: 40,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    justifyContent: "center",
  },
  langPicker: { height: 40, width: "100%" },
});

export default AppHeader;

