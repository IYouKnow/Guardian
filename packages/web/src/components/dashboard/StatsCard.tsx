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
      className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-5 hover:border-${accentClasses.base}/30 transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${accentClasses.bgClass}/10 group-hover:${accentClasses.bgClass}/20 transition-all`}>
          <Icon className={`w-5 h-5 ${accentClasses.textClass}`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {change}
          </div>
        )}
      </div>
      <h3 className={`${themeClasses.textSecondary} text-xs font-medium mb-1 transition-all duration-300`}>{title}</h3>
      <p className={`text-2xl font-bold ${themeClasses.text} transition-all duration-300`}>{value}</p>
    </motion.div>
  );
}
