import { useState, useCallback } from 'react';
import { X, Upload, FileIcon, Trash2, CheckCircle } from 'lucide-react';
import type { Task } from '@/types/task';
import { formatFileSize } from '@/lib/utils';

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSubmit: (notes: string, files: File[]) => void;
  isSubmitting: boolean;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CompleteTaskDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
  isSubmitting,
}: CompleteTaskDialogProps) {
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        alert(`${f.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...validFiles].slice(0, MAX_FILES));
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!open) return null;

  // Check if parent has incomplete subtasks
  const hasIncompleteSubtasks = task.subtasks?.some(
    (s) => s.status === 'pending' || s.status === 'in_progress'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasIncompleteSubtasks) return;
    onSubmit(notes, files);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Complete Task</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success banner */}
        <div className="mx-6 mt-4 p-3 rounded-md bg-green-50 border border-green-200 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          This will mark <strong>{task.task_name}</strong> as Completed
        </div>

        {hasIncompleteSubtasks && (
          <div className="mx-6 mt-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            Cannot complete: this task has {task.subtasks?.filter((s) => s.status === 'pending' || s.status === 'in_progress').length} incomplete subtask(s). Complete all subtasks first.
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Completion Notes *</label>
            <textarea
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe what was done, any notes or issues..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium">Attachments (optional, max {MAX_FILES} files, 10MB each)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={`mt-1 border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-input'
              }`}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop files here, or{' '}
                <label className="text-primary cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                  />
                </label>
              </p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted text-sm">
                  <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
              disabled={isSubmitting || hasIncompleteSubtasks}
              className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Completing...' : 'Mark as Completed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
