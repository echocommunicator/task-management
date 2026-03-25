import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { Task } from '@/types/task';

interface RestartTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}

export function RestartTaskDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
  isSubmitting,
}: RestartTaskDialogProps) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Restart Task</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-6 mt-4 p-3 rounded-md bg-yellow-50 border border-yellow-200 flex items-center gap-2 text-sm text-yellow-700">
          <RotateCcw className="h-4 w-4" />
          This will reset <strong>{task.task_name}</strong> to Pending status
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Restart Reason *</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Why is this task being restarted?"
            />
          </div>

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
              className="px-4 py-2 text-sm font-medium rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Restarting...' : 'Restart Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
