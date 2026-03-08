import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
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
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
      {/* Koyu gradient arka plan için açık (beyaz) status bar ikonları */}
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
