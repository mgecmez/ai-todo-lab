import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Todo } from '../types/todo';

/**
 * Stack navigator parametre haritası.
 * Kaynak: docs/navigation.md — Route Param Sözleşmesi
 */
export type RootStackParamList = {
  /** Todo listesi ekranı — parametre almaz */
  TodoList: undefined;

  /**
   * Todo formu ekranı
   *   create modu : { mode: 'create' }
   *   edit modu   : { mode: 'edit'; todo: Todo }
   */
  TodoForm: { mode: 'create' } | { mode: 'edit'; todo: Todo };
};

/** `TodoListScreen` için navigation + route prop tipleri */
export type TodoListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TodoList'
>;

/** `TodoFormScreen` için navigation + route prop tipleri */
export type TodoFormScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TodoForm'
>;
