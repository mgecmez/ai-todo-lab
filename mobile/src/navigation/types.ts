import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Todo } from '../types/todo';

/**
 * Ana uygulama stack'inin parametre haritası (authenticated).
 */
export type AppStackParamList = {
  /** Todo listesi ekranı — parametre almaz */
  TodoList: undefined;

  /**
   * Todo formu ekranı
   *   create modu : { mode: 'create' }
   *   edit modu   : { mode: 'edit'; todo: Todo }
   */
  TodoForm: { mode: 'create' } | { mode: 'edit'; todo: Todo };

  /**
   * Görev detay ekranı.
   */
  TaskDetail: { todo: Todo };

  /** Profil ekranı — parametre almaz */
  Profile: undefined;

  /** E-posta değiştirme ekranı — parametre almaz */
  ChangeEmail: undefined;

  /** Şifre değiştirme ekranı — parametre almaz */
  ChangePassword: undefined;
};

/**
 * Auth stack'inin parametre haritası (unauthenticated).
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Geriye dönük uyumluluk için alias */
export type RootStackParamList = AppStackParamList;

export type TodoListScreenProps  = NativeStackScreenProps<AppStackParamList, 'TodoList'>;
export type TodoFormScreenProps  = NativeStackScreenProps<AppStackParamList, 'TodoForm'>;
export type TaskDetailScreenProps = NativeStackScreenProps<AppStackParamList, 'TaskDetail'>;
export type ProfileScreenProps = NativeStackScreenProps<AppStackParamList, 'Profile'>;
export type ChangeEmailScreenProps = NativeStackScreenProps<AppStackParamList, 'ChangeEmail'>;
export type ChangePasswordScreenProps = NativeStackScreenProps<AppStackParamList, 'ChangePassword'>;
