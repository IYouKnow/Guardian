import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, CalendarIcon, CheckSquare, Square, ChevronRight, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { type AdminUser } from '@/api/admin';
import { toast } from 'sonner';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ExportUsersModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    users: AdminUser[];
}

export default function ExportUsersModal({ open, onOpenChange, users }: ExportUsersModalProps) {
    const { themeClasses, accentClasses } = useTheme();
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });
    const [includePersonalData, setIncludePersonalData] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const handleQuickSelect = (days: number) => {
        const to = new Date();
        const from = subDays(to, days);
        setDateRange({ from: startOfDay(from), to: endOfDay(to) });
    };

    const handleExport = () => {
        let filtered = users.filter(user => selectedStatuses.includes(user.status || 'ACTIVE'));

        if (dateRange.from) {
            const start = dateRange.from.getTime();
            filtered = filtered.filter(user => new Date(user.created_at).getTime() >= start);
        }

        if (dateRange.to) {
            const end = dateRange.to.getTime();
            filtered = filtered.filter(user => new Date(user.created_at).getTime() <= end);
        }

        if (filtered.length === 0) {
            toast.error('No users match the selected criteria');
            return;
        }

        const headers = ['ID', 'Username', 'Role', 'Status', 'Vault Items', 'Created At', 'Last Login'];
        if (includePersonalData) {
            headers.push('Friendly Name');
        }

        const csvData = filtered.map(user => {
            const row = [
                user.id,
                user.username,
                user.role,
                user.status || 'ACTIVE',
                user.vault_items,
                new Date(user.created_at).toLocaleString(),
                user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
            ];
            if (includePersonalData) {
                row.push(`"${(user.friendly_name || '').replace(/"/g, '""')}"`);
            }
            return row;
        });

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `guardian-users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`${filtered.length} users exported successfully`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${themeClasses.bg} border ${themeClasses.border} ${themeClasses.text} backdrop-blur-3xl max-w-lg focus:outline-none rounded-3xl shadow-2xl`}>
                <DialogHeader>
                    <DialogTitle className={`text-xl font-semibold flex items-center gap-2 ${themeClasses.text}`}>
                        <div className={`p-2.5 rounded-xl ${accentClasses.bgClass}/10`}>
                            <Download className={`w-5 h-5 ${accentClasses.textClass}`} />
                        </div>
                        Export Users
                    </DialogTitle>
                    <DialogDescription className={`${themeClasses.textSecondary}`}>
                        Configure and filter your user database export.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 mt-6">
                    {/* Timeframe Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className={`${themeClasses.textSecondary} text-[10px] font-black uppercase tracking-[0.2em]`}>
                                Timeframe
                            </Label>
                            <div className="flex gap-2">
                                {[
                                    { label: 'Today', days: 0 },
                                    { label: '7D', days: 7 },
                                    { label: '30D', days: 30 }
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => handleQuickSelect(preset.days)}
                                        className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${themeClasses.inputBg} ${themeClasses.border} ${themeClasses.textTertiary} hover:${themeClasses.textSecondary} hover:${accentClasses.borderClass}`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className={`flex-1 flex items-center gap-3 p-3.5 ${themeClasses.inputBg} border ${themeClasses.border} hover:${themeClasses.hoverBg} transition-all rounded-2xl group text-left`}>
                                        <CalendarIcon className={`w-4 h-4 ${accentClasses.textClass}`} />
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] ${themeClasses.textTertiary} font-bold uppercase`}>From</span>
                                            <span className={`text-sm font-medium ${dateRange.from ? themeClasses.text : themeClasses.textTertiary}`}>
                                                {dateRange.from ? format(dateRange.from, 'PPP') : 'Select start'}
                                            </span>
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className={`${themeClasses.bg} border ${themeClasses.border} p-0 w-auto shadow-2xl`} align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateRange.from}
                                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <div className={`${themeClasses.textTertiary}`}>
                                <ChevronRight className="w-4 h-4" />
                            </div>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className={`flex-1 flex items-center gap-3 p-3.5 ${themeClasses.inputBg} border ${themeClasses.border} hover:${themeClasses.hoverBg} transition-all rounded-2xl group text-left`}>
                                        <CalendarIcon className={`w-4 h-4 ${accentClasses.textClass}`} />
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] ${themeClasses.textTertiary} font-bold uppercase`}>To</span>
                                            <span className={`text-sm font-medium ${dateRange.to ? themeClasses.text : themeClasses.textTertiary}`}>
                                                {dateRange.to ? format(dateRange.to, 'PPP') : 'Select end'}
                                            </span>
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className={`${themeClasses.bg} border ${themeClasses.border} p-0 w-auto shadow-2xl`} align="end">
                                    <Calendar
                                        mode="single"
                                        selected={dateRange.to}
                                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-3">
                        <Label className={`${themeClasses.textSecondary} text-xs font-bold uppercase tracking-wider`}>Status</Label>
                        <div className="flex flex-wrap gap-2">
                            {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
                                        ${selectedStatuses.includes(status)
                                            ? `${accentClasses.bgClass}/20 ${accentClasses.textClass} ${accentClasses.borderClass}`
                                            : `${themeClasses.inputBg} ${themeClasses.textTertiary} ${themeClasses.border} hover:${themeClasses.hoverBg}`
                                        }
                                    `}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Checkbox Options */}
                    <div className="pt-2 space-y-4">
                        <button
                            onClick={() => setIncludePersonalData(!includePersonalData)}
                            className="flex items-center gap-3 group cursor-pointer w-full text-left p-4 rounded-2xl border border-transparent hover:border-zinc-800 transition-all bg-zinc-900/10"
                        >
                            <div className={`
                                w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200
                                ${includePersonalData ? `${accentClasses.bgClass} ${accentClasses.borderClass}` : `${themeClasses.inputBg} ${themeClasses.border} group-hover:${themeClasses.hoverBg}`}
                            `}>
                                {includePersonalData ? <CheckSquare className="w-4 h-4 text-black" /> : <Square className="w-4 h-4 opacity-0" />}
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className={`text-sm font-bold ${themeClasses.text}`}>Include Friendly Names</span>
                                <span className={`text-[10px] ${themeClasses.textTertiary}`}>Personal identifiers will be included in the exported file</span>
                            </div>
                            <User className={`w-4 h-4 ${includePersonalData ? accentClasses.textClass : themeClasses.textTertiary}`} />
                        </button>
                    </div>
                </div>

                <DialogFooter className="mt-8 gap-3 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className={`flex-1 h-11 bg-transparent ${themeClasses.border} ${themeClasses.textSecondary} hover:${themeClasses.hoverBg} hover:${themeClasses.text} rounded-xl`}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        className={`flex-1 h-11 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} text-black font-semibold rounded-xl shadow-lg ${accentClasses.shadowClass}`}
                    >
                        Export CSV
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
