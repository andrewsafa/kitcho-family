import { useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Surface, Text, ActivityIndicator } from 'react-native-paper';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const router = useRouter();

  // Get the customer ID from storage
  const { data: customerId } = useQuery({
    queryKey: ['customerId'],
    queryFn: async () => {
      console.log('Fetching customer ID from storage'); // Debug log
      const id = await AsyncStorage.getItem('customerId');
      if (!id) {
        console.log('No customer ID found, redirecting to signup'); // Debug log
        router.replace('/(auth)/signup');
        return null;
      }
      console.log('Found customer ID:', id); // Debug log
      return parseInt(id);
    },
  });

  // Fetch customer data
  const {
    data: customer,
    error,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      console.log('Fetching customer data from:', apiUrl); // Debug log
      const response = await fetch(`${apiUrl}/api/customers/${customerId}`);

      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText); // Debug log
        throw new Error('Failed to fetch customer data');
      }

      const data = await response.json();
      console.log('Customer data received:', data); // Debug log
      return data;
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !customer) {
    return (
      <View style={styles.container}>
        <Surface style={styles.surface}>
          <Text style={styles.error}>
            {error instanceof Error ? error.message : 'Customer not found'}
          </Text>
        </Surface>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Points Summary */}
      <Surface style={styles.surface}>
        <Text variant="titleLarge" style={styles.points}>
          {customer.points.toLocaleString()}
        </Text>
        <Text variant="bodyMedium" style={styles.pointsLabel}>
          Total Points
        </Text>
        <Text variant="titleMedium" style={styles.level}>
          {customer.level} Member
        </Text>
      </Surface>

      {/* Customer Info */}
      <Surface style={[styles.surface, styles.infoCard]}>
        <Text variant="titleMedium">Your Information</Text>
        <View style={styles.infoRow}>
          <Text variant="bodyMedium">Name:</Text>
          <Text variant="bodyMedium">{customer.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text variant="bodyMedium">Mobile:</Text>
          <Text variant="bodyMedium">{customer.mobile}</Text>
        </View>
      </Surface>

      {/* Benefits */}
      <Surface style={styles.surface}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Your Benefits
        </Text>
        <Text variant="bodyMedium">
          Coming soon: Exclusive {customer.level} member benefits!
        </Text>
      </Surface>

      {/* Special Offers */}
      <Surface style={[styles.surface, styles.lastCard]}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Special Offers
        </Text>
        <Text variant="bodyMedium">
          Coming soon: Special offers for {customer.level} members!
        </Text>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surface: {
    padding: 16,
    borderRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  points: {
    fontSize: 42,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  pointsLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  level: {
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  lastCard: {
    marginBottom: 32,
  },
  error: {
    color: '#B00020',
    textAlign: 'center',
  },
});