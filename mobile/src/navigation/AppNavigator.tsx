import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TodoFormScreen from '../screens/TodoFormScreen';
import TodoListScreen from '../screens/TodoListScreen';
import { colors, fontSize } from '../theme/tokens';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="TodoList"
      screenOptions={{
        headerStyle: { backgroundColor: colors.gradientBottom },
        contentStyle: { backgroundColor: colors.gradientBottom },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: fontSize.navHeader,
          color: colors.textOnDark,
        },
        headerTintColor: colors.textOnDark,
        headerBackButtonDisplayMode: 'minimal',
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
        options={{ title: 'Yeni Görev' }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Task Details' }}
      />
    </Stack.Navigator>
  );
}
