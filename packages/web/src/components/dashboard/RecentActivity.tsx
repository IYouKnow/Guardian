import { motion } from 'framer-motion';
import { Clock, UserPlus, Key, Shield, AlertTriangle, LogIn, type LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

type ActivityType = 'login' | 'create' | 'access' | 'security' | 'warning';

interface Activity {
  id: number;
  type: ActivityType;
  user: string;
  action: string;
  time: string;
  icon: LucideIcon;
}

const activities: Activity[] = [
  { id: 1, type: 'login', user: 'john.doe@email.com', action: 'Logged in successfully', time: '2 min ago', icon: LogIn },
  { id: 2, type: 'create', user: 'admin@vault.com', action: 'Created new user account', time: '15 min ago', icon: UserPlus },
  { id: 3, type: 'access', user: 'sarah.smith@email.com', action: 'Accessed vault item', time: '32 min ago', icon: Key },
  { id: 4, type: 'security', user: 'system', action: 'Security scan completed', time: '1 hour ago', icon: Shield },
  { id: 5, type: 'warning', user: 'mike.wilson@email.com', action: 'Failed login attempt', time: '2 hours ago', icon: AlertTriangle },
];

const typeColors: Record<ActivityType, string> = {
  login: 'text-green-400 bg-green-400/10',
  create: 'text-blue-400 bg-blue-400/10',
  access: 'text-yellow-400 bg-yellow-400/10',
  security: 'text-purple-400 bg-purple-400/10',
  warning: 'text-red-400 bg-red-400/10',
};

export default function RecentActivity() {
  const { themeClasses, accentClasses } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accentClasses.bgClass}/10 transition-all duration-300`}>
            <Clock className={`w-5 h-5 ${accentClasses.textClass} transition-all duration-300`} />
          </div>
          <div>
            <h3 className={`${themeClasses.text} font-semibold transition-all duration-300`}>Recent Activity</h3>
            <p className={`${themeClasses.textSecondary} text-sm transition-all duration-300`}>Latest system events</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            className={`flex items-start gap-4 p-3 rounded-xl ${themeClasses.hoverBg} transition-all duration-300`}
          >
            <div className={`p-2 rounded-lg ${typeColors[activity.type]} transition-all duration-300`}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${themeClasses.text} text-sm font-medium truncate transition-all duration-300`}>{activity.action}</p>
              <p className={`${themeClasses.textSecondary} text-xs truncate transition-all duration-300`}>{activity.user}</p>
            </div>
            <span className={`${themeClasses.textTertiary} text-xs whitespace-nowrap transition-all duration-300`}>{activity.time}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
