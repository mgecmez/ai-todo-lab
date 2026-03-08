import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenGradient from '../components/ScreenGradient';
import type { TaskDetailScreenProps } from '../navigation/types';
import { deleteTodo, toggleTodo } from '../services/api/todosApi';
import { friendlyErrorMessage, getCachedTodos, setCachedTodos } from '../services/cache/todosCacheService';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';
import type { Todo } from '../types/todo';

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Action Button ────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function ActionButton({ icon, iconColor, label, onPress, disabled = false }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={28} color={iconColor} />
      <Text style={styles.actionBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TaskDetailScreen({ navigation, route }: TaskDetailScreenProps) {
  const [todo, setTodo] = useState<Todo>(route.params.todo);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit'ten dönerken stale data göstermemek için detail kendini pop'lar
  const navigatedToEdit = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (navigatedToEdit.current) {
        navigatedToEdit.current = false;
        navigation.goBack(); // → liste useFocusEffect ile yenilenir
      }
    }, [navigation]),
  );

  // ── Toggle ──────────────────────────────────────────────────────────────────

  async function handleToggle() {
    setToggling(true);
    setActionError(null);
    try {
      const updated = await toggleTodo(todo.id);
      setTodo(updated); // API'dan dönen güncel todo state'i günceller
      // Cache'teki ilgili öğeyi de güncelle.
      const cached = await getCachedTodos();
      if (cached !== null) {
        await setCachedTodos(cached.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch (e) {
      const msg = friendlyErrorMessage(e);
      setActionError(msg);
      Alert.alert('Hata', msg);
    } finally {
      setToggling(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  function handleDeletePress() {
    Alert.alert(
      'Görevi Sil',
      'Bu görevi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: handleDeleteConfirm },
      ],
    );
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    setActionError(null);
    try {
      await deleteTodo(todo.id);
      // Cache'ten kaldır; liste ekranı döndüğünde stale veri görmez.
      const cached = await getCachedTodos();
      if (cached !== null) {
        await setCachedTodos(cached.filter((t) => t.id !== todo.id));
      }
      navigation.goBack(); // → listeye dön; list useFocusEffect ile yenilenir
    } catch (e) {
      const msg = friendlyErrorMessage(e);
      setActionError(msg);
      Alert.alert('Hata', msg);
      setDeleting(false);
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function handleEdit() {
    navigatedToEdit.current = true;
    navigation.navigate('TodoForm', { mode: 'edit', todo });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const busy = toggling || deleting;

  return (
    <ScreenGradient>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Başlık ───────────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{todo.title}</Text>
          <TouchableOpacity
            onPress={handleEdit}
            disabled={busy}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={20} color={colors.textOnDarkSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Meta: tarih + tamamlandı durumu ─────────────────── */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textOnDarkSecondary} />
            <Text style={styles.metaText}>{formatDate(todo.createdAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name={todo.isCompleted ? 'checkbox-outline' : 'square-outline'}
              size={14}
              color={todo.isCompleted ? colors.done : colors.textOnDarkSecondary}
            />
            <Text style={[styles.metaText, todo.isCompleted && styles.metaCompleted]}>
              {todo.isCompleted ? 'Tamamlandı' : 'Devam ediyor'}
            </Text>
          </View>
        </View>

        {/* ── Açıklama ─────────────────────────────────────────── */}
        {todo.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{todo.description}</Text>
          </View>
        ) : (
          <Text style={styles.noDescription}>Açıklama eklenmemiş.</Text>
        )}

        {/* ── Aksiyon hatası ───────────────────────────────────── */}
        {actionError ? (
          <Text style={styles.errorText}>⚠ {actionError}</Text>
        ) : null}

        {/* ── Aksiyon butonları ────────────────────────────────── */}
        <View style={styles.actionRow}>
          <ActionButton
            icon="pencil"
            iconColor={colors.primary}
            label="Düzenle"
            onPress={handleEdit}
            disabled={busy}
          />
          <ActionButton
            icon={todo.isCompleted ? 'refresh-circle' : 'checkmark-circle'}
            iconColor={colors.done}
            label={todo.isCompleted ? 'Geri Al' : 'Tamamla'}
            onPress={handleToggle}
            disabled={busy}
          />
          <ActionButton
            icon="trash"
            iconColor={colors.delete}
            label="Sil"
            onPress={handleDeletePress}
            disabled={busy}
          />
        </View>
      </ScrollView>
    </ScreenGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },

  // Başlık
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: fontSize.taskTitleDetail,
    fontWeight: '700',
    color: colors.textOnDark,
    lineHeight: 32,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.metaDetail,
    color: colors.textOnDarkSecondary,
  },
  metaCompleted: {
    color: colors.done,
  },

  // Açıklama
  descriptionCard: {
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.actionBtn,
  },
  descriptionText: {
    fontSize: fontSize.body,
    color: colors.textOnDark,
    lineHeight: 22,
    opacity: 0.9,
  },
  noDescription: {
    fontSize: fontSize.body,
    color: colors.textPlaceholder,
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },

  // Hata
  errorText: {
    fontSize: fontSize.body,
    color: colors.delete,
    marginBottom: spacing.md,
  },

  // Aksiyon buton satırı
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 'auto',
    paddingTop: spacing['2xl'],
  },

  // Tek aksiyon butonu
  actionBtn: {
    backgroundColor: colors.surfaceActionBtn,
    borderRadius: radius.actionBtn,
    width: 88,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.actionBtn,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionBtnLabel: {
    fontSize: fontSize.actionLabel,
    fontWeight: '500',
    color: colors.textOnDark,
  },
});
