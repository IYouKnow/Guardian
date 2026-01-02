import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

const data = [
  { name: 'Mon', logins: 45, items: 23 },
  { name: 'Tue', logins: 52, items: 31 },
  { name: 'Wed', logins: 38, items: 18 },
  { name: 'Thu', logins: 65, items: 42 },
  { name: 'Fri', logins: 78, items: 55 },
  { name: 'Sat', logins: 32, items: 15 },
  { name: 'Sun', logins: 28, items: 12 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-3 shadow-xl">
        <p className="text-gray-400 text-xs mb-2">{label}</p>
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-[#141414] border border-gray-800/50 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Activity className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Weekly Activity</h3>
            <p className="text-gray-500 text-sm">Logins & item access</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-400">Logins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
            <span className="text-gray-400">Items</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5c518" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f5c518" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="itemsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5c518" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f5c518" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="logins"
              stroke="#f5c518"
              strokeWidth={2}
              fill="url(#loginGradient)"
              name="Logins"
            />
            <Area
              type="monotone"
              dataKey="items"
              stroke="#f5c51866"
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