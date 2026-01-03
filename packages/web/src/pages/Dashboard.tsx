import { motion } from 'framer-motion';
import { Users, Key, Database, Zap, Server } from 'lucide-react';
import StatsCard, { type StatsCardProps } from '@/components/dashboard/StatsCard';
import ActivityChart from '@/components/dashboard/ActivityChart';
import RecentActivity from '@/components/dashboard/RecentActivity';

export default function Dashboard() {
  const stats: StatsCardProps[] = [
    { title: 'Total Users', value: '2,847', change: '+12.5%', changeType: 'positive', icon: Users },
    { title: 'Vault Items', value: '48,392', change: '+8.2%', changeType: 'positive', icon: Key },
    { title: 'Storage Used', value: '2.4 TB', change: '+3.1%', changeType: 'positive', icon: Database },
    { title: 'Active Sessions', value: '186', change: '-2.4%', changeType: 'negative', icon: Zap },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Admin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">All Systems Operational</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatsCard key={stat.title} {...stat} delay={index * 0.1} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>

      {/* Server Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="bg-[#141414] border border-gray-800/50 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Server className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Server Health</h3>
            <p className="text-gray-500 text-sm">Real-time performance metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'CPU Usage', value: 24, color: 'yellow' },
            { label: 'Memory', value: 68, color: 'yellow' },
            { label: 'Disk I/O', value: 42, color: 'yellow' },
          ].map((metric) => (
            <div key={metric.label} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{metric.label}</span>
                <span className="text-white font-semibold">{metric.value}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.value}%` }}
                  transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}