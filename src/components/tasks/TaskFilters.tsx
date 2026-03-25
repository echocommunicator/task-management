import { Search } from 'lucide-react';
import type { TaskFilters as TaskFiltersType, TaskPriority } from '@/types/task';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: Partial<TaskFiltersType>) => void;
  assignees: { id: string; full_name: string }[];
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const priorities = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

export function TaskFilters({ filters, onFiltersChange, assignees }: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFiltersChange({ status: tab.value as TaskFiltersType['status'], page: 1 })}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filters.status === tab.value || (!filters.status && tab.value === 'all')
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Priority */}
        <select
          value={filters.priority || 'all'}
          onChange={(e) => onFiltersChange({ priority: e.target.value as TaskPriority | 'all', page: 1 })}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {/* Assignee */}
        <select
          value={filters.assigned_to || ''}
          onChange={(e) => onFiltersChange({ assigned_to: e.target.value || undefined, page: 1 })}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Assignees</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>{a.full_name}</option>
          ))}
        </select>

        {/* Due Date From */}
        <input
          type="date"
          value={filters.due_date_from || ''}
          onChange={(e) => onFiltersChange({ due_date_from: e.target.value || undefined, page: 1 })}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          title="Due date from"
        />

        {/* Due Date To */}
        <input
          type="date"
          value={filters.due_date_to || ''}
          onChange={(e) => onFiltersChange({ due_date_to: e.target.value || undefined, page: 1 })}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          title="Due date to"
        />

        {/* Items per page */}
        <select
          value={filters.items_per_page}
          onChange={(e) => onFiltersChange({ items_per_page: Number(e.target.value), page: 1 })}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
    </div>
  );
}
