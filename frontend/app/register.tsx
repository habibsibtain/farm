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
} from "react-native";
import { useRouter } from "expo-router";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";

const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const { signInWithToken } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError("Please fill name, phone, and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.register(name.trim(), phone.trim(), password.trim());
      await signInWithToken(res.token, res.user);
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>
        <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          placeholder="Phone number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.button}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={styles.link}>Already registered? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", padding: 20 },
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
});

export default RegisterScreen;

