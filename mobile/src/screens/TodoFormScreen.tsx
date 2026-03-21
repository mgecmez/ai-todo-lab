import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isOverdue } from '../utils/isOverdue';
import DateTimePickerField from '../components/DateTimePickerField';
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

export default function TodoFormScreen({ navigation, route }: TodoFormScreenProps) {
  const { t } = useTranslation();
  const isEdit = route.params.mode === 'edit';
  const editTodo = route.params.mode === 'edit' ? route.params.todo : undefined;

  const priorityOptions: { key: TodoPriority; label: string }[] = [
    { key: TODO_PRIORITY.Low,    label: t('todoForm.priority.low') },
    { key: TODO_PRIORITY.Normal, label: t('todoForm.priority.normal') },
    { key: TODO_PRIORITY.High,   label: t('todoForm.priority.high') },
    { key: TODO_PRIORITY.Urgent, label: t('todoForm.priority.urgent') },
  ];

  // Faz 1 reminder preset'leri — dakika cinsinden; null = hatırlatma yok.
  const reminderOptions: { key: number | null; label: string }[] = [
    { key: null,  label: t('todoForm.reminder.none') },
    { key: 5,     label: t('todoForm.reminder.5min') },
    { key: 15,    label: t('todoForm.reminder.15min') },
    { key: 30,    label: t('todoForm.reminder.30min') },
    { key: 60,    label: t('todoForm.reminder.1hour') },
    { key: 1440,  label: t('todoForm.reminder.1day') },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? t('todoForm.titleEdit') : t('todoForm.titleCreate'),
    });
  }, [navigation, isEdit, t]);

  const [title, setTitle] = useState(editTodo?.title ?? '');
  const [description, setDescription] = useState(editTodo?.description ?? '');
  const [priority, setPriority] = useState<TodoPriority>(
    editTodo?.priority ?? TODO_PRIORITY.Normal,
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    editTodo?.dueDate ? new Date(editTodo.dueDate) : null,
  );
  const [allDay, setAllDay] = useState<boolean>(() => {
    if (!editTodo?.dueDate) return false;
    const d = new Date(editTodo.dueDate);
    return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  });
  const [isPinned, setIsPinned] = useState(editTodo?.isPinned ?? false);
  const [tags, setTags] = useState(editTodo?.tags ?? '');
  const [reminderOffset, setReminderOffset] = useState<number | null>(
    editTodo?.reminderOffset ?? null,
  );

  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();

  // Mutation işlemi sürerken formu kilitle (çift kayıt önleme).
  const saving = createMutation.isPending || updateMutation.isPending;

  // Mutation paused duruma geçtiğinde (backend unreachable → kuyruklandı)
  // form kapanır; kullanıcı optimistic item'ı listede pending olarak görür.
  const mutationQueued = createMutation.isPaused || updateMutation.isPaused;
  useEffect(() => {
    if (mutationQueued) {
      navigation.goBack();
    }
  }, [mutationQueued, navigation]);

  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleDueDateChange(date: Date | null) {
    setDueDate(date);
    if (!date) {
      // dueDate olmadan reminder ve allDay anlamsız; otomatik sıfırla.
      setReminderOffset(null);
      setAllDay(false);
    } else if (isOverdue(date.toISOString(), false)) {
      Alert.alert(
        t('todoForm.pastDateTitle'),
        t('todoForm.pastDateMessage'),
        [{ text: t('common.ok') }],
      );
    }
  }

  function handleSave() {
    if (title.trim().length === 0) {
      setTitleError(t('todoForm.validationTitleRequired'));
      return;
    }
    setTitleError(null);
    setSaveError(null);

    const dueDateISO = dueDate ? dueDate.toISOString() : null;

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
            dueDate: dueDateISO,
            isPinned,
            tags: tags.trim() || null,
            // dueDate yoksa reminder anlamsız; null'a sıfırla.
            reminderOffset: dueDateISO ? reminderOffset : null,
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
          dueDate: dueDateISO ?? undefined,
          isPinned,
          tags: tags.trim() || undefined,
          // dueDate yoksa reminder anlamsız; undefined (= null) ilet.
          reminderOffset: dueDateISO && reminderOffset ? reminderOffset : undefined,
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
          label={t('todoForm.fieldTitle')}
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (titleError) setTitleError(null);
          }}
          placeholder={t('todoForm.placeholderTitle')}
          icon="checkbox-outline"
          editable={!saving}
          returnKeyType="next"
          error={titleError}
        />

        <FormField
          label={t('todoForm.fieldDescription')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('todoForm.placeholderDescription')}
          icon="reorder-three-outline"
          multiline
          editable={!saving}
          returnKeyType="done"
        />

        {/* ── Priority ── */}
        <Text style={styles.fieldLabel}>{t('todoForm.fieldPriority')}</Text>
        <View style={styles.priorityGroup}>
          {priorityOptions.map((opt) => {
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

        {/* ── Due Date — Native Picker ── */}
        <DateTimePickerField
          label={t('todoForm.fieldDueDate')}
          value={dueDate}
          onChange={handleDueDateChange}
          disabled={saving}
          placeholder={t('dateTimePicker.placeholder')}
          allDay={allDay}
        />

        {/* ── All Day toggle — sadece dueDate seçiliyken göster ── */}
        {dueDate && (
          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>{t('todoForm.fieldAllDay')}</Text>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              disabled={saving}
              trackColor={{ false: colors.surfaceInput, true: colors.primary }}
              thumbColor={colors.textOnDark}
            />
          </View>
        )}

        {/* ── IsPinned ── */}
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>{t('todoForm.fieldPin')}</Text>
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
          label={t('todoForm.fieldTags')}
          value={tags}
          onChangeText={setTags}
          placeholder={t('todoForm.placeholderTags')}
          icon="pricetag-outline"
          editable={!saving}
          returnKeyType="done"
        />

        {/* ── Reminder ── */}
        {/* dueDate yoksa seçici görsel olarak soluklaşır ve devre dışıdır. */}
        <Text style={[styles.fieldLabel, !dueDate && styles.fieldLabelDisabled]}>
          {t('todoForm.fieldReminder')}
        </Text>
        {!dueDate && (
          <Text style={styles.reminderHint}>
            {t('todoForm.reminderHint')}
          </Text>
        )}
        <View style={[styles.reminderGroup, !dueDate && styles.reminderGroupDisabled]}>
          {reminderOptions.map((opt) => {
            const selected = reminderOffset === opt.key;
            return (
              <TouchableOpacity
                key={String(opt.key)}
                style={[styles.reminderBtn, selected && styles.reminderBtnSelected]}
                onPress={() => setReminderOffset(opt.key)}
                disabled={saving || !dueDate}
                activeOpacity={0.7}
              >
                <Text style={[styles.reminderBtnText, selected && styles.reminderBtnTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {saveError ? (
          <Text style={styles.saveError}>⚠ {saveError}</Text>
        ) : null}

        <View style={styles.actions}>
          <SecondaryButton
            label={t('common.cancel')}
            onPress={navigation.goBack}
            disabled={saving}
          />
          <PrimaryButton
            label={isEdit ? t('todoForm.buttonUpdate') : t('todoForm.buttonSave')}
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
  // ── IsPinned ──
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  // ── Reminder ──
  fieldLabelDisabled: {
    opacity: 0.4,
  },
  reminderHint: {
    fontSize: fontSize.captionError,
    color: colors.textOnDarkSecondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  reminderGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reminderGroupDisabled: {
    opacity: 0.35,
  },
  reminderBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.textOnDarkSecondary,
  },
  reminderBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reminderBtnText: {
    fontSize: fontSize.captionError,
    color: colors.textOnDarkSecondary,
    fontWeight: '500',
  },
  reminderBtnTextSelected: {
    color: colors.textOnDark,
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
