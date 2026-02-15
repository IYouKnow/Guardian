
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cloud, HardDrive, RefreshCw, UploadCloud, Database, Shield, Lock,
    Clock, CheckCircle2, XCircle, Calendar, ChevronRight, Plus,
    Download, Eye, EyeOff, Copy, RotateCcw, History, Zap, Server, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface BackupDestination {
    id: string;
    name: string;
    provider: 'Google Drive' | 'Dropbox' | 'AWS S3' | 'Local Storage' | 'SFTP';
    status: 'Connected' | 'Disconnected' | 'Error';
    lastBackup: string;
    isEnabled: boolean;
    size: string;
    color: string;
    gradient: string;
}

interface BackupHistoryItem {
    id: string;
    timestamp: string;
    destination: string;
    status: 'success' | 'failed' | 'in_progress';
    size: string;
    duration: string;
}

// Simple SVG logo components for each provider
function GoogleDriveLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
            <path d="M8.25 2.5L1.5 14.5h6.75L15 2.5H8.25z" fill="#4285F4" opacity="0.9" />
            <path d="M15 2.5L8.25 14.5H15l6.75-12H15z" fill="#FBBC05" opacity="0.9" />
            <path d="M1.5 14.5l3.375 6H19.125L22.5 14.5H1.5z" fill="#34A853" opacity="0.9" />
        </svg>
    );
}

function DropboxLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF" opacity="0.9" />
            <path d="M6 6L0 10l6 4-6 4 6 4 6-4-6-4 6-4L6 6z" fill="#0061FF" opacity="0.7" />
            <path d="M18 6l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF" opacity="0.7" />
        </svg>
    );
}

function AwsLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
            <path d="M6.5 11.5c0-1.5.5-2.8 1.5-3.8S10.2 6 12 6s3 .6 4 1.7 1.5 2.3 1.5 3.8" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M3 14.5c1.5 1 4.5 2.5 9 2.5s7.5-1.5 9-2.5" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M19 14.5l2 1.5-1 1" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
}

export default function Backup() {
    const { themeClasses, accentClasses } = useTheme();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [activeTab, setActiveTab] = useState<'providers' | 'history' | 'schedule'>('providers');

    const [destinations, setDestinations] = useState<BackupDestination[]>([
        {
            id: 'local',
            name: 'Local Server',
            provider: 'Local Storage',
            status: 'Connected',
            lastBackup: '2 mins ago',
            isEnabled: true,
            size: '4.2 GB',
            color: 'emerald',
            gradient: 'from-emerald-500/20 to-emerald-600/5',
        },
        {
            id: 'gdrive',
            name: 'Corporate Drive',
            provider: 'Google Drive',
            status: 'Connected',
            lastBackup: '1 hour ago',
            isEnabled: true,
            size: '3.8 GB',
            color: 'blue',
            gradient: 'from-blue-500/20 to-blue-600/5',
        },
        {
            id: 's3',
            name: 'Archive Bucket',
            provider: 'AWS S3',
            status: 'Disconnected',
            lastBackup: 'Never',
            isEnabled: false,
            size: '0 B',
            color: 'orange',
            gradient: 'from-orange-500/20 to-orange-600/5',
        },
        {
            id: 'dropbox',
            name: 'Dropbox Backup',
            provider: 'Dropbox',
            status: 'Disconnected',
            lastBackup: 'Never',
            isEnabled: false,
            size: '0 B',
            color: 'sky',
            gradient: 'from-sky-500/20 to-sky-600/5',
        },
    ]);

    const backupHistory: BackupHistoryItem[] = [
        { id: '1', timestamp: '2 mins ago', destination: 'Local Server', status: 'success', size: '4.2 GB', duration: '1m 23s' },
        { id: '2', timestamp: '1 hour ago', destination: 'Corporate Drive', status: 'success', size: '3.8 GB', duration: '4m 12s' },
        { id: '3', timestamp: '3 hours ago', destination: 'Local Server', status: 'success', size: '4.1 GB', duration: '1m 18s' },
        { id: '4', timestamp: 'Yesterday', destination: 'Corporate Drive', status: 'failed', size: '--', duration: '0m 45s' },
        { id: '5', timestamp: 'Yesterday', destination: 'Local Server', status: 'success', size: '4.0 GB', duration: '1m 30s' },
        { id: '6', timestamp: '2 days ago', destination: 'Local Server', status: 'success', size: '3.9 GB', duration: '1m 15s' },
    ];

    const handleCreateBackup = () => {
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 3000);
    };

    const toggleDestination = (id: string) => {
        setDestinations(prev => prev.map(dest =>
            dest.id === id ? { ...dest, isEnabled: !dest.isEnabled } : dest
        ));
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'Google Drive': return <GoogleDriveLogo className="w-7 h-7" />;
            case 'Dropbox': return <DropboxLogo className="w-7 h-7" />;
            case 'AWS S3': return <AwsLogo className="w-7 h-7" />;
            case 'Local Storage': return <HardDrive className="w-6 h-6 text-emerald-400" />;
            default: return <Cloud className="w-6 h-6 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Connected': case 'success': return 'text-emerald-400';
            case 'Disconnected': return 'text-zinc-500';
            case 'Error': case 'failed': return 'text-red-400';
            case 'in_progress': return 'text-amber-400';
            default: return 'text-zinc-500';
        }
    };

    const getStatusDot = (status: string) => {
        switch (status) {
            case 'Connected': case 'success': return 'bg-emerald-500';
            case 'Disconnected': return 'bg-zinc-600';
            case 'Error': case 'failed': return 'bg-red-500';
            case 'in_progress': return 'bg-amber-500 animate-pulse';
            default: return 'bg-zinc-600';
        }
    };

    const connectedCount = destinations.filter(d => d.status === 'Connected').length;
    const successRate = Math.round((backupHistory.filter(h => h.status === 'success').length / backupHistory.length) * 100);
    const totalSize = '8.0 GB';

    const tabs = [
        { id: 'providers' as const, label: 'Providers', icon: Server },
        { id: 'history' as const, label: 'History', icon: History },
        { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className={`text-2xl font-bold ${themeClasses.text} transition-all duration-300`}>Backup & Recovery</h1>
                    <p className={`${themeClasses.textSecondary} mt-1 transition-all duration-300`}>Protect your vault with automated encrypted backups</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className={`bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl`}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Restore
                    </Button>
                    <Button
                        onClick={handleCreateBackup}
                        disabled={isGenerating}
                        className={`${accentClasses.bgClass} ${accentClasses.onContrastClass} hover:opacity-90 transition-all duration-300 min-w-[160px] rounded-xl shadow-lg ${accentClasses.shadowClass}`}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Backing up...
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-4 h-4 mr-2" />
                                Backup Now
                            </>
                        )}
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
                <span className="font-medium text-sm">Notice: Backup metrics are simulated. Real-time backup status is not yet connected.</span>
            </motion.div>

            {/* Stats Row */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                {[
                    { label: 'Providers', value: `${connectedCount}/${destinations.length}`, sublabel: 'Connected', icon: Server, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Success Rate', value: `${successRate}%`, sublabel: 'Last 30 days', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Total Size', value: totalSize, sublabel: 'Across all providers', icon: Database, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { label: 'Last Backup', value: '2 min', sublabel: 'ago', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-5 transition-all duration-300`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                    <Icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                                <span className={`${themeClasses.textSecondary} text-sm font-medium`}>{stat.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-2xl font-bold ${themeClasses.text}`}>{stat.value}</span>
                                <span className={`text-xs ${themeClasses.textTertiary}`}>{stat.sublabel}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Encryption Notice */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className={`relative overflow-hidden rounded-xl border border-blue-500/15`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 via-indigo-500/5 to-transparent" />
                <div className="relative flex items-center gap-4 p-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/10">
                        <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-blue-300 font-medium text-sm">End-to-End Encrypted</h3>
                        <p className="text-blue-400/60 text-xs mt-0.5">All backups use AES-256-GCM encryption before leaving this server. Keys never touch external providers.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/10">
                        <Lock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-blue-400 text-xs font-medium">AES-256</span>
                    </div>
                </div>
            </motion.div>

            {/* Tab Navigation */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
                {activeTab === 'providers' && (
                    <motion.div
                        key="providers"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Destinations Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {destinations.map((dest, index) => (
                                <motion.div
                                    key={dest.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * index }}
                                    className={`group relative overflow-hidden ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl transition-all duration-300 hover:border-white/10`}
                                >
                                    {/* Gradient accent at top */}
                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${dest.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`w-12 h-12 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border} flex items-center justify-center transition-all duration-300`}>
                                                    {getProviderIcon(dest.provider)}
                                                </div>
                                                <div>
                                                    <h3 className={`${themeClasses.text} font-semibold`}>{dest.provider}</h3>
                                                    <p className={`${themeClasses.textTertiary} text-sm`}>{dest.name}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={dest.isEnabled}
                                                onCheckedChange={() => toggleDestination(dest.id)}
                                            />
                                        </div>

                                        {/* Metrics row */}
                                        <div className={`grid grid-cols-3 gap-3 p-3 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                            <div className="text-center">
                                                <p className={`${themeClasses.textTertiary} text-xs mb-1`}>Status</p>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(dest.status)}`} />
                                                    <span className={`text-sm font-medium ${getStatusColor(dest.status)}`}>{dest.status}</span>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className={`${themeClasses.textTertiary} text-xs mb-1`}>Size</p>
                                                <span className={`text-sm font-medium ${themeClasses.text}`}>{dest.size}</span>
                                            </div>
                                            <div className="text-center">
                                                <p className={`${themeClasses.textTertiary} text-xs mb-1`}>Last Backup</p>
                                                <span className={`text-sm font-medium ${themeClasses.text}`}>{dest.lastBackup}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={`flex-1 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} rounded-lg text-xs`}
                                            >
                                                Configure
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!dest.isEnabled}
                                                className={`flex-1 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} rounded-lg text-xs`}
                                            >
                                                Test Connection
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Add New Provider Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className={`${themeClasses.cardBg} border ${themeClasses.border} border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer ${themeClasses.hoverBg} transition-all duration-300 min-h-[200px] group`}
                            >
                                <div className={`p-4 rounded-2xl ${themeClasses.sectionBg} border ${themeClasses.border} group-hover:scale-105 transition-transform duration-300`}>
                                    <Plus className={`w-6 h-6 ${themeClasses.textTertiary} group-hover:${accentClasses.textClass} transition-colors duration-300`} />
                                </div>
                                <div>
                                    <h3 className={`${themeClasses.text} font-medium text-sm`}>Add Provider</h3>
                                    <p className={`${themeClasses.textTertiary} text-xs mt-0.5 max-w-[180px]`}>
                                        Add another storage target for redundancy
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div
                        key="history"
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
                                        <History className={`w-4 h-4 ${accentClasses.textClass}`} />
                                    </div>
                                    <div>
                                        <h3 className={`${themeClasses.text} font-semibold text-sm`}>Backup History</h3>
                                        <p className={`${themeClasses.textTertiary} text-xs`}>Recent backup operations</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hoverBg} rounded-lg text-xs`}
                                >
                                    View All
                                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>

                            {/* History Items */}
                            <div className="divide-y divide-white/5">
                                {backupHistory.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        className={`flex items-center gap-4 px-5 py-3.5 ${themeClasses.hoverBg} transition-colors duration-200`}
                                    >
                                        {/* Status Icon */}
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${item.status === 'success' ? 'bg-emerald-500/10' :
                                            item.status === 'failed' ? 'bg-red-500/10' : 'bg-amber-500/10'
                                            }`}>
                                            {item.status === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            ) : item.status === 'failed' ? (
                                                <XCircle className="w-4 h-4 text-red-400" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`${themeClasses.text} text-sm font-medium`}>{item.destination}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${item.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    item.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                                                    }`}>
                                                    {item.status === 'in_progress' ? 'Running' : item.status}
                                                </span>
                                            </div>
                                            <p className={`${themeClasses.textTertiary} text-xs mt-0.5`}>{item.timestamp}</p>
                                        </div>

                                        {/* Metrics */}
                                        <div className="hidden sm:flex items-center gap-6 text-right">
                                            <div>
                                                <p className={`${themeClasses.textTertiary} text-[10px] uppercase tracking-wider`}>Size</p>
                                                <p className={`${themeClasses.text} text-sm font-medium`}>{item.size}</p>
                                            </div>
                                            <div>
                                                <p className={`${themeClasses.textTertiary} text-[10px] uppercase tracking-wider`}>Duration</p>
                                                <p className={`${themeClasses.text} text-sm font-medium`}>{item.duration}</p>
                                            </div>
                                        </div>

                                        {/* Download */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={item.status !== 'success'}
                                            className={`${themeClasses.textTertiary} hover:${themeClasses.text} p-2`}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'schedule' && (
                    <motion.div
                        key="schedule"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                    >
                        {/* Auto-Backup Config */}
                        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10">
                                        <Zap className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className={`${themeClasses.text} font-semibold`}>Automatic Backups</h3>
                                        <p className={`${themeClasses.textTertiary} text-sm`}>Set up recurring backups</p>
                                    </div>
                                </div>
                                <Switch checked={true} />
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: 'Frequency', value: 'Every 6 hours', desc: 'Next: in 4h 37m' },
                                    { label: 'Retention', value: '30 days', desc: 'Keep last 120 backups' },
                                    { label: 'Targets', value: '2 providers', desc: 'Local + Google Drive' },
                                ].map(item => (
                                    <div key={item.label} className={`flex items-center justify-between p-3.5 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                        <div>
                                            <p className={`${themeClasses.textSecondary} text-sm`}>{item.label}</p>
                                            <p className={`${themeClasses.textTertiary} text-xs mt-0.5`}>{item.desc}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`${themeClasses.text} text-sm font-medium`}>{item.value}</span>
                                            <ChevronRight className={`w-4 h-4 ${themeClasses.textTertiary}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Backup Policy */}
                        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-violet-500/10">
                                    <Shield className="w-5 h-5 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className={`${themeClasses.text} font-semibold`}>Backup Policy</h3>
                                    <p className={`${themeClasses.textTertiary} text-sm`}>What to include</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { label: 'Vault Data', desc: 'All encrypted vault entries', enabled: true },
                                    { label: 'User Accounts', desc: 'User profiles and roles', enabled: true },
                                    { label: 'Server Config', desc: 'Settings and policies', enabled: true },
                                    { label: 'Audit Logs', desc: 'Activity and access logs', enabled: false },
                                ].map(item => (
                                    <div key={item.label} className={`flex items-center justify-between p-3.5 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border}`}>
                                        <div>
                                            <p className={`${themeClasses.text} text-sm font-medium`}>{item.label}</p>
                                            <p className={`${themeClasses.textTertiary} text-xs mt-0.5`}>{item.desc}</p>
                                        </div>
                                        <Switch checked={item.enabled} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Encryption Key Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`relative overflow-hidden ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl`}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/3 via-transparent to-transparent" />
                <div className="relative p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/10">
                                <Lock className="w-6 h-6 text-orange-400" />
                            </div>
                            <div>
                                <h3 className={`${themeClasses.text} font-semibold`}>Encryption Key</h3>
                                <p className={`${themeClasses.textTertiary} text-sm mt-0.5`}>Required to decrypt backups from external providers</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${themeClasses.sectionBg} border ${themeClasses.border} font-mono text-sm ${themeClasses.text}`}>
                                {showKey ? 'gk_bk_a3f8c2e9d1b4...' : '•••••••••••••••'}
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className={`p-1 rounded-md ${themeClasses.hoverBg} transition-all`}
                                >
                                    {showKey ? <EyeOff className={`w-3.5 h-3.5 ${themeClasses.textTertiary}`} /> : <Eye className={`w-3.5 h-3.5 ${themeClasses.textTertiary}`} />}
                                </button>
                                <button className={`p-1 rounded-md ${themeClasses.hoverBg} transition-all`}>
                                    <Copy className={`w-3.5 h-3.5 ${themeClasses.textTertiary}`} />
                                </button>
                            </div>
                            <Button variant="outline" size="sm" className={`bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} rounded-lg`}>
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                Rotate
                            </Button>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2.5 mt-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                        <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                        <p className="text-orange-400/80 text-xs leading-relaxed">
                            Store this key safely. If lost, backups stored on external providers cannot be recovered. Rotating the key will not affect existing backups, but new backups will use the new key.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
