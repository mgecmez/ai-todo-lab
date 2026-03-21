import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ONBOARDING_KEY } from '../services/cache/cacheKeys';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingScreenProps {
  onComplete: () => void;
}

// ─── Slide data ───────────────────────────────────────────────────────────────

type SlideKey = 'slide1' | 'slide2' | 'slide3' | 'slide4';

const SLIDE_ICONS: Record<SlideKey, keyof typeof Ionicons.glyphMap> = {
  slide1: 'checkmark-circle',
  slide2: 'checkmark-done-circle-outline',
  slide3: 'alarm-outline',
  slide4: 'cloud-offline-outline',
};

const SLIDE_KEYS: SlideKey[] = ['slide1', 'slide2', 'slide3', 'slide4'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === 4;

  async function handleCta(destination: 'register' | 'login') {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  }

  function handleNext() {
    setCurrentSlide((prev) => Math.min(prev + 1, 4));
  }

  function handleSkip() {
    setCurrentSlide(4);
  }

  // ── Slide 5 — Get Started ──────────────────────────────────────────────────
  if (isLastSlide) {
    return (
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientBottom]}
        style={styles.container}
      >
        <View style={styles.slide5Content}>
          <Text style={styles.slide5Headline}>{t('onboarding.slide5.headline')}</Text>

          <TouchableOpacity style={styles.ctaPrimary} onPress={() => handleCta('register')} activeOpacity={0.8}>
            <Text style={styles.ctaPrimaryText}>{t('onboarding.cta.register')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctaSecondary} onPress={() => handleCta('login')} activeOpacity={0.8}>
            <Text style={styles.ctaSecondaryText}>{t('onboarding.cta.login')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          <PillIndicator total={5} active={currentSlide} />
        </View>
      </LinearGradient>
    );
  }

  // ── Slides 1–4 ────────────────────────────────────────────────────────────
  const key = SLIDE_KEYS[currentSlide];
  const icon = SLIDE_ICONS[key];

  const headline =
    key === 'slide1'
      ? t('onboarding.slide1.tagline')
      : t(`onboarding.${key}.headline` as const);

  const body =
    key === 'slide1'
      ? null
      : t(`onboarding.${key}.body` as const);

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientBottom]}
      style={styles.container}
    >
      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      {/* Icon */}
      <View style={styles.iconWrapper}>
        {key === 'slide1' ? (
          <Ionicons name={icon} size={120} color={colors.textOnDark} />
        ) : (
          <Ionicons name={icon} size={120} color={colors.textOnDark} />
        )}
      </View>

      {/* Text */}
      <View style={styles.textWrapper}>
        <Text style={styles.headline}>{headline}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>

      {/* Bottom row: pills + next */}
      <View style={styles.bottomRow}>
        <PillIndicator total={5} active={currentSlide} />
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={24} color={colors.gradientBottom} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─── Pill Indicator ───────────────────────────────────────────────────────────

function PillIndicator({ total, active }: { total: number; active: number }) {
  return (
    <View style={styles.pills}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.pill,
            i === active ? styles.pillActive : styles.pillInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },

  // Skip
  skipBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  skipText: {
    color: colors.textOnDarkSecondary,
    fontSize: fontSize.body,
  },

  // Icon
  iconWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Text
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textOnDark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    fontSize: fontSize.body,
    color: colors.textOnDarkSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Pills
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  pill: {
    height: 7,
    borderRadius: 10,
    backgroundColor: colors.textOnDark,
  },
  pillActive: {
    width: 33,
  },
  pillInactive: {
    width: 18,
    opacity: 0.4,
  },

  // Next button
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.textOnDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Slide 5
  slide5Content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  slide5Headline: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textOnDark,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ctaPrimary: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaPrimaryText: {
    color: colors.textOnDark,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  ctaSecondary: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.textOnDark,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaSecondaryText: {
    color: colors.textOnDark,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
