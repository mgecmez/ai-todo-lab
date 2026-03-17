import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/tokens';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.gradientBottom }}>
        <ActivityIndicator size="large" color={colors.textOnDark} />
      </View>
    );
  }

  return token !== null ? <AppNavigator /> : <AuthNavigator />;
}
