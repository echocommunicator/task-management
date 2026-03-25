import { ChevronDown, ChevronRight, Play, CheckCircle, Edit, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Task } from '@/types/task';
import { cn, formatDate } from '@/lib/utils';
import { getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/lib/taskUtils';
import * as perms from '@/lib/taskUtils';

interface SubtaskListProps {
  subtasks: Task[];
  currentUserId: string;
  isAdmin: boolean;
  parentTask: Task;
  onStart: (task: Task) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onAddSubtask: () => void;
  onClick: (task: Task) => void;
}

export function SubtaskList({
  subtasks,
  currentUserId,
  isAdmin,
  parentTask,
  onStart,
  onComplete,
  onEdit,
  onAddSubtask,
  onClick,
}: SubtaskListProps) {
  const [expanded, setExpanded] = useState(true);
  const canAdd = perms.canAddSubtask(parentTask, currentUserId, parentTask.assigned_to, parentTask.assigned_by, isAdmin);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="font-semibold text-sm flex items-center gap-2 hover:text-primary"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Subtasks ({subtasks.length})
        </button>
        {canAdd && (
          <button
            onClick={onAddSubtask}
            className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Subtask
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-1">
          {subtasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No subtasks</p>
          )}
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 p-2.5 rounded-md border bg-card hover:shadow-sm cursor-pointer"
              onClick={() => onClick(subtask)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{subtask.task_number}</span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', getStatusColor(subtask.status))}>
                    {getStatusLabel(subtask.status)}
                  </span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', getPriorityColor(subtask.priority))}>
                    {getPriorityLabel(subtask.priority)}
                  </span>
                </div>
                <p className="text-sm font-medium mt-0.5 truncate">{subtask.task_name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>Due: {formatDate(subtask.due_date)}</span>
                  {subtask.assigned_user && <span>{subtask.assigned_user.full_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {perms.canStartTask(subtask.status, currentUserId, subtask.assigned_to) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onStart(subtask); }}
                    className="p-1 rounded hover:bg-blue-100 text-blue-600"
                    title="Start"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                )}
                {perms.canCompleteTask(subtask.status, currentUserId, subtask.assigned_to) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onComplete(subtask); }}
                    className="p-1 rounded hover:bg-green-100 text-green-600"
                    title="Complete"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>
                )}
                {perms.canEditTask(currentUserId, subtask.assigned_to, subtask.assigned_by, isAdmin) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(subtask); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
