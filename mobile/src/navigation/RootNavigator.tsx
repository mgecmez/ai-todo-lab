import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodoFormScreen from '../screens/TodoFormScreen';
import TodoListScreen from '../screens/TodoListScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Uygulamanın tek navigator'ı.
 * NavigationContainer bu bileşenin dışında (App.tsx) sarılır.
 */
export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="TodoList"
      screenOptions={{
        // Header arka planı ve içerik arka planı beyaz — tutarlı zemin
        headerStyle: { backgroundColor: '#fff' },
        contentStyle: { backgroundColor: '#fff' },
        // Başlık: koyu, kalın, tüm ekranlarda aynı boyut
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18, color: '#222' },
        // Geri oku: mavi — FAB ve checkbox rengiyle tutarlı
        headerTintColor: '#2563eb',
        // iOS: geri butonu sadece ikon gösterir, önceki ekranın başlığını gizler
        headerBackButtonDisplayMode: 'minimal',
        // Header altında ince gölge / ayraç
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="TodoList"
        component={TodoListScreen}
        options={{ title: 'Görevlerim' }}
      />
      <Stack.Screen
        name="TodoForm"
        component={TodoFormScreen}
        // Gerçek başlık TodoFormScreen içinde navigation.setOptions() ile set ediliyor.
        // Burası ilk render öncesi fallback değer.
        options={{ title: 'Yeni Görev' }}
      />
    </Stack.Navigator>
  );
}
