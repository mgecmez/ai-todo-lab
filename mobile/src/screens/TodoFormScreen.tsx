import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TodoFormScreenProps } from '../navigation/types';
import { createTodo, updateTodo } from '../services/api/todosApi';

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
    <View style={styles.container}>
      <Text style={styles.label}>Başlık *</Text>
      <TextInput
        style={[styles.input, titleError ? styles.inputError : null]}
        placeholder="Görev başlığı"
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          if (titleError) setTitleError(null);
        }}
        editable={!saving}
        returnKeyType="next"
      />
      {titleError && <Text style={styles.fieldError}>{titleError}</Text>}

      <Text style={styles.label}>Açıklama</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="İsteğe bağlı açıklama"
        value={description}
        onChangeText={setDescription}
        editable={!saving}
        multiline
        numberOfLines={3}
        returnKeyType="done"
      />

      {saveError && <Text style={styles.saveError}>⚠ {saveError}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={navigation.goBack}
          disabled={saving}
        >
          <Text style={styles.cancelText}>İptal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveText}>{isEdit ? 'Güncelle' : 'Kaydet'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    // backgroundColor navigator'ın contentStyle'ından geliyor — burada tekrar gerekmez
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#c0392b',
  },
  multiline: {
    height: 90,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: '#c0392b',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 10,
  },
  saveError: {
    color: '#c0392b',
    fontSize: 14,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#555',
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#93b4f5',
  },
  saveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
