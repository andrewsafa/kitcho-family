import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput, Button, Surface, Text } from 'react-native-paper';
import Constants from 'expo-constants';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [error, setError] = useState('');

  const validateForm = () => {
    let isValid = true;
    setNameError('');
    setMobileError('');

    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    }

    if (!mobile.trim()) {
      setMobileError('Mobile number is required');
      isValid = false;
    } else if (!/^\+?[1-9]\d{1,14}$/.test(mobile)) {
      setMobileError('Invalid mobile number format');
      isValid = false;
    }

    return isValid;
  };

  const signupMutation = useMutation({
    mutationFn: async (data: { name: string; mobile: string }) => {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      console.log('Attempting signup with URL:', apiUrl); // Debug log

      const response = await fetch(`${apiUrl}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Signup error:', errorData); // Debug log
        throw new Error(errorData.message || 'Failed to sign up');
      }

      const responseData = await response.json();
      console.log('Signup successful:', responseData); // Debug log
      return responseData;
    },
    onSuccess: async (data) => {
      console.log('Storing customer ID:', data.id); // Debug log
      await AsyncStorage.setItem('customerId', data.id.toString());
      router.replace('/(tabs)/dashboard');
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error); // Debug log
      setError(error.message);
    },
  });

  const handleSignup = () => {
    if (!validateForm()) return;
    signupMutation.mutate({ name, mobile });
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>
          Join Kitcho Family
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          error={!!nameError}
          style={styles.input}
        />
        {nameError ? <Text style={styles.error}>{nameError}</Text> : null}

        <TextInput
          label="Mobile Number"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          error={!!mobileError}
          style={styles.input}
        />
        {mobileError ? <Text style={styles.error}>{mobileError}</Text> : null}

        <Button
          mode="contained"
          onPress={handleSignup}
          loading={signupMutation.isPending}
          disabled={signupMutation.isPending}
          style={styles.button}
        >
          Join Now
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
  error: {
    color: '#B00020',
    fontSize: 12,
    marginBottom: 8,
  },
});