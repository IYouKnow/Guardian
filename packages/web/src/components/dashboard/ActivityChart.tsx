import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts';
import { Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAccentColorHex } from '../../utils/theme';

interface DataPoint {
  name: string;
  logins: number;
  items: number;
}

const data: DataPoint[] = [
  { name: 'Mon', logins: 45, items: 23 },
  { name: 'Tue', logins: 52, items: 31 },
  { name: 'Wed', logins: 38, items: 18 },
  { name: 'Thu', logins: 65, items: 42 },
  { name: 'Fri', logins: 78, items: 55 },
  { name: 'Sat', logins: 32, items: 15 },
  { name: 'Sun', logins: 28, items: 12 },
];

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const { themeClasses } = useTheme();
  if (active && payload && payload.length) {
    return (
      <div className={`${themeClasses.sectionBg} border ${themeClasses.border} backdrop-blur-xl rounded-xl p-3 shadow-xl`}>
        <p className={`${themeClasses.textTertiary} text-xs mb-2`}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ActivityChart() {
  const { themeClasses, accentClasses, accentColor, theme } = useTheme();
  const hexColor = getAccentColorHex(accentColor, theme);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 h-full transition-all duration-300 flex flex-col`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accentClasses.bgClass}/10 transition-all duration-300`}>
            <Activity className={`w-5 h-5 ${accentClasses.textClass} transition-all duration-300`} />
          </div>
          <div>
            <h3 className={`${themeClasses.text} font-semibold transition-all duration-300`}>Weekly Activity</h3>
            <p className={`${themeClasses.textSecondary} text-sm transition-all duration-300`}>Logins & item access</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${accentClasses.bgClass} transition-all duration-300`} />
            <span className={`${themeClasses.textSecondary} transition-all duration-300`}>Logins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${accentClasses.bgClass}/40 transition-all duration-300`} />
            <span className={`${themeClasses.textSecondary} transition-all duration-300`}>Items</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hexColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={hexColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="itemsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hexColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={hexColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme === 'light' ? '#94a3b8' : '#64748b', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme === 'light' ? '#94a3b8' : '#64748b', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="logins"
              stroke={hexColor}
              strokeWidth={2}
              fill="url(#loginGradient)"
              name="Logins"
            />
            <Area
              type="monotone"
              dataKey="items"
              stroke={`${hexColor}66`}
              strokeWidth={2}
              fill="url(#itemsGradient)"
              name="Items"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
