import { motion } from 'framer-motion';
import { Users, Key, HardDrive, Zap, Server, TriangleAlert } from 'lucide-react';
import StatsCard, { type StatsCardProps } from '@/components/dashboard/StatsCard';
import ActivityChart from '@/components/dashboard/ActivityChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { themeClasses, accentClasses } = useTheme();

  const stats: StatsCardProps[] = [
    { title: 'Total Users', value: '2,847', change: '+12.5%', changeType: 'positive', icon: Users },
    { title: 'Vault Items', value: '48,392', change: '+8.2%', changeType: 'positive', icon: Key },
    { title: 'Storage Used', value: '2.4 TB', change: '+3.1%', changeType: 'positive', icon: HardDrive },
    { title: 'Active Sessions', value: '186', change: '-2.4%', changeType: 'negative', icon: Zap },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl font-bold ${themeClasses.text} transition-all duration-300`}>Dashboard</h1>
          <p className={`${themeClasses.textSecondary} mt-1 transition-all duration-300`}>Welcome back, Admin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 transition-all duration-300">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-sm font-medium transition-all duration-300">All Systems Operational</span>
          </div>
        </div>
      </motion.div>

      {/* Mock Data Warning */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
      >
        <TriangleAlert className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium">Notice: This dashboard is currently using mock data. Real-time statistics are not yet connected.</span>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <StatsCard key={stat.title} {...stat} delay={index * 0.1} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div className="lg:col-span-2 h-full">
          <ActivityChart />
        </div>
        <div className="h-full">
          <RecentActivity />
        </div>
      </div>

      {/* Server Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-5 transition-all duration-300`}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-lg ${accentClasses.bgClass}/10 transition-all duration-300`}>
            <Server className={`w-5 h-5 ${accentClasses.textClass} transition-all duration-300`} />
          </div>
          <div>
            <h3 className={`${themeClasses.text} font-semibold transition-all duration-300`}>Server Health</h3>
            <p className={`${themeClasses.textSecondary} text-sm transition-all duration-300`}>Real-time performance metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'CPU Usage', value: 24 },
            { label: 'Memory', value: 68 },
            { label: 'Disk I/O', value: 42 },
          ].map((metric) => (
            <div key={metric.label} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`${themeClasses.textSecondary} text-sm transition-all duration-300`}>{metric.label}</span>
                <span className={`${themeClasses.text} font-semibold transition-all duration-300`}>{metric.value}%</span>
              </div>
              <div className={`h-2 ${themeClasses.divider} bg-opacity-10 bg-current rounded-full overflow-hidden transition-all duration-300`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.value}%` }}
                  transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                  className={`h-full ${accentClasses.bgClass} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
