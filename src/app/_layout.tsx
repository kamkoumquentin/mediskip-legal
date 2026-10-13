import { handleOAuthCallback } from '@/utils/oauth';
import * as Linking from 'expo-linking';
import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  const pathname = usePathname();

  useEffect(() => {
    console.log('[layout] pathname changed', pathname);
  }, [pathname]);

  useEffect(() => {
    const processCallback = (url: string) => {
      void handleOAuthCallback(url).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Échec du callback OAuth.';
        console.error('[OAuth] Callback refusé :', message);
        Alert.alert('Connexion impossible', message);
      });
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[layout] Linking url received', url);
      processCallback(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) processCallback(url);
    }).catch((error: unknown) => {
      console.error('[OAuth] Lecture du lien initial impossible :', error);
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="pharmacy-catalog" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
