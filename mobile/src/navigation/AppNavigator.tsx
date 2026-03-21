import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TodoFormScreen from '../screens/TodoFormScreen';
import TodoListScreen from '../screens/TodoListScreen';
import ChangeEmailScreen from '../screens/profile/ChangeEmailScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
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
      <Stack.Screen name="TodoList" component={TodoListScreen} />
      <Stack.Screen name="TodoForm" component={TodoFormScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
