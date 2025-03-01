import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, useTheme, ActivityIndicator } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<any, 'CustomerDashboard'>;

export function CustomerDashboard({ route, navigation }: Props) {
  const { customerId } = route.params;
  const theme = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: customer, error, isLoading, refetch } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/api/customers/${customerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      return response.json();
    },
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Surface style={[styles.surface, styles.card]}>
        <Text variant="headlineMedium" style={styles.cardTitle}>
          {customer.name}
        </Text>
        <Text variant="bodyLarge" style={styles.points}>
          {customer.points.toLocaleString()} Points
        </Text>
        <Text variant="bodyMedium" style={styles.level}>
          {customer.level} Member
        </Text>
      </Surface>

      {/* Points Progress */}
      <Surface style={styles.surface}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Your Progress
        </Text>
        <Text style={styles.progressText}>
          Keep earning points to reach the next level!
        </Text>
      </Surface>

      {/* Benefits */}
      <Surface style={styles.surface}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Your Benefits
        </Text>
        {/* Benefits list will be implemented in next iteration */}
      </Surface>

      {/* Special Offers */}
      <Surface style={styles.surface}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Special Offers
        </Text>
        {/* Special offers list will be implemented in next iteration */}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surface: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 4,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#FF6B35', // Primary color from web app
    marginTop: 24,
  },
  cardTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  points: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  level: {
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  progressText: {
    opacity: 0.7,
  },
  error: {
    color: '#B00020',
    textAlign: 'center',
  },
});