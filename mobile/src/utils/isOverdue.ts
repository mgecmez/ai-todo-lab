export function isOverdue(dueDate: string | null | undefined, isCompleted: boolean): boolean {
  if (!dueDate || isCompleted) return false;
  return new Date(dueDate) < new Date();
}
