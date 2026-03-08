import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import ScreenGradient from '../components/ScreenGradient';
import SecondaryButton from '../components/SecondaryButton';
import type { TodoFormScreenProps } from '../navigation/types';
import { createTodo, updateTodo } from '../services/api/todosApi';
import { colors, fontSize, spacing } from '../theme/tokens';

export default function TodoFormScreen({ navigation, route }: TodoFormScreenProps) {
  const isEdit = route.params.mode === 'edit';
  const editTodo = route.params.mode === 'edit' ? route.params.todo : undefined;

  // Native header başlığını moda göre dinamik ayarla
  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Görevi Düzenle' : 'Yeni Görev',
    });
  }, [navigation, isEdit]);

  const [title, setTitle] = useState(editTodo?.title ?? '');
  const [description, setDescription] = useState(editTodo?.description ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (title.trim().length === 0) {
      setTitleError('Başlık alanı zorunludur.');
      return;
    }
    setTitleError(null);
    setSaveError(null);
    setSaving(true);

    try {
      if (isEdit && editTodo) {
        await updateTodo(editTodo.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          isCompleted: editTodo.isCompleted,
        });
      } else {
        await createTodo({
          title: title.trim(),
          description: description.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenGradient>
      <View style={styles.container}>
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
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
  },
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
