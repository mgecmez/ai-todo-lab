import DateTimePicker from '@react-native-community/datetimepicker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSize, fontWeight, radius, sizes, spacing } from '../theme/tokens';
import { formatDate } from '../utils/formatDate';

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface DateTimePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
}

type PickerPhase = 'date' | 'time' | 'closed';

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export default function DateTimePickerField({
  label,
  value,
  onChange,
  disabled = false,
}: DateTimePickerFieldProps) {
  // iOS için: hangi aşamadayız?
  const [phase, setPhase] = useState<PickerPhase>('closed');
  // iOS date aşamasındaki seçilen değeri time aşamasına taşımak için
  const [pendingDate, setPendingDate] = useState<Date>(new Date());
  // iOS picker'ın anlık değeri (spinner dönerken değişir)
  const [currentPickerValue, setCurrentPickerValue] = useState<Date>(new Date());

  // ── Picker açma ────────────────────────────────────────────────────────────

  function openPicker() {
    if (disabled) return;
    const initial = value ?? new Date();
    if (Platform.OS === 'android') {
      openAndroidDate(initial);
    } else {
      setCurrentPickerValue(initial);
      setPhase('date');
    }
  }

  // ── Android — imperative API ───────────────────────────────────────────────

  function openAndroidDate(initial: Date) {
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      onChange: (event, selectedDate) => {
        if (event.type === 'dismissed' || !selectedDate) return;
        openAndroidTime(selectedDate);
      },
    });
  }

  function openAndroidTime(dateWithDate: Date) {
    DateTimePickerAndroid.open({
      value: dateWithDate,
      mode: 'time',
      is24Hour: true,
      onChange: (event, selectedDate) => {
        if (event.type === 'dismissed' || !selectedDate) return;
        onChange(selectedDate);
      },
    });
  }

  // ── iOS — Modal spinner ────────────────────────────────────────────────────

  function handleIOSPickerChange(_event: unknown, selectedDate?: Date) {
    if (selectedDate) setCurrentPickerValue(selectedDate);
  }

  function handleIOSConfirm() {
    if (phase === 'date') {
      setPendingDate(currentPickerValue);
      setPhase('time');
    } else {
      // Tarih kısmını pendingDate'den, saat kısmını currentPickerValue'dan al
      const combined = new Date(pendingDate);
      combined.setHours(
        currentPickerValue.getHours(),
        currentPickerValue.getMinutes(),
        0,
        0,
      );
      onChange(combined);
      setPhase('closed');
    }
  }

  function handleIOSCancel() {
    setPhase('closed');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const displayText = value ? formatDate(value.toISOString()) : null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        {/* Tetikleyici */}
        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={openPicker}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={displayText ? colors.textOnDark : colors.textOnDarkSecondary}
          />
          <Text
            style={[styles.triggerText, !displayText && styles.triggerPlaceholder]}
            numberOfLines={1}
          >
            {displayText ?? 'Tarih seçilmedi'}
          </Text>
        </TouchableOpacity>

        {/* Temizle butonu — değer seçiliyken göster */}
        {value !== null && !disabled && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChange(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color={colors.textOnDarkSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* iOS — Modal picker */}
      {Platform.OS === 'ios' && phase !== 'closed' && (
        <Modal transparent animationType="slide" visible>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Modal başlık satırı */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleIOSCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.modalCancel}>İptal</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {phase === 'date' ? 'Tarih Seç' : 'Saat Seç'}
                </Text>
                <TouchableOpacity onPress={handleIOSConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.modalConfirm}>Tamam</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={currentPickerValue}
                mode={phase}
                display="spinner"
                onChange={handleIOSPickerChange}
                locale="tr-TR"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.label,
    color: colors.textOnDarkSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // ── Tetikleyici ──────────────────────────────────────────────────────────────
  trigger: {
    flex: 1,
    height: sizes.dateTimeField,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textOnDark,
  },
  triggerPlaceholder: {
    color: colors.textOnDarkSecondary,
  },
  clearBtn: {
    padding: spacing.xs,
  },

  // ── iOS Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing['3xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    color: colors.textOnCard,
  },
  modalCancel: {
    fontSize: fontSize.body,
    color: colors.textOnCardMeta,
    minWidth: 50,
  },
  modalConfirm: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semiBold,
    color: colors.primary,
    minWidth: 50,
    textAlign: 'right',
  },
});
