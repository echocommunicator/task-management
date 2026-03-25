import type { TaskStatus, TaskPriority } from '@/types/task';

export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    closed: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  return colors[status];
}

export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    closed: 'Closed',
  };
  return labels[status];
}

export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-sky-100 text-sky-700 border-sky-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[priority];
}

export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority];
}

export function canStartTask(
  status: TaskStatus,
  currentUserId: string,
  assignedTo: string,
): boolean {
  return status === 'pending' && currentUserId === assignedTo;
}

export function canCompleteTask(
  status: TaskStatus,
  currentUserId: string,
  assignedTo: string,
): boolean {
  return status === 'in_progress' && currentUserId === assignedTo;
}

export function canCloseTask(
  status: TaskStatus,
  currentUserId: string,
  assignedBy: string,
  isAdmin: boolean,
): boolean {
  return status === 'completed' && (currentUserId === assignedBy || isAdmin);
}

export function canCancelTask(
  status: TaskStatus,
  currentUserId: string,
  assignedBy: string,
  isAdmin: boolean,
): boolean {
  return (
    (status === 'pending' || status === 'in_progress') &&
    (currentUserId === assignedBy || isAdmin)
  );
}

export function canRestartTask(
  status: TaskStatus,
  currentUserId: string,
  assignedBy: string,
  isAdmin: boolean,
): boolean {
  return (
    (status === 'completed' || status === 'cancelled') &&
    (currentUserId === assignedBy || isAdmin)
  );
}

export function canEditTask(
  currentUserId: string,
  assignedTo: string,
  assignedBy: string,
  isAdmin: boolean,
): boolean {
  return currentUserId === assignedTo || currentUserId === assignedBy || isAdmin;
}

export function canReassignTask(
  currentUserId: string,
  assignedBy: string,
  isAdmin: boolean,
): boolean {
  return currentUserId === assignedBy || isAdmin;
}

export function canDeleteTask(
  currentUserId: string,
  assignedBy: string,
  isAdmin: boolean,
): boolean {
  return currentUserId === assignedBy || isAdmin;
}

export function canAddSubtask(
  task: { status: TaskStatus; parent_task_id: string | null },
  currentUserId: string,
  assignedTo: string,
  assignedBy: string,
  isAdmin: boolean,
): boolean {
  const isActive = !['completed', 'cancelled', 'closed'].includes(task.status);
  const hasAccess =
    currentUserId === assignedTo || currentUserId === assignedBy || isAdmin;
  return isActive && hasAccess && task.parent_task_id === null;
}
