
import { motion } from 'framer-motion';
import { Database, HardDrive, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from "@/components/ui/button";

export default function Storage() {
    const { themeClasses, accentClasses } = useTheme();

    // Mock Data for Overall Storage
    const totalStorage = "5 TB";
    const usedStorage = "3.8 TB";
    const usagePercentage = 76;
    const isWarning = usagePercentage > 75;
    const isCritical = usagePercentage > 90;

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
                    <p className={`${themeClasses.textSecondary} mt-1 transition-all duration-300`}>Monitor usage limits and user quotas</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        className={`${accentClasses.bgClass} ${accentClasses.onContrastClass} hover:opacity-90 transition-all duration-300`}
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
                <span className="font-medium">Notice: Storage metrics are simulated. Real-time disk usage not available.</span>
            </motion.div>

            {/* Main Usage Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 md:p-8 transition-all duration-300`}
            >
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* Circular Progress or Big Stat */}
                    <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
                        {/* Background Circle - Static 100% */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="80"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="16"
                                className={`${themeClasses.textSecondary} opacity-10`}
                            />
                            {/* Progress Circle - Dynamic */}
                            <motion.circle
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: usagePercentage / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                cx="96"
                                cy="96"
                                r="80"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="16"
                                strokeLinecap="round"
                                className={`${isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-blue-500'} ${isCritical && 'animate-pulse'}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className={`text-4xl font-bold ${themeClasses.text}`}>{usagePercentage}%</span>
                            <span className={`${themeClasses.textSecondary} text-sm uppercase font-semibold tracking-wider`}>Used</span>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 w-full space-y-6">
                        <div>
                            <h2 className={`text-xl font-bold ${themeClasses.text} mb-2`}>Total System Storage</h2>
                            <p className={`${themeClasses.textSecondary}`}>
                                You have used <strong className={themeClasses.text}>{usedStorage}</strong> of your <strong className={themeClasses.text}>{totalStorage}</strong> quota.
                                {isWarning && <span className="text-yellow-500 ml-2 font-medium">(Approaching Limit)</span>}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg bg-blue-500/10`}>
                                        <HardDrive className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <span className={`${themeClasses.textSecondary} text-sm font-medium`}>Available</span>
                                </div>
                                <p className={`text-2xl font-bold ${themeClasses.text}`}>1.2 TB</p>
                            </div>
                            <div className={`p-4 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg bg-purple-500/10`}>
                                        <Database className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <span className={`${themeClasses.textSecondary} text-sm font-medium`}>Total Capacity</span>
                                </div>
                                <p className={`text-2xl font-bold ${themeClasses.text}`}>{totalStorage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
