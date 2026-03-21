import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/auth/authService';
import { colors, gradient } from '../../theme/tokens';
import { commonStyles } from '../../theme/commonStyles';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
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
      await authLogin(res.accessToken, res.refreshToken, res.userId, res.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LinearGradient colors={gradient.screen.colors} style={commonStyles.authFlex}>
      <KeyboardAvoidingView
        style={commonStyles.authFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={commonStyles.authContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={commonStyles.authLogoContainer}>
            <Ionicons name="checkmark" size={40} color={colors.textOnDark} />
          </View>

          {/* Başlık */}
          <Text style={commonStyles.authTitle}>{t('login.title')}</Text>
          <Text style={commonStyles.authSubtitle}>{t('login.subtitle')}</Text>

          {/* Email */}
          <View style={[commonStyles.authInputWrapper, error ? commonStyles.authInputError : null]}>
            <Ionicons name="mail-outline" size={18} color={colors.authInputIcon} style={commonStyles.authInputIcon} />
            <TextInput
              style={commonStyles.authInput}
              placeholder={t('login.placeholderEmail')}
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
          <View style={[commonStyles.authInputWrapper, error ? commonStyles.authInputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.authInputIcon} style={commonStyles.authInputIcon} />
            <TextInput
              style={commonStyles.authInput}
              placeholder={t('login.placeholderPassword')}
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
            <View style={commonStyles.authErrorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.delete} />
              <Text style={commonStyles.authErrorText}>{error}</Text>
            </View>
          ) : null}

          {/* Giriş Yap butonu */}
          <TouchableOpacity
            style={[commonStyles.authButton, isLoading && commonStyles.authButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textOnDark} />
            ) : (
              <Text style={commonStyles.authButtonText}>{t('login.buttonLogin')}</Text>
            )}
          </TouchableOpacity>

          {/* Kayıt Ol linki */}
          <TouchableOpacity
            style={commonStyles.authLinkContainer}
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={commonStyles.authLinkMuted}>{t('login.linkNoAccount')}</Text>
            <Text style={commonStyles.authLinkAccent}>{t('login.linkRegister')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
