import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TodoFormScreen from '../screens/TodoFormScreen';
import TodoListScreen from '../screens/TodoListScreen';
import { colors, fontSize } from '../theme/tokens';
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
        // Header arka planı gradient ekranlarla uyumlu koyu navy
        headerStyle: { backgroundColor: colors.gradientBottom },
        // Ekran içeriği koyu navy — gradient başlayana kadar beyaz flash'ı önler
        contentStyle: { backgroundColor: colors.gradientBottom },
        // Başlık: beyaz, token'dan gelen boyut
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: fontSize.navHeader,
          color: colors.textOnDark,
        },
        // Geri oku ve diğer header ikonları: beyaz
        headerTintColor: colors.textOnDark,
        // iOS: geri butonu sadece ikon gösterir, önceki ekranın başlığını gizler
        headerBackButtonDisplayMode: 'minimal',
        // Header altında ayraç — koyu arka planda görünmez, temiz bir görünüm sağlar
        headerShadowVisible: false,
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
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        // Gerçek başlık DESIGN-010'da navigation.setOptions() ile set edilecek.
        options={{ title: 'Task Details' }}
      />
    </Stack.Navigator>
  );
}
