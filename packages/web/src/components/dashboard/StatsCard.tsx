import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: Icon;
  delay?: number;
}

// Fixed type for Icon
type Icon = LucideIcon;

export default function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  delay = 0
}: StatsCardProps) {
  const { themeClasses, accentClasses } = useTheme();
  const isPositive = changeType === 'positive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 hover:border-${accentClasses.base}/30 transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${accentClasses.bgClass}/10 to-${accentClasses.bgClass.split('-')[1]}-600/5 group-hover:${accentClasses.bgClass}/20 transition-all`}>
          <Icon className={`w-6 h-6 ${accentClasses.textClass}`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <h3 className={`${themeClasses.textSecondary} text-sm font-medium mb-1 transition-all duration-300`}>{title}</h3>
      <p className={`text-3xl font-bold ${themeClasses.text} transition-all duration-300`}>{value}</p>
    </motion.div>
  );
}
