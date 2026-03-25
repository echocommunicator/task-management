import { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskPriority, Profile } from '@/types/task';
import { canReassignTask } from '@/lib/taskUtils';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  profiles: Profile[];
  currentUserId: string;
  isAdmin: boolean;
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => void;
  isSubmitting: boolean;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  profiles,
  currentUserId,
  isAdmin,
  onSubmit,
  isSubmitting,
}: TaskDialogProps) {
  const isEditing = !!task;
  const canReassign = task ? canReassignTask(currentUserId, task.assigned_by, isAdmin) : true;

  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    assigned_to: '',
    due_date: '',
    start_date: '',
    priority: 'medium' as TaskPriority,
    tags: '',
    estimated_hours: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        start_date: task.start_date || '',
        priority: task.priority,
        tags: (task.tags || []).join(', '),
        estimated_hours: task.estimated_hours?.toString() || '',
      });
    } else {
      setFormData({
        task_name: '',
        description: '',
        assigned_to: '',
        due_date: '',
        start_date: '',
        priority: 'medium',
        tags: '',
        estimated_hours: '',
      });
    }
  }, [task, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const data: CreateTaskInput | UpdateTaskInput = {
      task_name: formData.task_name,
      description: formData.description || undefined,
      assigned_to: formData.assigned_to,
      due_date: formData.due_date,
      start_date: formData.start_date || undefined,
      priority: formData.priority,
      tags: tags.length > 0 ? tags : undefined,
      estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : undefined,
    };

    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Name */}
          <div>
            <label className="text-sm font-medium">Task Name *</label>
            <input
              type="text"
              required
              value={formData.task_name}
              onChange={(e) => setFormData((p) => ({ ...p, task_name: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter task name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe the task..."
            />
          </div>

          {/* Assign To */}
          <div>
            <label className="text-sm font-medium">Assign To *</label>
            {isEditing && !canReassign ? (
              <div className="mt-1 flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-input bg-muted text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>{task?.assigned_user?.full_name || 'Unknown'}</span>
                <span className="text-xs ml-auto">Only the task creator can reassign</span>
              </div>
            ) : (
              <select
                required
                value={formData.assigned_to}
                onChange={(e) => setFormData((p) => ({ ...p, assigned_to: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select assignee</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Due Date & Start Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Due Date *</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium">Priority *</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Comma-separated tags"
            />
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="text-sm font-medium">Estimated Hours</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData((p) => ({ ...p, estimated_hours: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
