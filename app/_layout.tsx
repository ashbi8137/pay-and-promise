
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="screens/SplashScreen" />
      <Stack.Screen name="screens/AuthScreen" />
      <Stack.Screen name="screens/HomeScreen" />
      <Stack.Screen name="screens/CreatePromiseScreen" />
      <Stack.Screen name="screens/PromiseDetailScreen" />
      <Stack.Screen name="screens/JoinPromiseScreen" />
      <Stack.Screen name="screens/ProfileScreen" />
      <Stack.Screen name="screens/TransactionHistoryScreen" />
      <Stack.Screen name="screens/LandingScreen" />
    </Stack>
  );
}
