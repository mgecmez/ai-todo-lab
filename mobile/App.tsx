import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import RootNavigator from './src/navigation/RootNavigator';
import { asyncStoragePersister } from './src/query/persister';
import { queryClient } from './src/query/queryClient';
import { setupNetInfoSync } from './src/query/networkSync';
import { notificationService } from './src/services/notifications/notificationService';
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
  // Uygulama başlarken bir kez çalışacak yan etkiler.
  // useEffect tercih sebebi: her iki fonksiyon da React render döngüsü dışında
  // yan etki (listener kaydı / async izin isteği) üretir.
  useEffect(() => {
    // NetInfo → onlineManager köprüsünü kur (ağ değişimlerini TanStack'e ilet).
    setupNetInfoSync();
    // Bildirim izni akışını başlat; izin verilmişse scheduleReminder aktif olur.
    void notificationService.initialize();
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
