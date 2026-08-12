import { motion } from 'framer-motion';
import { Users, Key, HardDrive, Zap, Server } from 'lucide-react';
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <StatsCard key={stat.title} {...stat} delay={index * 0.05} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div className="lg:col-span-2 h-full">
          <ActivityChart />
        </div>
        <div className="h-full">
          <RecentActivity />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className={`
          ${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-5
          transition-all duration-200
        `}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${accentClasses.lightClass} transition-all duration-200`}>
            <Server className={`w-4 h-4 ${accentClasses.textClass} transition-all duration-200`} />
          </div>
          <div>
            <h3 className={`${themeClasses.text} font-medium text-sm transition-all duration-200`}>Server Health</h3>
            <p className={`${themeClasses.textSecondary} text-xs transition-all duration-200`}>Real-time performance metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'CPU Usage', value: 24 },
            { label: 'Memory', value: 68 },
            { label: 'Disk I/O', value: 42 },
          ].map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`${themeClasses.textSecondary} text-xs transition-all duration-200`}>{metric.label}</span>
                <span className={`${themeClasses.text} font-medium text-sm transition-all duration-200`}>{metric.value}%</span>
              </div>
              <div className={`h-1.5 ${themeClasses.divider} bg-opacity-10 bg-current rounded-full overflow-hidden transition-all duration-200`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.value}%` }}
                  transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
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