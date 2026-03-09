import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import RootNavigator from './src/navigation/RootNavigator';
import { asyncStoragePersister } from './src/query/persister';
import { queryClient } from './src/query/queryClient';
import { setupNetInfoSync } from './src/query/networkSync';
import { colors } from './src/theme/tokens';

// NavigationContainer'ın varsayılan beyaz arka planını gradient ile uyumlu
// koyu renge çekerek ekran geçişlerindeki beyaz flash'ı önler.
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.gradientBottom,
  },
};

export default function App() {
  // NetInfo → onlineManager köprüsünü uygulama başlarken bir kez kur.
  // setupNetInfoSync() bir dinleyici kaydeder; React'ın render döngüsü
  // dışında olduğundan useEffect ile çalıştırmak yeterlidir.
  useEffect(() => {
    setupNetInfoSync();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
        {/* Koyu gradient arka plan için açık (beyaz) status bar ikonları */}
        <StatusBar style="light" />
      </NavigationContainer>
    </PersistQueryClientProvider>
  );
}
