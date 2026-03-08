import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { gradient } from '../theme/tokens';

interface ScreenGradientProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tüm ekranlarda kullanılan tam ekran gradient arka plan.
 * Renk ve yön değerleri tokens.ts → gradient.screen'den gelir.
 *
 * Kullanım:
 *   <ScreenGradient>
 *     <YourScreenContent />
 *   </ScreenGradient>
 */
export default function ScreenGradient({ children, style }: ScreenGradientProps) {
  return (
    <LinearGradient
      colors={gradient.screen.colors}
      start={gradient.screen.start}
      end={gradient.screen.end}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
