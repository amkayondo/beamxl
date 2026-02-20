import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { authClient } from "@/lib/auth-client";

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const callbackURL = useMemo(() => Linking.createURL("/auth/callback"), []);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Enter your work email to continue.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await (authClient as any).signIn.magicLink({
        email: email.trim().toLowerCase(),
        callbackURL,
      });

      if (result?.error) {
        Alert.alert("Sign in failed", result.error.message ?? "Unable to send sign-in link.");
        return;
      }

      Alert.alert(
        "Check your inbox",
        "We sent a secure sign-in link. Open it on this device to complete login.",
      );
    } catch (error) {
      Alert.alert("Sign in failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.title}>DueFlow Mobile</Text>
        <Text style={styles.subtitle}>Use your workspace email to continue.</Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="name@company.com"
          placeholderTextColor="#8692A6"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <Pressable disabled={submitting} onPress={submit} style={styles.button}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send Magic Link</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#091224",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#23314B",
    backgroundColor: "#0E1C35",
    padding: 20,
    gap: 12,
  },
  title: {
    color: "#E9F0FF",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9EB0CD",
    fontSize: 14,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#324767",
    backgroundColor: "#12233F",
    color: "#E9F0FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    borderRadius: 10,
    backgroundColor: "#2971FF",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
