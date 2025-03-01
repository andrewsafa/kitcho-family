import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CustomerSignup } from './screens/customer/Signup';
import { CustomerDashboard } from './screens/customer/Dashboard';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="CustomerSignup">
            <Stack.Screen 
              name="CustomerSignup" 
              component={CustomerSignup}
              options={{ title: 'Join Kitcho Family' }}
            />
            <Stack.Screen 
              name="CustomerDashboard" 
              component={CustomerDashboard}
              options={{ title: 'Your Rewards' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </QueryClientProvider>
  );
}