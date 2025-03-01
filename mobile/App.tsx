import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { CustomerSignup } from './screens/customer/Signup';
import { CustomerDashboard } from './screens/customer/Dashboard';
import { AdminLogin } from './screens/admin/Login';
import { AdminDashboard } from './screens/admin/Dashboard';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
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
          <Stack.Screen 
            name="AdminLogin" 
            component={AdminLogin}
            options={{ title: 'Admin Login' }}
          />
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboard}
            options={{ title: 'Admin Dashboard' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
