import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import { ONBOARDING_KEY } from '../services/cache/cacheKeys';
import { colors } from '../theme/tokens';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { token, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setOnboardingDone(value === 'true');
    });
  }, []);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.gradientBottom }}>
        <ActivityIndicator size="large" color={colors.textOnDark} />
      </View>
    );
  }

  if (!onboardingDone) {
    return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
  }

  return token !== null ? <AppNavigator /> : <AuthNavigator />;
}
