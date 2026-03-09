// ── Priority ─────────────────────────────────────────────────────────────────

/**
 * Backend TodoPriority enum'ının integer karşılıkları.
 * Veritabanında integer olarak saklanır; API bu değerleri number olarak döndürür.
 */
export const TODO_PRIORITY = {
  Low:    0,
  Normal: 1,
  High:   2,
  Urgent: 3,
} as const;

export type TodoPriority = typeof TODO_PRIORITY[keyof typeof TODO_PRIORITY];

/**
 * Priority'nin kullanıcıya gösterilen etiket ve renk bilgileri.
 * TodoListScreen, TodoFormScreen ve TaskDetailScreen bu sabiti kullanır.
 */
export const PRIORITY_META: Record<TodoPriority, { label: string; color: string }> = {
  [TODO_PRIORITY.Low]:    { label: 'Düşük',  color: '#9E9E9E' },
  [TODO_PRIORITY.Normal]: { label: 'Normal',  color: '#2196F3' },
  [TODO_PRIORITY.High]:   { label: 'Yüksek', color: '#FF9800' },
  [TODO_PRIORITY.Urgent]: { label: 'Acil',   color: '#F44336' },
};

// ── Todo ─────────────────────────────────────────────────────────────────────

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  priority: TodoPriority;
  dueDate: string | null;   // ISO 8601; sadece gün bileşeni kullanılır
  isPinned: boolean;
  tags: string | null;      // virgülle ayrılmış; örn. "iş,kişisel"
  createdAt: string;
  updatedAt: string;
}

// ── Request tipleri ───────────────────────────────────────────────────────────

export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority?: TodoPriority;  // belirtilmezse backend Normal uygular
  dueDate?: string;         // ISO 8601
  isPinned?: boolean;       // belirtilmezse false
  tags?: string;            // virgülle ayrılmış
}

export interface UpdateTodoRequest {
  title: string;
  description?: string;
  isCompleted: boolean;
  // Yeni alanlar TM-009'da TodoFormScreen güncellenerek zorunlu hale gelecek.
  // Bu aşamada opsiyonel tutulur; backend belirtilmezse Normal/false/null uygular.
  priority?: TodoPriority;
  dueDate?: string | null;
  isPinned?: boolean;
  tags?: string | null;
}
