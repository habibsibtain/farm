import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { authService } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { Language } from "../types";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    if (!name.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const challenge = await authService.requestRegisterOtp({
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        language: preferredLanguage,
      });
      router.push({
        pathname: "/register-otp",
        params: {
          challengeId: challenge.challengeId,
          phone: challenge.phone,
        },
      });
    } catch (e) {
      setError((e as Error).message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          enableOnAndroid
        >
          <View style={styles.card}>
            <Text style={styles.title}>{t("auth.createAccount")}</Text>
            <TextInput placeholder={t("auth.name")} value={name} onChangeText={setName} style={styles.input} />
            <TextInput
              placeholder={t("auth.phone")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
            />
            <TextInput
              placeholder={t("auth.password")}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <TextInput
              placeholder={t("auth.confirmPassword")}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />
            <View style={styles.row}>
              <Text style={styles.label}>{t("auth.showPassword")}</Text>
              <Switch value={showPassword} onValueChange={setShowPassword} />
            </View>
            <Text style={styles.label}>{t("auth.preferredLanguage")}</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={preferredLanguage}
                onValueChange={(value) => setPreferredLanguage(String(value) as Language)}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Picker.Item key={lang.code} label={lang.label} value={lang.code} />
                ))}
              </Picker>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity onPress={handleNext} disabled={loading} style={styles.button}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("auth.next")}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.link}>{t("auth.alreadyRegistered")}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, padding: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 14, color: "#0f172a" },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  button: { backgroundColor: "#16a34a", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  link: { marginTop: 14, textAlign: "center", color: "#2563eb", fontWeight: "600" },
  error: { color: "#b91c1c", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  label: { color: "#334155", marginBottom: 4, fontWeight: "500" },
  pickerWrap: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, marginBottom: 10, overflow: "hidden" },
});

export default RegisterScreen;

