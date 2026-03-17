import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/auth/authService';
import { colors, fontSize, fontWeight, gradient, radius, spacing } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login: authLogin } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setIsLoading(true);
    try {
      const res = await login(email.trim(), password);
      await authLogin(res.token, res.userId, res.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LinearGradient colors={gradient.screen.colors} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="checkmark" size={40} color={colors.textOnDark} />
          </View>

          {/* Başlık */}
          <Text style={styles.title}>Welcome Back to DO IT</Text>
          <Text style={styles.subtitle}>Have an other productive day !</Text>

          {/* Email */}
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <Ionicons name="mail-outline" size={18} color={colors.authInputIcon} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              placeholderTextColor={colors.textAuthPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Şifre */}
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.authInputIcon} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={colors.textAuthPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* Hata mesajı */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.delete} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Giriş Yap butonu */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textOnDark} />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          {/* Kayıt Ol linki */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.linkMuted}>Hesabın yok mu? </Text>
            <Text style={styles.linkAccent}>Kayıt Ol</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg + spacing.sm,  // 24
    paddingTop: 60,
    paddingBottom: spacing['3xl'] + spacing.sm,  // 40
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    fontSize: 25,
    fontWeight: fontWeight.medium,
    color: colors.textOnDark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.buttonPrimary + 3,  // 18
    fontWeight: fontWeight.medium,
    color: colors.textOnDark,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAuthInput,
    borderRadius: 5,
    height: 44,
    width: '100%',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.delete,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textAuthInput,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.delete,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    width: '100%',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.captionError,
    color: colors.delete,
  },
  button: {
    width: '100%',
    height: 44,
    backgroundColor: colors.authButtonBg,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: fontWeight.semiBold,
    color: colors.textOnDark,
  },
  linkContainer: {
    flexDirection: 'row',
    minHeight: 44,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkMuted: {
    fontSize: fontSize.body,
    color: colors.textAuthLinkMuted,
  },
  linkAccent: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    color: colors.textAuthLink,
  },
});
