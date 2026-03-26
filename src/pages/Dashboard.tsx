import { motion } from 'framer-motion';
import {
  Clock, AlertTriangle, CheckCircle, ListTodo,
  Sparkles, AlertOctagon, TrendingUp, Lightbulb, Users,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import { useTaskStats } from '@/hooks/useTaskStats';
import type { AIInsight } from '@/types/task';

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#6b7280',
  closed: '#a855f7',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const kpiCards = [
  { key: 'myOpen', label: 'My Open', icon: ListTodo, gradient: 'from-sky-500 to-blue-600' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, gradient: 'from-rose-500 to-pink-600' },
  { key: 'completed', label: 'Done this week', icon: CheckCircle, gradient: 'from-emerald-500 to-green-600' },
  { key: 'total', label: 'Total Tasks', icon: Clock, gradient: 'from-violet-500 to-purple-600' },
];

const INSIGHT_STYLES: Record<AIInsight['type'], { border: string; bg: string; text: string; iconColor: string }> = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-800', iconColor: 'text-red-500' },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-800', iconColor: 'text-amber-500' },
  success: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800', iconColor: 'text-emerald-500' },
  info: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-800', iconColor: 'text-blue-500' },
};

const INSIGHT_ICONS: Record<AIInsight['type'], typeof AlertOctagon> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  success: TrendingUp,
  info: Lightbulb,
};

// Custom tooltip for the stacked workload chart
function WorkloadTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  const completed = payload.find((p) => p.name === 'Completed')?.value ?? 0;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
      <div className="border-t mt-1.5 pt-1.5 font-semibold">Completion: {rate}%</div>
    </div>
  );
}

export function DashboardPage() {
  const { stats, isLoading } = useTaskStats();

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>;
  }

  const kpiValues: Record<string, number> = {
    myOpen: stats?.myOpenTasks ?? 0,
    overdue: stats?.overdueTasks ?? 0,
    completed: stats?.completedThisWeek ?? 0,
    total: stats?.totalTasks ?? 0,
  };

  // Prepare workload data for stacked bar
  const workloadData = (stats?.userCompletionStats ?? []).map((u) => ({
    name: u.userName.split(' ')[0],
    fullName: u.userName,
    Completed: u.completed,
    'In Progress': u.inProgress,
    Pending: u.pending,
    Overdue: u.overdue,
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-5">
        <h1 className="text-2xl font-bold">
          Task{' '}
          <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
            Command Center
          </span>
        </h1>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpiCards.map((card) => (
          <div
            key={card.key}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} p-4 text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <p className="text-2xl font-bold leading-none">{kpiValues[card.key]}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider mt-1 text-white/80">
              {card.label}
            </p>
            <card.icon className="absolute bottom-2 right-2 h-9 w-9 opacity-[0.07]" strokeWidth={1.5} />
          </div>
        ))}
      </motion.div>

      {/* AI Insights */}
      {stats?.aiInsights && stats.aiInsights.length > 0 && (
        <motion.div variants={fadeUp} className="mb-5">
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-purple-50/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="font-bold text-sm">AI Insights</h2>
              <span className="ml-auto text-[10px] font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                {stats.aiInsights.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {stats.aiInsights.map((insight, i) => {
                const style = INSIGHT_STYLES[insight.type];
                const Icon = INSIGHT_ICONS[insight.type];
                return (
                  <div
                    key={i}
                    className={`border-l-3 ${style.border} ${style.bg} rounded-r-lg px-3 py-2`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`h-4 w-4 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                      <div className="min-w-0">
                        <p className={`font-semibold text-xs ${style.text} leading-tight`}>{insight.title}</p>
                        <p className={`text-[11px] mt-0.5 ${style.text} opacity-70 leading-snug line-clamp-2`}>
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts: Status Donut + Area Trend */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Status Donut */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wider">Status Distribution</h3>
          {stats?.statusDistribution && stats.statusDistribution.some((s) => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={stats.statusDistribution.filter((s) => s.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={75}
                  paddingAngle={3}
                  cornerRadius={4}
                >
                  {stats.statusDistribution
                    .filter((s) => s.value > 0)
                    .map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                    ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (
                      <div className="rounded-lg border bg-card px-3 py-1.5 shadow-lg text-xs">
                        <span className="capitalize font-medium">{String(d.name).replace('_', ' ')}</span>
                        <span className="ml-2 font-bold">{d.value}</span>
                      </div>
                    );
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v: string) => v.replace('_', ' ')}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[190px] flex items-center justify-center text-muted-foreground text-xs">
              No data
            </div>
          )}
        </div>

        {/* Area Trend */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wider">Weekly Trend</h3>
          {stats?.weeklyTrend && stats.weeklyTrend.some((w) => w.created > 0 || w.completed > 0) ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={stats.weeklyTrend}>
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-card px-3 py-1.5 shadow-lg text-xs">
                        <p className="font-semibold mb-0.5">{label}</p>
                        {payload.map((p) => (
                          <div key={p.name} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                            <span className="text-muted-foreground">{p.name}:</span>
                            <span className="font-medium">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="created" stroke="#8b5cf6" strokeWidth={2} fill="url(#gCreated)" name="Created" />
                <Area type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} fill="url(#gCompleted)" name="Completed" />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[190px] flex items-center justify-center text-muted-foreground text-xs">
              No data
            </div>
          )}
        </div>
      </motion.div>

      {/* Team Workload by Stage — Stacked Bar */}
      {workloadData.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Team Workload by Stage
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(160, workloadData.length * 40 + 40)}>
            <BarChart data={workloadData} layout="vertical" barSize={20} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<WorkloadTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Completed" stackId="s" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="In Progress" stackId="s" fill="#3b82f6" />
              <Bar dataKey="Pending" stackId="s" fill="#eab308" />
              <Bar dataKey="Overdue" stackId="s" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </motion.div>
  );
}
