import { BarChart3, Clock, AlertTriangle, CheckCircle, ListTodo, Users } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useTaskStats } from '@/hooks/useTaskStats';

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#6b7280',
  closed: '#a855f7',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  medium: '#0ea5e9',
  high: '#f97316',
  urgent: '#ef4444',
};

export function DashboardPage() {
  const { stats, isLoading } = useTaskStats();

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<ListTodo className="h-5 w-5 text-blue-600" />}
          label="My Open Tasks"
          value={stats?.myOpenTasks ?? 0}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label="Overdue Tasks"
          value={stats?.overdueTasks ?? 0}
          bgColor="bg-red-50"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          label="Completed This Week"
          value={stats?.completedThisWeek ?? 0}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-purple-600" />}
          label="Total Tasks"
          value={stats?.totalTasks ?? 0}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution Pie */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Task Status Distribution
          </h3>
          {stats?.statusDistribution && stats.statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stats.statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>

        {/* Priority Distribution Bar */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Priority Breakdown
          </h3>
          {stats?.priorityDistribution && stats.priorityDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.priorityDistribution}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Tasks">
                  {stats.priorityDistribution.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="rounded-lg border bg-card p-6 mb-8">
        <h3 className="font-semibold text-sm mb-4">Tasks Created vs Completed Over Time</h3>
        {stats?.weeklyTrend && stats.weeklyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.weeklyTrend}>
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No trend data available
          </div>
        )}
      </div>

      {/* Team Workload */}
      {stats?.teamWorkload && stats.teamWorkload.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Workload
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.teamWorkload} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="tasks" fill="#6366f1" name="Open Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bgColor }: { icon: React.ReactNode; label: string; value: number; bgColor: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
