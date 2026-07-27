import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In — the webClientId comes from your Firebase project's
// OAuth 2.0 Web Client (found in Google Cloud Console → APIs → Credentials).
// This is the same project as your firebase config in App.js.
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO GET YOUR Web Client ID:
//  1. Go to https://console.firebase.google.com → Project: storage-server-2025
//  2. Project Settings → General → Your apps → Web app (or add one)
//  3. OR: Google Cloud Console → APIs & Services → Credentials
//     Find the "Web client (auto created by Google Service)" OAuth 2.0 Client
//     Copy the full Client ID — format: XXXXXXX.apps.googleusercontent.com
// ─────────────────────────────────────────────────────────────────────────────
GoogleSignin.configure({
  webClientId: '32146521208-d4qim745pb1rnbb57mc2k903rtinlif0.apps.googleusercontent.com', // Extracted from google-services.json
  offlineAccess: true,
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const auth = getAuth();

  // ── Email / Password ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      // Support both legacy and new SDK response shapes
      const idToken = signInResult.data?.idToken ?? signInResult.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — no error shown
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign-in already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available');
      } else {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.brandContainer}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>LootOps Cloud</Text>
        <Text style={styles.subtitle}>Sign in to your personal cloud</Text>
      </View>

      <View style={styles.formContainer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* ── Google Sign-In Button ── */}
        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={googleLoading || loading}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color="#1a1a1a" size="small" />
          ) : (
            <>
              <View style={styles.googleIcon}>
                {/* Google "G" logo — four-colour paths */}
                <Image
                  source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIyLjU2IDEyLjI1YzAtLjc4LS4wNy0xLjUzLS4yLTIuMjVIMTJ2NC4yNmg1LjkyYy0uMjYgMS4zNy0xLjA0IDIuNTMtMi4yMSAzLjMxdjIuNzdoMy41N2MyLjA4LTEuOTIgMy4yOC00Ljc0IDMuMjgtOC4wOXoiIGZpbGw9IiM0Mjg1RjQiLz48cGF0aCBkPSJNMTIgMjNjMi45NyAwIDUuNDYtLjk4IDcuMjgtMi42NmwtMy41Ny0yLjc3Yy0uOTguNjYtMi4yMyAxLjA2LTMuNzEgMS4wNi0yLjg2IDAtNS4yOS0xLjkzLTYuMTYtNC41M0gyLjE4djIuODRDMy45OSAyMC41MyA3LjcgMjMgMTIgMjN6IiBmaWxsPSIjMzRBODUzIi8+PHBhdGggZD0iTTUuODQgMTQuMDljLS4yMi0uNjYtLjM1LTEuMzYtLjM1LTIuMDlzLjEzLTEuNDMuMzUtMi4wOVY3LjA3SDIuMThDMS40MyA4LjU1IDEgMTAuMjIgMSAxMnMuNDMgMy40NSAxLjE4IDQuOTNsMi44NS0yLjIyLjgxLS42MnoiIGZpbGw9IiNGQkJDMDUiLz48cGF0aCBkPSJNMTIgNS4zOGMxLjYyIDAgMy4wNi41NiA0LjIxIDEuNjRsMy4xNS0zLjE1QzE3LjQ1IDIuMDkgMTQuOTcgMSAxMiAxIDcuNyAxIDMuOTkgMy40NyAyLjE4IDcuMDdsMy42NiAyLjg0Yy44Ny0yLjYgMy4zLTQuNTMgNi4xNi00LjUzeiIgZmlsbD0iI0VBNDMzNSIvPjwvc3ZnPg==' }}
                  style={{ width: 18, height: 18 }}
                />
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Email/Password ── */}
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="admin@example.com"
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, (loading || googleLoading) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || googleLoading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 24,
  },
  brandcontainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  formcontainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 13,
  },
  /* Google button */
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleButtonText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '600',
  },
  /* Divider */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 12,
  },
  /* Inputs */
  label: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    color: '#0f172a',
    marginBottom: 20,
    fontSize: 16,
  },
  /* Sign-in button */
  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
