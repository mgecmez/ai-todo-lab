import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenGradient from '../components/ScreenGradient';
import type { TaskDetailScreenProps } from '../navigation/types';
import { colors, fontSize, radius, shadows, spacing } from '../theme/tokens';
import { PRIORITY_META, type Todo } from '../types/todo';
import { useToggleTodo } from '../mutations/useToggleTodo';
import { usePinTodo } from '../mutations/usePinTodo';
import { useDeleteTodo } from '../mutations/useDeleteTodo';
import { friendlyErrorMessage } from '../utils/errorMessage';
import { isLocalId } from '../utils/localId';
import { formatDate } from '../utils/formatDate';

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function isOverdue(dueDate: string | null, isCompleted: boolean): boolean {
  if (!dueDate || isCompleted) return false;
  return new Date(dueDate) < new Date();
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

  // ── Mutation hook'ları ────────────────────────────────────────────────────
  const toggleMutation = useToggleTodo();
  const pinMutation = usePinTodo();
  const deleteMutation = useDeleteTodo();

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

  function handleToggle() {
    toggleMutation.mutate(todo.id, {
      onSuccess: (updated) => setTodo(updated),
      onError: (e) => Alert.alert('Hata', friendlyErrorMessage(e)),
    });
  }

  // ── Pin ─────────────────────────────────────────────────────────────────────

  function handlePin() {
    pinMutation.mutate(todo.id, {
      onSuccess: (updated) => setTodo(updated),
      onError: (e) => Alert.alert('Hata', friendlyErrorMessage(e)),
    });
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

  function handleDeleteConfirm() {
    deleteMutation.mutate(todo.id, {
      onSuccess: () => navigation.goBack(),
      onError: (e) => Alert.alert('Hata', friendlyErrorMessage(e)),
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function handleEdit() {
    navigatedToEdit.current = true;
    navigation.navigate('TodoForm', { mode: 'edit', todo });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const busy = toggleMutation.isPending || pinMutation.isPending || deleteMutation.isPending;
  // Geçici id taşıyan todo henüz sunucuyla senkronize edilmemiş; tüm aksiyonlar kısıtlanır.
  const isPending = isLocalId(todo.id);
  const actionsDisabled = busy || isPending;
  const priorityMeta = PRIORITY_META[todo.priority ?? 1];
  const overdue = isOverdue(todo.dueDate, todo.isCompleted);

  // Virgülle ayrılmış tags → nokta · ile birleştir
  const tagList = todo.tags
    ? todo.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

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
            disabled={actionsDisabled}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={20} color={colors.textOnDarkSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Sync bekleyen durum notu ──────────────────────────── */}
        {isPending && (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={colors.textOnDarkSecondary} />
            <Text style={styles.pendingBannerText}>Sunucuya kaydediliyor…</Text>
          </View>
        )}

        {/* ── Meta 1: oluşturma tarihi + tamamlanma durumu ─────── */}
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

        {/* ── Meta 2: priority + dueDate + isPinned ────────────── */}
        <View style={styles.metaRow2}>
          {/* Priority */}
          <View style={styles.metaItem}>
            <View style={[styles.priorityDot, { backgroundColor: priorityMeta.color }]} />
            <Text style={[styles.metaText, { color: priorityMeta.color }]}>
              {priorityMeta.label}
            </Text>
          </View>

          {/* Due date — sadece varsa göster */}
          {todo.dueDate ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={overdue ? colors.delete : colors.textOnDarkSecondary}
              />
              <Text style={[styles.metaText, overdue && styles.metaOverdue]}>
                {formatDate(todo.dueDate)}
              </Text>
            </View>
          ) : null}

          {/* Pin göstergesi — sadece sabitlenmişse göster */}
          {todo.isPinned ? (
            <View style={styles.metaItem}>
              <Ionicons name="pin" size={14} color={colors.pin} />
              <Text style={[styles.metaText, styles.metaPinned]}>Sabitlenmiş</Text>
            </View>
          ) : null}
        </View>

        {/* ── Açıklama ─────────────────────────────────────────── */}
        {todo.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{todo.description}</Text>
          </View>
        ) : (
          <Text style={styles.noDescription}>Açıklama eklenmemiş.</Text>
        )}

        {/* ── Etiketler — sadece varsa göster ─────────────────── */}
        {tagList.length > 0 ? (
          <View style={styles.tagsCard}>
            <Ionicons name="pricetag-outline" size={14} color={colors.textOnDarkSecondary} />
            <Text style={styles.tagsText}>{tagList.join('  ·  ')}</Text>
          </View>
        ) : null}

        {/* ── Aksiyon butonları ────────────────────────────────── */}
        <View style={styles.actionRow}>
          <ActionButton
            icon="pencil"
            iconColor={colors.primary}
            label="Düzenle"
            onPress={handleEdit}
            disabled={actionsDisabled}
          />
          <ActionButton
            icon={todo.isCompleted ? 'refresh-circle' : 'checkmark-circle'}
            iconColor={colors.done}
            label={todo.isCompleted ? 'Geri Al' : 'Tamamla'}
            onPress={handleToggle}
            disabled={actionsDisabled}
          />
          <ActionButton
            icon={todo.isPinned ? 'pin' : 'pin-outline'}
            iconColor={colors.pin}
            label={todo.isPinned ? 'Çıkar' : 'Sabitle'}
            onPress={handlePin}
            disabled={actionsDisabled}
          />
          <ActionButton
            icon="trash"
            iconColor={colors.delete}
            label="Sil"
            onPress={handleDeletePress}
            disabled={actionsDisabled}
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

  // Pending banner: başlık altında "Sunucuya kaydediliyor…"
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    opacity: 0.65,
  },
  pendingBannerText: {
    fontSize: fontSize.metaDetail,
    color: colors.textOnDarkSecondary,
    fontStyle: 'italic',
  },

  // Meta satır 1: createdAt + tamamlanma
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
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
  metaOverdue: {
    color: colors.delete,
  },
  metaPinned: {
    color: colors.pin,
  },

  // Meta satır 2: priority + dueDate + isPinned
  metaRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Açıklama
  descriptionCard: {
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },

  // Etiketler
  tagsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xl,
    ...shadows.actionBtn,
  },
  tagsText: {
    flex: 1,
    fontSize: fontSize.metaDetail,
    color: colors.textOnDarkSecondary,
  },

  // Hata
  errorText: {
    fontSize: fontSize.body,
    color: colors.delete,
    marginBottom: spacing.md,
  },

  // Aksiyon buton satırı — 4 buton için flex dağılımı
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing['2xl'],
  },

  // Tek aksiyon butonu
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceActionBtn,
    borderRadius: radius.actionBtn,
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
