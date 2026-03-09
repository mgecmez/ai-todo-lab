import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ScreenGradient from '../components/ScreenGradient';
import SecondaryButton from '../components/SecondaryButton';
import type { TodoFormScreenProps } from '../navigation/types';
import { friendlyErrorMessage } from '../utils/errorMessage';
import { colors, fontSize, radius, spacing } from '../theme/tokens';
import { PRIORITY_META, TODO_PRIORITY, type TodoPriority } from '../types/todo';
import { useCreateTodo } from '../mutations/useCreateTodo';
import { useUpdateTodo } from '../mutations/useUpdateTodo';

const PRIORITY_OPTIONS: { key: TodoPriority; label: string }[] = [
  { key: TODO_PRIORITY.Low,    label: 'Düşük'  },
  { key: TODO_PRIORITY.Normal, label: 'Normal' },
  { key: TODO_PRIORITY.High,   label: 'Yüksek' },
  { key: TODO_PRIORITY.Urgent, label: 'Acil'   },
];

export default function TodoFormScreen({ navigation, route }: TodoFormScreenProps) {
  const isEdit = route.params.mode === 'edit';
  const editTodo = route.params.mode === 'edit' ? route.params.todo : undefined;

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Görevi Düzenle' : 'Yeni Görev',
    });
  }, [navigation, isEdit]);

  const [title, setTitle] = useState(editTodo?.title ?? '');
  const [description, setDescription] = useState(editTodo?.description ?? '');
  const [priority, setPriority] = useState<TodoPriority>(
    editTodo?.priority ?? TODO_PRIORITY.Normal,
  );
  const [dueDateText, setDueDateText] = useState(
    editTodo?.dueDate ? editTodo.dueDate.slice(0, 10) : '',
  );
  const [dueDate, setDueDate] = useState<string | null>(editTodo?.dueDate ?? null);
  const [isPinned, setIsPinned] = useState(editTodo?.isPinned ?? false);
  const [tags, setTags] = useState(editTodo?.tags ?? '');

  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();

  // Mutation işlemi sürerken formu kilitle (çift kayıt önleme).
  const saving = createMutation.isPending || updateMutation.isPending;

  // Mutation paused duruma geçtiğinde (backend unreachable → kuyruklandı)
  // form kapanır; kullanıcı optimistic item'ı listede pending olarak görür.
  // isPaused yalnızca başarılı kuyruklamada true olur; 4xx/5xx hataları
  // onError üzerinden gelir ve aşağıdaki saveError state'ini günceller.
  const mutationQueued = createMutation.isPaused || updateMutation.isPaused;
  useEffect(() => {
    if (mutationQueued) {
      navigation.goBack();
    }
  }, [mutationQueued, navigation]);

  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleDueDateChange(text: string) {
    setDueDateText(text);
    if (text.trim() === '') {
      setDueDate(null);
      return;
    }
    const parsed = new Date(text.trim());
    setDueDate(isNaN(parsed.getTime()) ? null : parsed.toISOString());
  }

  function handleClearDueDate() {
    setDueDateText('');
    setDueDate(null);
  }

  function handleSave() {
    if (title.trim().length === 0) {
      setTitleError('Başlık alanı zorunludur.');
      return;
    }
    setTitleError(null);
    setSaveError(null);

    // Mutation başarılı → geri dön; hata → saveError göster.
    // onMutate cache'i anında günceller (optimistic); goBack() başarı
    // callback'inde çağrıldığından online'da doğrulama sonrası, offline'da
    // ise mutasyon paused kuyruğuna alındığında form kilitli kalır.
    const onSuccess = () => navigation.goBack();
    const onError = (e: Error) => setSaveError(friendlyErrorMessage(e));

    if (isEdit && editTodo) {
      updateMutation.mutate(
        {
          id: editTodo.id,
          request: {
            title: title.trim(),
            description: description.trim() || undefined,
            isCompleted: editTodo.isCompleted,
            priority,
            dueDate,
            isPinned,
            tags: tags.trim() || null,
          },
        },
        { onSuccess, onError },
      );
    } else {
      createMutation.mutate(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate ?? undefined,
          isPinned,
          tags: tags.trim() || undefined,
        },
        { onSuccess, onError },
      );
    }
  }

  return (
    <ScreenGradient>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormField
          label="Başlık *"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (titleError) setTitleError(null);
          }}
          placeholder="Görev başlığı"
          icon="checkbox-outline"
          editable={!saving}
          returnKeyType="next"
          error={titleError}
        />

        <FormField
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="İsteğe bağlı açıklama"
          icon="reorder-three-outline"
          multiline
          editable={!saving}
          returnKeyType="done"
        />

        {/* ── Priority ── */}
        <Text style={styles.fieldLabel}>Öncelik</Text>
        <View style={styles.priorityGroup}>
          {PRIORITY_OPTIONS.map((opt) => {
            const meta = PRIORITY_META[opt.key];
            const selected = priority === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.priorityBtn,
                  selected && { backgroundColor: meta.color, borderColor: meta.color },
                ]}
                onPress={() => setPriority(opt.key)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={[styles.priorityBtnText, selected && styles.priorityBtnTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Due Date ── */}
        <FormField
          label="Son Tarih"
          value={dueDateText}
          onChangeText={handleDueDateChange}
          placeholder="YYYY-AA-GG  (örn. 2026-03-15)"
          icon="calendar-outline"
          editable={!saving}
          returnKeyType="next"
        />
        {dueDateText.length > 0 && (
          <TouchableOpacity
            style={styles.clearDueDateBtn}
            onPress={handleClearDueDate}
            disabled={saving}
          >
            <Text style={styles.clearDueDateText}>Tarihi Temizle</Text>
          </TouchableOpacity>
        )}

        {/* ── IsPinned ── */}
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Sabitle</Text>
          <Switch
            value={isPinned}
            onValueChange={setIsPinned}
            disabled={saving}
            trackColor={{ false: colors.surfaceInput, true: colors.pin }}
            thumbColor={colors.textOnDark}
          />
        </View>

        {/* ── Tags ── */}
        <FormField
          label="Etiketler"
          value={tags}
          onChangeText={setTags}
          placeholder="Virgülle ayırarak birden fazla etiket ekleyebilirsiniz"
          icon="pricetag-outline"
          editable={!saving}
          returnKeyType="done"
        />

        {saveError ? (
          <Text style={styles.saveError}>⚠ {saveError}</Text>
        ) : null}

        <View style={styles.actions}>
          <SecondaryButton
            label="İptal"
            onPress={navigation.goBack}
            disabled={saving}
          />
          <PrimaryButton
            label={isEdit ? 'Güncelle' : 'Kaydet'}
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </ScrollView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  fieldLabel: {
    fontSize: fontSize.label,
    color: colors.textOnDarkSecondary,
    marginBottom: spacing.xs,
  },
  // ── Priority ──
  priorityGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priorityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.textOnDarkSecondary,
  },
  priorityBtnText: {
    fontSize: fontSize.captionError,
    color: colors.textOnDarkSecondary,
    fontWeight: '500',
  },
  priorityBtnTextSelected: {
    color: colors.textOnDark,
  },
  // ── Due Date ──
  clearDueDateBtn: {
    alignSelf: 'flex-start',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  clearDueDateText: {
    fontSize: fontSize.captionError,
    color: colors.textCancel,
  },
  // ── IsPinned ──
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  // ── Errors / Actions ──
  saveError: {
    fontSize: fontSize.body,
    color: colors.delete,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
