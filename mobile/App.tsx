import './src/services/monitoring/sentry';
import './src/i18n/i18n';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { asyncStoragePersister } from './src/query/persister';
import { queryClient } from './src/query/queryClient';
import { setupNetInfoSync } from './src/query/networkSync';
import { notificationService } from './src/services/notifications/notificationService';
import languageService from './src/services/language/languageService';
import { colors } from './src/theme/tokens';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.gradientBottom,
  },
};

export default function App() {
  useEffect(() => {
    setupNetInfoSync();
    void notificationService.initialize();
    void languageService.init();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
