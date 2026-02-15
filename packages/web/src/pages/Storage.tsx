
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database, HardDrive, AlertTriangle, Users, FileText, Image, Film,
    Archive, ChevronRight, TrendingUp, Server, Settings, Shield,
    ArrowUpRight, ArrowDownRight, Gauge, Layers, PieChart, BarChart3
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from "@/components/ui/button";

interface UserQuota {
    id: string;
    name: string;
    initials: string;
    role: 'Admin' | 'User';
    usedBytes: number;
    quotaBytes: number;
    vaultItems: number;
    color: string;
}

interface FileTypeBreakdown {
    type: string;
    icon: any;
    size: string;
    percentage: number;
    count: number;
    color: string;
    bgColor: string;
}

export default function Storage() {
    const { themeClasses, accentClasses } = useTheme();
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'breakdown'>('overview');

    // Mock Data
    const totalStorageGB = 5120; // 5 TB in GB
    const usedStorageGB = 3891; // ~3.8 TB
    const usagePercentage = Math.round((usedStorageGB / totalStorageGB) * 100);
    const isWarning = usagePercentage > 75;
    const isCritical = usagePercentage > 90;

    const formatStorage = (gb: number) => {
        if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
        return `${gb} GB`;
    };

    const userQuotas: UserQuota[] = [
        { id: '1', name: 'Pedro Almeida', initials: 'PA', role: 'Admin', usedBytes: 892000000000, quotaBytes: 1099511627776, vaultItems: 342, color: 'bg-blue-500' },
        { id: '2', name: 'Maria Santos', initials: 'MS', role: 'User', usedBytes: 654000000000, quotaBytes: 549755813888, vaultItems: 218, color: 'bg-purple-500' },
        { id: '3', name: 'João Silva', initials: 'JS', role: 'User', usedBytes: 421000000000, quotaBytes: 549755813888, vaultItems: 156, color: 'bg-emerald-500' },
        { id: '4', name: 'Ana Costa', initials: 'AC', role: 'User', usedBytes: 287000000000, quotaBytes: 549755813888, vaultItems: 94, color: 'bg-amber-500' },
        { id: '5', name: 'Carlos Nunes', initials: 'CN', role: 'User', usedBytes: 156000000000, quotaBytes: 549755813888, vaultItems: 67, color: 'bg-pink-500' },
    ];

    const fileBreakdown: FileTypeBreakdown[] = [
        { type: 'Vault Entries', icon: Shield, size: '2.1 TB', percentage: 55, count: 48392, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
        { type: 'Attachments', icon: FileText, size: '892 GB', percentage: 23, count: 12847, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
        { type: 'Secure Notes', icon: Archive, size: '412 GB', percentage: 11, count: 3241, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
        { type: 'Media Files', icon: Image, size: '283 GB', percentage: 7, count: 1893, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
        { type: 'System & Logs', icon: Server, size: '152 GB', percentage: 4, count: 0, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' },
    ];

    const formatBytes = (bytes: number) => {
        if (bytes >= 1099511627776) return `${(bytes / 1099511627776).toFixed(1)} TB`;
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
        return `${(bytes / 1048576).toFixed(0)} MB`;
    };

    const getUserPercentage = (user: UserQuota) => Math.round((user.usedBytes / user.quotaBytes) * 100);

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: PieChart },
        { id: 'users' as const, label: 'User Quotas', icon: Users },
        { id: 'breakdown' as const, label: 'Breakdown', icon: BarChart3 },
    ];

    // Ring progress component
    const RingProgress = ({ percentage, size, strokeWidth, color, children }: {
        percentage: number;
        size: number;
        strokeWidth: number;
        color: string;
        children?: React.ReactNode;
    }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const center = size / 2;

        return (
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className={`${themeClasses.textSecondary} opacity-[0.06]`}
                    />
                    <motion.circle
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: circumference - (percentage / 100) * circumference }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        className={color}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {children}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className={`text-2xl font-bold ${themeClasses.text} transition-all duration-300`}>Storage Overview</h1>
                    <p className={`${themeClasses.textSecondary} mt-1 transition-all duration-300`}>Monitor disk usage, quotas, and storage allocation</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className={`bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl`}
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Policies
                    </Button>
                    <Button
                        className={`${accentClasses.bgClass} ${accentClasses.onContrastClass} hover:opacity-90 transition-all duration-300 rounded-xl shadow-lg ${accentClasses.shadowClass}`}
                    >
                        <Database className="w-4 h-4 mr-2" />
                        Manage Quotas
                    </Button>
                </div>
            </motion.div>

            {/* Mock Data Warning */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
            >
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">Notice: Storage metrics are simulated. Real-time disk usage is not yet connected.</span>
            </motion.div>

            {/* Hero Usage Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
                className={`relative overflow-hidden ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl`}
            >
                {/* Subtle gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${isCritical ? 'from-red-500/5' : isWarning ? 'from-amber-500/5' : 'from-blue-500/5'} via-transparent to-transparent`} />

                <div className="relative p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        {/* Ring Chart */}
                        <RingProgress
                            percentage={usagePercentage}
                            size={200}
                            strokeWidth={14}
                            color={isCritical ? 'text-red-500' : isWarning ? 'text-amber-400' : 'text-blue-500'}
                        >
                            <motion.span
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6, duration: 0.4 }}
                                className={`text-4xl font-bold ${themeClasses.text}`}
                            >
                                {usagePercentage}%
                            </motion.span>
                            <span className={`${themeClasses.textTertiary} text-xs uppercase font-semibold tracking-widest mt-1`}>Used</span>
                        </RingProgress>

                        {/* Details */}
                        <div className="flex-1 w-full space-y-5">
                            <div>
                                <h2 className={`text-xl font-bold ${themeClasses.text}`}>System Storage</h2>
                                <p className={`${themeClasses.textSecondary} text-sm mt-1`}>
                                    <span className={themeClasses.text}>{formatStorage(usedStorageGB)}</span> of <span className={themeClasses.text}>{formatStorage(totalStorageGB)}</span> used
                                    {isWarning && !isCritical && <span className="text-amber-400 ml-2 text-xs font-medium">(Approaching limit)</span>}
                                    {isCritical && <span className="text-red-400 ml-2 text-xs font-medium">(Critical!)</span>}
                                </p>
                            </div>

                            {/* Usage bar */}
                            <div>
                                <div className={`h-3 rounded-full overflow-hidden ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${usagePercentage}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                                        className={`h-full rounded-full ${isCritical ? 'bg-gradient-to-r from-red-500 to-red-600' : isWarning ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className={`${themeClasses.textTertiary} text-xs`}>0 TB</span>
                                    <span className={`${themeClasses.textTertiary} text-xs`}>{formatStorage(totalStorageGB)}</span>
                                </div>
                            </div>

                            {/* Quick stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Available', value: formatStorage(totalStorageGB - usedStorageGB), icon: HardDrive, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                    { label: 'Total Capacity', value: formatStorage(totalStorageGB), icon: Database, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                    { label: 'Total Users', value: userQuotas.length.toString(), icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                                    { label: 'Vault Items', value: '48,392', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                ].map(stat => {
                                    const Icon = stat.icon;
                                    return (
                                        <div key={stat.label} className={`p-3 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={`p-1 rounded-md ${stat.bg}`}>
                                                    <Icon className={`w-3 h-3 ${stat.color}`} />
                                                </div>
                                                <span className={`${themeClasses.textTertiary} text-[11px]`}>{stat.label}</span>
                                            </div>
                                            <p className={`text-lg font-bold ${themeClasses.text}`}>{stat.value}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tab Navigation */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`inline-flex p-1 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}
            >
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                    ? `${accentClasses.bgClass} ${accentClasses.onContrastClass} shadow-md ${accentClasses.shadowClass}`
                                    : `${themeClasses.textSecondary} hover:${themeClasses.text}`
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                    >
                        {/* Storage Trends */}
                        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10">
                                        <TrendingUp className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className={`${themeClasses.text} font-semibold`}>Growth Trend</h3>
                                        <p className={`${themeClasses.textTertiary} text-sm`}>Last 6 months</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    <span className="text-xs font-semibold">+12%</span>
                                </div>
                            </div>

                            {/* Simple bar chart visualization */}
                            <div className="flex items-end justify-between gap-2 h-32 mb-4">
                                {[
                                    { month: 'Sep', value: 58 },
                                    { month: 'Oct', value: 62 },
                                    { month: 'Nov', value: 65 },
                                    { month: 'Dec', value: 69 },
                                    { month: 'Jan', value: 73 },
                                    { month: 'Feb', value: 76 },
                                ].map((bar, i) => (
                                    <div key={bar.month} className="flex-1 flex flex-col items-center gap-2">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${bar.value}%` }}
                                            transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
                                            className={`w-full rounded-lg ${i === 5
                                                    ? `bg-gradient-to-t ${isWarning ? 'from-amber-500 to-amber-400' : 'from-blue-600 to-blue-400'}`
                                                    : `${themeClasses.sectionBg} border ${themeClasses.border}`
                                                }`}
                                        />
                                        <span className={`text-[10px] ${i === 5 ? themeClasses.text : themeClasses.textTertiary} font-medium`}>{bar.month}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={`flex items-center justify-between p-3 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                <span className={`${themeClasses.textSecondary} text-sm`}>Avg. monthly growth</span>
                                <span className={`${themeClasses.text} text-sm font-semibold`}>~180 GB/mo</span>
                            </div>
                        </div>

                        {/* Disk Health & Performance */}
                        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <Gauge className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className={`${themeClasses.text} font-semibold`}>Disk Health</h3>
                                    <p className={`${themeClasses.textTertiary} text-sm`}>Performance metrics</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: 'Read Speed', value: '542 MB/s', max: 600, current: 542, color: 'from-blue-500 to-blue-400' },
                                    { label: 'Write Speed', value: '498 MB/s', max: 600, current: 498, color: 'from-purple-500 to-purple-400' },
                                    { label: 'IOPS', value: '84,200', max: 100000, current: 84200, color: 'from-emerald-500 to-emerald-400' },
                                    { label: 'Latency', value: '0.3 ms', max: 10, current: 0.3, color: 'from-amber-500 to-amber-400', inverted: true },
                                ].map(metric => (
                                    <div key={metric.label}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`${themeClasses.textSecondary} text-sm`}>{metric.label}</span>
                                            <span className={`${themeClasses.text} text-sm font-semibold`}>{metric.value}</span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(metric as any).inverted ? 100 - (metric.current / metric.max) * 100 : (metric.current / metric.max) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                                                className={`h-full rounded-full bg-gradient-to-r ${metric.color}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={`flex items-center gap-3 mt-5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10`}>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-400 text-sm font-medium">All systems healthy</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'users' && (
                    <motion.div
                        key="users"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl overflow-hidden`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between px-5 py-4 border-b ${themeClasses.divider}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${accentClasses.bgClass}/10`}>
                                        <Users className={`w-4 h-4 ${accentClasses.textClass}`} />
                                    </div>
                                    <div>
                                        <h3 className={`${themeClasses.text} font-semibold text-sm`}>User Storage Quotas</h3>
                                        <p className={`${themeClasses.textTertiary} text-xs`}>{userQuotas.length} users tracked</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} rounded-lg text-xs`}
                                >
                                    Manage All
                                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>

                            {/* User List */}
                            <div className="divide-y divide-white/5">
                                {userQuotas.map((user, index) => {
                                    const pct = getUserPercentage(user);
                                    const isUserWarning = pct > 80;
                                    return (
                                        <motion.div
                                            key={user.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className={`flex items-center gap-4 px-5 py-4 ${themeClasses.hoverBg} transition-colors duration-200 group cursor-pointer`}
                                        >
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-xl ${user.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                                                {user.initials}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`${themeClasses.text} text-sm font-medium truncate`}>{user.name}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${user.role === 'Admin' ? 'bg-blue-500/10 text-blue-400' : `${themeClasses.sectionBg} ${themeClasses.textTertiary}`
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                {/* Usage Bar */}
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${themeClasses.sectionBg}`}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pct}%` }}
                                                            transition={{ duration: 0.8, delay: 0.1 * index, ease: "easeOut" }}
                                                            className={`h-full rounded-full ${isUserWarning ? 'bg-gradient-to-r from-amber-500 to-red-500' : `${accentClasses.bgClass}`
                                                                }`}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-medium ${isUserWarning ? 'text-amber-400' : themeClasses.textSecondary} min-w-[32px] text-right`}>
                                                        {pct}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="hidden sm:flex items-center gap-6 text-right">
                                                <div>
                                                    <p className={`${themeClasses.textTertiary} text-[10px] uppercase tracking-wider`}>Used</p>
                                                    <p className={`${themeClasses.text} text-sm font-medium`}>{formatBytes(user.usedBytes)}</p>
                                                </div>
                                                <div>
                                                    <p className={`${themeClasses.textTertiary} text-[10px] uppercase tracking-wider`}>Quota</p>
                                                    <p className={`${themeClasses.text} text-sm font-medium`}>{formatBytes(user.quotaBytes)}</p>
                                                </div>
                                                <div>
                                                    <p className={`${themeClasses.textTertiary} text-[10px] uppercase tracking-wider`}>Items</p>
                                                    <p className={`${themeClasses.text} text-sm font-medium`}>{user.vaultItems}</p>
                                                </div>
                                            </div>

                                            <ChevronRight className={`w-4 h-4 ${themeClasses.textTertiary} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`} />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'breakdown' && (
                    <motion.div
                        key="breakdown"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
                    >
                        {/* Stacked horizontal bar visual */}
                        <div className={`lg:col-span-2 ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Layers className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className={`${themeClasses.text} font-semibold`}>Storage Allocation</h3>
                                    <p className={`${themeClasses.textTertiary} text-sm`}>Breakdown by data type</p>
                                </div>
                            </div>

                            {/* Stacked bar */}
                            <div className={`h-5 rounded-full overflow-hidden flex ${themeClasses.sectionBg} border ${themeClasses.border} mb-6`}>
                                {fileBreakdown.map((item, i) => (
                                    <motion.div
                                        key={item.type}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.percentage}%` }}
                                        transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
                                        className={`h-full ${i === 0 ? 'bg-blue-500' :
                                                i === 1 ? 'bg-emerald-500' :
                                                    i === 2 ? 'bg-purple-500' :
                                                        i === 3 ? 'bg-amber-500' :
                                                            'bg-zinc-600'
                                            } ${i === 0 ? 'rounded-l-full' : ''} ${i === fileBreakdown.length - 1 ? 'rounded-r-full' : ''}`}
                                        style={{ opacity: 0.8 }}
                                    />
                                ))}
                            </div>

                            {/* Items list */}
                            <div className="space-y-3">
                                {fileBreakdown.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <motion.div
                                            key={item.type}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className={`flex items-center gap-4 p-3.5 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.hoverBg} transition-all duration-200`}
                                        >
                                            <div className={`p-2.5 rounded-lg ${item.bgColor}`}>
                                                <Icon className={`w-4 h-4 ${item.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className={`${themeClasses.text} text-sm font-medium`}>{item.type}</span>
                                                    <span className={`${themeClasses.text} text-sm font-semibold`}>{item.size}</span>
                                                </div>
                                                <div className={`h-1.5 rounded-full overflow-hidden ${themeClasses.sectionBg}`}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.percentage}%` }}
                                                        transition={{ duration: 0.8, delay: 0.15 * index, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' :
                                                                index === 1 ? 'bg-emerald-500' :
                                                                    index === 2 ? 'bg-purple-500' :
                                                                        index === 3 ? 'bg-amber-500' :
                                                                            'bg-zinc-600'
                                                            }`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <span className={`${themeClasses.textTertiary} text-xs`}>{item.percentage}%</span>
                                                {item.count > 0 && (
                                                    <p className={`${themeClasses.textTertiary} text-[10px]`}>{item.count.toLocaleString()} items</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Side Info */}
                        <div className="space-y-4">
                            {/* Storage Tiers */}
                            <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6`}>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2 rounded-lg bg-blue-500/10">
                                        <Server className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h3 className={`${themeClasses.text} font-semibold`}>Storage Tiers</h3>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { tier: 'SSD (Primary)', size: '2 TB', used: '1.8 TB', status: 'Active', color: 'emerald' },
                                        { tier: 'HDD (Archive)', size: '3 TB', used: '2.0 TB', status: 'Active', color: 'blue' },
                                    ].map(tier => (
                                        <div key={tier.tier} className={`p-3.5 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`${themeClasses.text} text-sm font-medium`}>{tier.tier}</span>
                                                <div className={`flex items-center gap-1.5`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-${tier.color}-500`} />
                                                    <span className={`text-${tier.color}-400 text-xs`}>{tier.status}</span>
                                                </div>
                                            </div>
                                            <p className={`${themeClasses.textTertiary} text-xs`}>{tier.used} / {tier.size}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6`}>
                                <h3 className={`${themeClasses.text} font-semibold mb-4`}>Quick Actions</h3>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Run Cleanup', desc: 'Remove expired items', icon: Archive },
                                        { label: 'Analyze Usage', desc: 'Detailed report', icon: BarChart3 },
                                        { label: 'Export Data', desc: 'Download report', icon: ArrowDownRight },
                                    ].map(action => {
                                        const Icon = action.icon;
                                        return (
                                            <button
                                                key={action.label}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border} ${themeClasses.hoverBg} transition-all duration-200 group text-left`}
                                            >
                                                <Icon className={`w-4 h-4 ${themeClasses.textTertiary} group-hover:${accentClasses.textClass} transition-colors`} />
                                                <div className="flex-1">
                                                    <p className={`${themeClasses.text} text-sm font-medium`}>{action.label}</p>
                                                    <p className={`${themeClasses.textTertiary} text-xs`}>{action.desc}</p>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 ${themeClasses.textTertiary} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
