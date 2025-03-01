import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface, ActivityIndicator } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'CustomerSignup'>;

export function CustomerSignup({ navigation }: Props) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');

  const validateForm = () => {
    let isValid = true;
    setNameError('');
    setMobileError('');

    if (name.length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    }

    if (!mobile.match(/^\+?[1-9]\d{1,14}$/)) {
      setMobileError('Please enter a valid mobile number');
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('YOUR_DEPLOYED_APP_URL/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, mobile }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to sign up');
      }

      navigation.replace('CustomerDashboard', { mobile });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.surface}>
          <Text variant="headlineMedium" style={styles.title}>
            Welcome to Kitcho Family
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Join our family and start earning rewards on every visit
          </Text>

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setNameError('');
            }}
            error={!!nameError}
            style={styles.input}
          />
          {nameError ? (
            <Text style={styles.errorText}>{nameError}</Text>
          ) : null}

          <TextInput
            label="Mobile Number"
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              setMobileError('');
            }}
            error={!!mobileError}
            keyboardType="phone-pad"
            style={styles.input}
          />
          {mobileError ? (
            <Text style={styles.errorText}>{mobileError}</Text>
          ) : null}

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Join Kitcho Family
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('AdminLogin')}
            style={styles.adminButton}
          >
            Admin Login
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    elevation: 4,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  button: {
    marginTop: 8,
  },
  adminButton: {
    marginTop: 16,
  },
  error: {
    color: '#B00020',
    marginBottom: 16,
    textAlign: 'center',
  },
});