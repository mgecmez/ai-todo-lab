import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TodoListScreenProps } from '../navigation/types';
import { deleteTodo, getTodos, toggleTodo } from '../services/api/todosApi';
import type { Todo } from '../types/todo';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface TodoItemProps {
  todo: Todo;
  busy: boolean;
  onEdit: (todo: Todo) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, busy, onEdit, onToggle, onDelete }: TodoItemProps) {
  return (
    <View style={[styles.item, busy && styles.itemBusy]}>
      <TouchableOpacity
        style={styles.itemCheckbox}
        onPress={() => onToggle(todo.id)}
        disabled={busy}
        activeOpacity={0.6}
      >
        <Text style={styles.checkboxIcon}>{todo.isCompleted ? '☑' : '☐'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.itemBody} onPress={() => onEdit(todo)} disabled={busy} activeOpacity={0.7}>
        <Text style={[styles.itemTitle, todo.isCompleted && styles.completed]} numberOfLines={2}>
          {todo.title}
        </Text>
        <Text style={styles.itemDate}>{formatDate(todo.createdAt)}</Text>
      </TouchableOpacity>

      {busy ? (
        <ActivityIndicator size="small" color="#2563eb" style={styles.itemAction} />
      ) : (
        <TouchableOpacity style={styles.itemAction} onPress={() => onDelete(todo.id)} activeOpacity={0.6}>
          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TodoListScreen({ navigation }: TodoListScreenProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getTodos();
      setTodos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Form'dan geri dönüş dahil her ekran odaklanmasında listeyi yenile.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function setBusy(id: string, value: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      value ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function handleToggle(id: string) {
    setBusy(id, true);
    try {
      await toggleTodo(id);
      await load(true);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Toggle işlemi başarısız.');
    } finally {
      setBusy(id, false);
    }
  }

  function handleDeletePress(id: string) {
    Alert.alert(
      'Görevi Sil',
      'Bu görevi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => handleDeleteConfirm(id) },
      ],
    );
  }

  async function handleDeleteConfirm(id: string) {
    setBusy(id, true);
    try {
      await deleteTodo(id);
      await load(true);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Silme işlemi başarısız.');
    } finally {
      setBusy(id, false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Yükleniyor…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠ {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            busy={busyIds.has(item.id)}
            onEdit={(t) => navigation.navigate('TodoForm', { mode: 'edit', todo: t })}
            onToggle={handleToggle}
            onDelete={handleDeletePress}
          />
        )}
        contentContainerStyle={todos.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Henüz görev yok.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TodoForm', { mode: 'create' })}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hint: {
    color: '#666',
  },
  errorText: {
    color: '#c0392b',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c0392b',
  },
  retryText: {
    color: '#c0392b',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemBusy: {
    opacity: 0.5,
  },
  itemCheckbox: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  checkboxIcon: {
    fontSize: 22,
    color: '#2563eb',
  },
  itemBody: {
    flex: 1,
    paddingHorizontal: 8,
  },
  itemTitle: {
    fontSize: 15,
    color: '#222',
    marginBottom: 3,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  itemDate: {
    fontSize: 12,
    color: '#bbb',
  },
  itemAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
  },
});
