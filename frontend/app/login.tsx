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
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { authService } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError("Please enter phone number and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const otpChallenge = await authService.requestLoginOtp(
        phone.trim(),
        password.trim()
      );
      router.push({
        pathname: "/otp-verification",
        params: {
          challengeId: otpChallenge.challengeId,
          phone: otpChallenge.phone,
        },
      });
    } catch (e) {
      setError((e as Error).message || "Login failed. Please try again.");
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
            <Text style={styles.title}>{t("auth.login")}</Text>
            <TextInput
              placeholder={t("auth.phone")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
            />
            <TextInput
              placeholder={t("auth.password")}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t("auth.loginButton")}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.link}>{t("auth.newUserSignup")}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
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
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  link: {
    marginTop: 14,
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "600",
  },
  error: { color: "#b91c1c", marginBottom: 8 },
});

export default LoginScreen;

