import { useQuery } from '@tanstack/react-query';
import type { TaskStats } from '@/types/task';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export function useTaskStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<TaskStats>({
    queryKey: ['task-stats', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

      // My open tasks (pending or in_progress assigned to me)
      const { count: myOpenTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress']);

      // Overdue tasks (due_date < now, not completed/closed/cancelled)
      const { count: overdueTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .lt('due_date', now.toISOString())
        .in('status', ['pending', 'in_progress']);

      // Completed this week
      const { count: completedThisWeek } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', weekStart)
        .lte('completed_at', weekEnd);

      // Total tasks
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Status distribution
      const statusValues = ['pending', 'in_progress', 'completed', 'cancelled', 'closed'] as const;
      const statusDistribution: { name: string; value: number }[] = [];

      for (const status of statusValues) {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);

        statusDistribution.push({ name: status, value: count ?? 0 });
      }

      // Priority distribution
      const priorityValues = ['low', 'medium', 'high', 'urgent'] as const;
      const priorityDistribution: { name: string; value: number }[] = [];

      for (const priority of priorityValues) {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('priority', priority);

        priorityDistribution.push({ name: priority, value: count ?? 0 });
      }

      // Weekly trend (last 4 weeks)
      const weeklyTrend: { week: string; created: number; completed: number }[] = [];

      for (let i = 3; i >= 0; i--) {
        const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const we = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const label = format(ws, 'MMM d');

        const { count: created } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', ws.toISOString())
          .lte('created_at', we.toISOString());

        const { count: completed } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('completed_at', ws.toISOString())
          .lte('completed_at', we.toISOString());

        weeklyTrend.push({
          week: label,
          created: created ?? 0,
          completed: completed ?? 0,
        });
      }

      // Team workload (tasks per assignee)
      const { data: workloadData } = await supabase
        .from('tasks')
        .select('assigned_to, assigned_user:profiles!tasks_assigned_to_fkey(full_name)')
        .in('status', ['pending', 'in_progress']);

      const workloadMap = new Map<string, { name: string; tasks: number }>();

      if (workloadData) {
        for (const row of workloadData) {
          const assignee = row.assigned_user as unknown as { full_name: string } | null;
          const name = assignee?.full_name ?? 'Unassigned';
          const key = row.assigned_to;

          if (workloadMap.has(key)) {
            workloadMap.get(key)!.tasks += 1;
          } else {
            workloadMap.set(key, { name, tasks: 1 });
          }
        }
      }

      const teamWorkload = Array.from(workloadMap.values()).sort(
        (a, b) => b.tasks - a.tasks,
      );

      return {
        myOpenTasks: myOpenTasks ?? 0,
        overdueTasks: overdueTasks ?? 0,
        completedThisWeek: completedThisWeek ?? 0,
        totalTasks: totalTasks ?? 0,
        statusDistribution,
        priorityDistribution,
        weeklyTrend,
        teamWorkload,
      };
    },
    enabled: !!user,
  });

  return { stats, isLoading };
}
