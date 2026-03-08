import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Todo } from '../types/todo';

/**
 * Stack navigator parametre haritası.
 * Kaynak: docs/navigation.md ve docs/screen-list.md — Route Param Sözleşmesi
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

  /**
   * Görev detay ekranı.
   * Backend'de GET /api/todos/:id endpoint'i olmadığından
   * Todo nesnesi liste ekranından params üzerinden taşınır.
   */
  TaskDetail: { todo: Todo };
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

/** `TaskDetailScreen` için navigation + route prop tipleri */
export type TaskDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TaskDetail'
>;
