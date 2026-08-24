import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import { API_BASE_URL, type User } from "../config";
import { theme } from "../theme";

const ERROR_TEXT: Record<string, string> = {
  invalid_credentials: "Wrong email or password.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
};

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // credentials:"include" makes the browser store the sarak_session cookie
      // and send it back on every later admin call.
      const loginRes = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!loginRes.ok) {
        const body = (await loginRes.json().catch(() => null)) as { error?: string } | null;
        setError(ERROR_TEXT[body?.error ?? ""] ?? `Login failed (${loginRes.status}).`);
        return;
      }
      const loginBody = (await loginRes.json()) as { user: User };
      // Confirm the session cookie actually round-trips before showing Home.
      const meRes = await fetch(`${API_BASE_URL}/admin/auth/me`, {
        credentials: "include",
      });
      if (!meRes.ok) {
        setError("Session could not be established. Please retry.");
        return;
      }
      const meBody = (await meRes.json()) as User;
      onLoggedIn(meBody ?? loginBody.user);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <Text style={styles.title}>Sarak Admin</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.textDim}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.textDim}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        disabled={busy || !email.trim() || !password}
        onPress={() => void submit()}
      >
        {busy ? (
          <ActivityIndicator color={theme.bg} />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: {
    color: theme.danger,
    fontSize: 13,
  },
  button: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: theme.bg,
    fontWeight: "700",
    fontSize: 15,
  },
});
