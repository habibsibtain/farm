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
import { useLocalSearchParams, useRouter } from "expo-router";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const OtpVerificationScreen: React.FC = () => {
  const router = useRouter();
  const { signInWithToken } = useAuth();
  const params = useLocalSearchParams<{ challengeId?: string; phone?: string }>();
  const challengeId = params.challengeId || "";
  const phone = params.phone || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!challengeId) {
      setError("Missing OTP challenge. Please login again.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.verifyLoginOtp(challengeId, otp);
      await signInWithToken(res.token, res.user);
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message || "OTP verification failed.");
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
            <Text style={styles.title}>OTP Verification</Text>
            <Text style={styles.subtitle}>Enter the 6-digit OTP sent to {phone || "your phone"}.</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="------"
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity onPress={handleVerify} disabled={loading} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
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
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", padding: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  subtitle: { color: "#475569", marginBottom: 12 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    letterSpacing: 6,
    fontSize: 20,
    textAlign: "center",
  },
  button: { backgroundColor: "#16a34a", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#b91c1c", marginBottom: 8 },
});

export default OtpVerificationScreen;

