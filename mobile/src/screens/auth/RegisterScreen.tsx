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
import { register } from '../../services/auth/authService';
import { colors, gradient } from '../../theme/tokens';
import { commonStyles } from '../../theme/commonStyles';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleRegister() {
    setError(null);

    // Client-side şifre eşleşme kontrolü — API'ye gitmeden
    if (password !== passwordConfirm) {
      setError(t('register.errorPasswordMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(email.trim(), password);
      await authLogin(res.token, res.userId, res.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('register.errorGeneric'));
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
          <Text style={commonStyles.authTitle}>{t('register.title')}</Text>
          <Text style={commonStyles.authSubtitle}>{t('register.subtitle')}</Text>

          {/* Email */}
          <View style={[commonStyles.authInputWrapper, error ? commonStyles.authInputError : null]}>
            <Ionicons name="mail-outline" size={18} color={colors.authInputIcon} style={commonStyles.authInputIcon} />
            <TextInput
              style={commonStyles.authInput}
              placeholder={t('register.placeholderEmail')}
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
              placeholder={t('register.placeholderPassword')}
              placeholderTextColor={colors.textAuthPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* Şifre Tekrar */}
          <View style={[commonStyles.authInputWrapper, error === t('register.errorPasswordMismatch') ? commonStyles.authInputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.authInputIcon} style={commonStyles.authInputIcon} />
            <TextInput
              style={commonStyles.authInput}
              placeholder={t('register.placeholderPasswordConfirm')}
              placeholderTextColor={colors.textAuthPlaceholder}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
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

          {/* Kayıt Ol butonu */}
          <TouchableOpacity
            style={[commonStyles.authButton, isLoading && commonStyles.authButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textOnDark} />
            ) : (
              <Text style={commonStyles.authButtonText}>{t('register.buttonRegister')}</Text>
            )}
          </TouchableOpacity>

          {/* Giriş Yap linki */}
          <TouchableOpacity
            style={commonStyles.authLinkContainer}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={commonStyles.authLinkMuted}>{t('register.linkHasAccount')}</Text>
            <Text style={commonStyles.authLinkAccent}>{t('register.linkLogin')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
