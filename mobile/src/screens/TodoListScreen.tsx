import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useLayoutEffect, useState } from 'react';
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
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';
import { commonStyles } from '../theme/commonStyles';
import { formatDate } from '../utils/formatDate';
import { PRIORITY_META, type Todo } from '../types/todo';
import { useTodos } from '../hooks/useTodos';
import { useDeleteTodo } from '../mutations/useDeleteTodo';
import { useToggleTodo } from '../mutations/useToggleTodo';
import { usePinTodo } from '../mutations/usePinTodo';
import { friendlyErrorMessage } from '../utils/errorMessage';
import { isLocalId } from '../utils/localId';

function isOverdue(dueDate: string | null, isCompleted: boolean): boolean {
  if (!dueDate || isCompleted) return false;
  return new Date(dueDate) < new Date();
}

interface TodoItemProps {
  todo: Todo;
  busy: boolean;
  isPending: boolean;
  onDetail: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}

function TodoItem({ todo, busy, isPending, onDetail, onEdit, onToggle, onDelete, onPin }: TodoItemProps) {
  const priorityMeta = PRIORITY_META[todo.priority ?? 1];
  const overdue = isOverdue(todo.dueDate, todo.isCompleted);
  // Herhangi bir aksiyon kısıtlıysa tüm yazma butonları pasif olur.
  const actionsDisabled = busy || isPending;

  return (
    <View style={[styles.card, todo.isPinned && styles.cardPinned, busy && styles.cardBusy]}>
      {/* ── Toggle (checkbox) ─────────────────────────────── */}
      <TouchableOpacity
        style={styles.checkboxZone}
        onPress={() => onToggle(todo.id)}
        disabled={actionsDisabled}
        activeOpacity={0.6}
      >
        <Ionicons
          name={todo.isCompleted ? 'checkbox' : 'square-outline'}
          size={22}
          color={todo.isCompleted ? colors.primary : colors.textOnCardMeta}
        />
      </TouchableOpacity>

      {/* ── Body — tıklanınca TaskDetail (pending'de de açılabilir) ── */}
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

        {/* Meta: oluşturma tarihi · son tarih (varsa) */}
        <Text style={[styles.cardMeta, overdue && styles.cardMetaOverdue]}>
          {formatDate(todo.createdAt)}
          {todo.dueDate ? `  ·  Son: ${formatDate(todo.dueDate)}` : ''}
        </Text>

        {/* Priority badge */}
        <View style={styles.badgeRow}>
          <View style={[styles.priorityDot, { backgroundColor: priorityMeta.color }]} />
          <Text style={[styles.priorityLabel, { color: priorityMeta.color }]}>
            {priorityMeta.label}
          </Text>
        </View>

        {/* Pending row — sadece sync bekleyen local item'larda gösterilir */}
        {isPending && (
          <View style={styles.pendingRow}>
            <ActivityIndicator
              size="small"
              color={colors.textOnCardMeta}
              style={styles.pendingSpinner}
            />
            <Text style={styles.pendingLabel}>Senkronize bekleniyor</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Sağ taraf: busy iken spinner, değilse pin + edit + delete ── */}
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.actionZone} />
      ) : (
        <View style={[styles.actionZone, isPending && styles.actionZonePending]}>
          <TouchableOpacity
            onPress={() => onPin(todo.id)}
            disabled={isPending}
            activeOpacity={isPending ? 1 : 0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Ionicons
              name={todo.isPinned ? 'pin' : 'pin-outline'}
              size={18}
              color={todo.isPinned ? colors.pin : colors.textOnCardMeta}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onEdit(todo)}
            disabled={isPending}
            activeOpacity={isPending ? 1 : 0.6}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(todo.id)}
            disabled={isPending}
            activeOpacity={isPending ? 1 : 0.6}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.delete} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function TodoListScreen({ navigation }: TodoListScreenProps) {
  // ── TanStack Query — okuma akışı ──────────────────────────────────────────
  const { todos, isLoading, isError, error, refetch } = useTodos();

  // ── Mutation hook'ları — yazma akışı (optimistic) ─────────────────────────
  const toggleMutation = useToggleTodo();
  const pinMutation = usePinTodo();
  const deleteMutation = useDeleteTodo();

  // ── Yerel state — arama + pull-to-refresh ────────────────────────────────
  const [query, setQuery] = useState('');
  // isRefetching yerine kullanıcı kaynaklı yenileme takibi.
  // Mutation onSettled/invalidateQueries gibi arka plan refetch'leri
  // iOS'ta RefreshControl spinner'ını (ve dolayısıyla UIScrollView inset
  // değişimini) tetiklememeli; aksi hâlde liste scroll jump yapar.
  const [userRefreshing, setUserRefreshing] = useState(false);

  // Header sağ üst köşesine profil butonu ekle.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.textOnDark} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Ekran odağa geldiğinde (edit/create'den dönüş dahil) listeyi yenile.
  // useQuery refetchOnWindowFocus React Native'de otomatik tetiklenmez;
  // useFocusEffect köprüsü bu boşluğu kapatır.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Kullanıcı pull-to-refresh hareketi yaptığında çağrılır.
  // userRefreshing state'i yalnızca bu yoldan true olur; mutation kaynaklı
  // arka plan refetch'leri bu state'i etkilemez → iOS scroll jump olmaz.
  async function handleRefresh() {
    setUserRefreshing(true);
    try {
      await refetch();
    } finally {
      setUserRefreshing(false);
    }
  }

  // ── Arama filtresi ───────────────────────────────────────────────────────
  const trimmed = query.trim().toLowerCase();
  const filteredTodos = trimmed
    ? todos.filter(
        (t) =>
          t.title.toLowerCase().includes(trimmed) ||
          (t.description ?? '').toLowerCase().includes(trimmed),
      )
    : todos;

  // ── Toggle ───────────────────────────────────────────────────────────────
  function handleToggle(id: string) {
    toggleMutation.mutate(id, {
      onError: (e) => Alert.alert('Hata', friendlyErrorMessage(e)),
    });
  }

  // ── Pin ──────────────────────────────────────────────────────────────────
  function handlePin(id: string) {
    pinMutation.mutate(id, {
      onError: (e) => Alert.alert('Hata', friendlyErrorMessage(e)),
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────
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

  function handleDeleteConfirm(id: string) {
    deleteMutation.mutate(id, {
      onError: (e) => Alert.alert('Hata', friendlyErrorMessage(e)),
    });
  }

  // ── Yükleme durumu: cache yok, ilk fetch devam ediyor ───────────────────
  if (isLoading) {
    return (
      <ScreenGradient>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.textOnDark} />
          <Text style={styles.hint}>Yükleniyor…</Text>
        </View>
      </ScreenGradient>
    );
  }

  // ── Hata durumu: fetch başarısız VE gösterilecek veri yok ───────────────
  // Cache'ten gelen eski veri varsa (todos.length > 0) listeyi gizleme;
  // kullanıcı stale veriyi görmeye devam eder.
  if (isError && todos.length === 0) {
    const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu.';
    return (
      <ScreenGradient>
        <View style={commonStyles.center}>
          <Text style={commonStyles.screenErrorText}>⚠ {errorMessage}</Text>
          <TouchableOpacity style={commonStyles.retryBtn} onPress={() => refetch()}>
            <Text style={commonStyles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </ScreenGradient>
    );
  }

  // ── Normal liste görünümü ─────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <SearchBar value={query} onChangeText={setQuery} />

      <FlatList
        data={filteredTodos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            busy={
              (toggleMutation.isPending && toggleMutation.variables === item.id) ||
              (pinMutation.isPending && pinMutation.variables === item.id) ||
              (deleteMutation.isPending && deleteMutation.variables === item.id)
            }
            isPending={isLocalId(item.id)}
            onDetail={(t) => navigation.navigate('TaskDetail', { todo: t })}
            onEdit={(t) => navigation.navigate('TodoForm', { mode: 'edit', todo: t })}
            onToggle={handleToggle}
            onDelete={handleDeletePress}
            onPin={handlePin}
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
            refreshing={userRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textOnDark}
          />
        }
      />

      <FloatingActionButton onPress={() => navigation.navigate('TodoForm', { mode: 'create' })} />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  // ── State: loading ──────────────────────────────────────────────────────────
  hint: {
    color: colors.textOnDarkSecondary,
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
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    ...shadows.card,
  },
  cardPinned: {
    borderLeftColor: colors.pin,
  },
  cardBusy: {
    opacity: 0.5,
  },

  // Checkbox zone
  checkboxZone: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Body (title + meta + badge) — tıklanınca TaskDetail
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
    marginBottom: spacing.xs,
  },
  cardMetaOverdue: {
    color: colors.delete,
  },

  // Priority badge
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityLabel: {
    fontSize: fontSize.metaCard,
    fontWeight: '500',
  },

  // Action zone: pin + edit + delete
  actionZone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    gap: spacing.md,
  },
  // Pending: action ikonları grileşir, kart üzerinde sync beklendiği anlaşılır.
  actionZonePending: {
    opacity: 0.3,
  },
  // Pending satırı: spinner + "Senkronize bekleniyor" etiketi
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pendingSpinner: {
    transform: [{ scale: 0.65 }],
  },
  pendingLabel: {
    fontSize: fontSize.metaCard,
    color: colors.textOnCardMeta,
    fontStyle: 'italic',
  },
});
