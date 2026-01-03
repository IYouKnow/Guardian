import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: LucideIcon;
  delay?: number;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  delay = 0
}: StatsCardProps) {
  const isPositive = changeType === 'positive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-[#141414] border border-gray-800/50 rounded-2xl p-6 hover:border-yellow-500/20 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 group-hover:from-yellow-500/20 group-hover:to-yellow-600/10 transition-all">
          <Icon className="w-6 h-6 text-yellow-500" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
    </motion.div>
  );
}
