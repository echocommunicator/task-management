import { motion } from 'framer-motion';
import {
  Wallet, IndianRupee, CreditCard, Sparkles, CheckCircle,
  Receipt, Crown, Gift,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const planFeatures = [
  'Unlimited tasks & subtasks',
  'WhatsApp + email notifications',
  'Designation hierarchy',
  'AI insights & analytics',
  'Team workload dashboard',
  'Role-based access control',
  'Priority & deadline tracking',
  'Comments & file attachments',
];

const transactions = [
  { desc: 'Welcome bonus — free credits', amount: '+₹100.00', type: 'credit' as const, date: 'Mar 26, 2026' },
  { desc: 'Pro Plan — 5 users × ₹199', amount: '-₹995.00', type: 'debit' as const, date: 'Pending' },
];

export function BillingPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" />
          Billing &{' '}
          <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
            Subscription
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">Manage your plan, wallet, and payment history</p>
      </motion.div>

      {/* Top row: Wallet + Current Plan */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Wallet Card */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-7">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                <IndianRupee className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet Balance</p>
                <p className="text-4xl font-extrabold tracking-tight">₹100.00</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-primary font-medium mb-5">
              <Sparkles className="h-4 w-4" />
              Welcome bonus — ₹100 free credits applied
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors">
                <CreditCard className="h-4 w-4" />
                Add Funds
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors">
                Auto-recharge Settings
              </button>
            </div>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-7">
          <div className="absolute -top-4 right-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25">
              <Crown className="h-3.5 w-3.5" />
              Active Plan
            </span>
          </div>

          <div className="pt-4">
            <h3 className="text-xl font-bold mb-1">Work-Sync Growth</h3>
            <p className="text-sm text-muted-foreground mb-5">Everything your team needs to stay productive</p>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-extrabold tracking-tight">₹199</span>
              <span className="text-muted-foreground text-lg">/user/month</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {planFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Welcome Credits Banner */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 flex-shrink-0">
            <Gift className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">₹100 Welcome Credits</h3>
            <p className="text-white/80 text-sm mt-0.5">Every new account receives ₹100 in free credits. Use them towards your first billing cycle.</p>
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-white text-purple-700 font-semibold text-sm hover:bg-white/90 transition-colors flex-shrink-0">
            Learn More
          </button>
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div variants={fadeUp} className="rounded-2xl border bg-card p-6">
        <h3 className="font-semibold text-sm mb-5 flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Transaction History
        </h3>

        <div className="space-y-3">
          {transactions.map((tx, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-muted/50 px-5 py-4 gap-2"
            >
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${tx.type === 'credit' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                <span className="text-sm font-medium">{tx.desc}</span>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 pl-5 sm:pl-0">
                <span className="text-sm text-muted-foreground">{tx.date}</span>
                <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tx.amount}
                </span>
              </div>
            </div>
          ))}
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No transactions yet
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
