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
import FloatingActionButton from '../components/FloatingActionButton';
import ScreenGradient from '../components/ScreenGradient';
import SearchBar from '../components/SearchBar';
import type { TodoListScreenProps } from '../navigation/types';
import { deleteTodo, getTodos, toggleTodo } from '../services/api/todosApi';
import { friendlyErrorMessage, getCachedTodos, setCachedTodos } from '../services/cache/todosCacheService';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';
import type { Todo } from '../types/todo';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface TodoItemProps {
  todo: Todo;
  busy: boolean;
  onDetail: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, busy, onDetail, onEdit, onToggle, onDelete }: TodoItemProps) {
  return (
    <View style={[styles.card, busy && styles.cardBusy]}>
      {/* ── Toggle (checkbox) ─────────────────────────────── */}
      <TouchableOpacity
        style={styles.checkboxZone}
        onPress={() => onToggle(todo.id)}
        disabled={busy}
        activeOpacity={0.6}
      >
        <Ionicons
          name={todo.isCompleted ? 'checkbox' : 'square-outline'}
          size={22}
          color={todo.isCompleted ? colors.primary : colors.textOnCardMeta}
        />
      </TouchableOpacity>

      {/* ── Body — tıklanınca TaskDetail ──────────────────── */}
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => onDetail(todo)}
        disabled={busy}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.cardTitle, todo.isCompleted && styles.cardTitleCompleted]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        <Text style={styles.cardMeta}>{formatDate(todo.createdAt)}</Text>
      </TouchableOpacity>

      {/* ── Sağ taraf: busy iken spinner, değilse edit + delete ── */}
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.actionZone} />
      ) : (
        <View style={styles.actionZone}>
          <TouchableOpacity
            onPress={() => onEdit(todo)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(todo.id)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            style={styles.deleteIcon}
          >
            <Ionicons name="trash-outline" size={18} color={colors.delete} />
          </TouchableOpacity>
        </View>
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
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();
  const filteredTodos = trimmed
    ? todos.filter(
        (t) =>
          t.title.toLowerCase().includes(trimmed) ||
          (t.description ?? '').toLowerCase().includes(trimmed),
      )
    : todos;

  const load = useCallback(async (isRefresh = false) => {
    setError(null);

    // 1) Cache'i oku.
    const cached = await getCachedTodos();

    if (cached !== null) {
      // Cache varsa listeyi anında göster; spinner gerekmez.
      setTodos(cached);
      setLoading(false);
    } else if (!isRefresh) {
      // Cache yoksa ve ilk yükleme ise spinner göster.
      setLoading(true);
    }

    if (isRefresh) setRefreshing(true);

    // 2) Her durumda API'den taze veri çek.
    try {
      const apiTodos = await getTodos();
      // 3) API başarılıysa listeyi güncelle ve cache'e yaz.
      setTodos(apiTodos);
      setCachedTodos(apiTodos);
    } catch (e) {
      // Cache varsa: kullanıcı zaten listeyi görüyor; sessizce devam et.
      // Cache yoksa: hata ekranını göster.
      if (cached === null) {
        setError(friendlyErrorMessage(e));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

    // Optimistic update: listeyi yeniden yüklemeden anlık olarak güncelle.
    // load(true) çağrısı RefreshControl'ü tetikler ve iOS'ta scroll jump yaratır.
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)),
    );

    try {
      const updated = await toggleTodo(id);
      // API yanıtıyla kesin state'i yerleştir ve cache'i güncelle.
      setTodos((prev) => {
        const next = prev.map((t) => (t.id === id ? updated : t));
        setCachedTodos(next);
        return next;
      });
    } catch (e) {
      // Başarısız: optimistic değişikliği geri al
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)),
      );
      Alert.alert('Hata', friendlyErrorMessage(e));
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
      // Silinen öğeyi state'ten ve cache'ten anında kaldır.
      // load(true) yerine doğrudan güncelleme: API zaten başarılı döndü,
      // tüm listeyi yeniden çekmeye gerek yok.
      setTodos((prev) => {
        const next = prev.filter((t) => t.id !== id);
        setCachedTodos(next);
        return next;
      });
    } catch (e) {
      Alert.alert('Hata', friendlyErrorMessage(e));
    } finally {
      setBusy(id, false);
    }
  }

  if (loading) {
    return (
      <ScreenGradient>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textOnDark} />
          <Text style={styles.hint}>Yükleniyor…</Text>
        </View>
      </ScreenGradient>
    );
  }

  if (error) {
    return (
      <ScreenGradient>
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </ScreenGradient>
    );
  }

  // SearchBar her zaman üstte sabit; FlatList sadece liste içeriğini yönetir.
  return (
    <ScreenGradient>
      <SearchBar value={query} onChangeText={setQuery} />

      <FlatList
        data={filteredTodos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            busy={busyIds.has(item.id)}
            onDetail={(t) => navigation.navigate('TaskDetail', { todo: t })}
            onEdit={(t) => navigation.navigate('TodoForm', { mode: 'edit', todo: t })}
            onToggle={handleToggle}
            onDelete={handleDeletePress}
          />
        )}
        contentContainerStyle={filteredTodos.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {todos.length === 0 ? 'Henüz görev yok.' : `"${query.trim()}" için sonuç bulunamadı.`}
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.textOnDark}
          />
        }
      />

      <FloatingActionButton onPress={() => navigation.navigate('TodoForm', { mode: 'create' })} />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  // ── State: loading / error ──────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  hint: {
    color: colors.textOnDarkSecondary,
    fontSize: fontSize.body,
  },
  errorText: {
    color: colors.delete,
    fontSize: fontSize.body,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.delete,
  },
  retryText: {
    color: colors.delete,
    fontSize: fontSize.body,
  },

  // ── List ────────────────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textOnDarkSecondary,
    fontSize: fontSize.body,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // ── TaskCard ────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm + 2,
    ...shadows.card,
  },
  cardBusy: {
    opacity: 0.5,
  },

  // Checkbox zone
  checkboxZone: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Body (title + meta) — tıklanınca TaskDetail
  cardBody: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.taskTitleCard,
    fontWeight: '600',
    color: colors.textOnCard,
    marginBottom: spacing.xs,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textOnCardMeta,
    fontWeight: '400',
  },
  cardMeta: {
    fontSize: fontSize.metaCard,
    color: colors.textOnCardMeta,
  },

  // Action zone: edit + delete
  actionZone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    gap: spacing.md,
  },
  deleteIcon: {
    // Ek stil gerektirmez; gap actionZone'dan geliyor
  },
});
