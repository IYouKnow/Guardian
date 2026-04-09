import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SyncIndicatorProps {
    isSyncing: boolean;
    lastEventTimestamp?: number;
}

export function SyncIndicator({ isSyncing, lastEventTimestamp }: SyncIndicatorProps) {
    const [showStatus, setShowStatus] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const prevIsSyncing = useRef(isSyncing);

    useEffect(() => {
        if (isSyncing) {
            setShowStatus(true);
            setShowSuccess(false);
        } else if (prevIsSyncing.current && !isSyncing && lastEventTimestamp) {
            setShowStatus(false);
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 1500);
            return () => clearTimeout(timer);
        }
        prevIsSyncing.current = isSyncing;
    }, [isSyncing, lastEventTimestamp]);

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            <AnimatePresence mode="wait">
                {isSyncing && (
                    <motion.div
                        key="syncing"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="flex items-center gap-2 rounded-full bg-black/70 text-white px-3 py-1.5 shadow-lg backdrop-blur-sm border border-white/10 cursor-default"
                        onMouseEnter={() => setShowStatus(true)}
                        onMouseLeave={() => setShowStatus(false)}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                        <AnimatePresence>
                            {showStatus && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "auto", opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="text-xs font-medium whitespace-nowrap overflow-hidden"
                                >
                                    Syncing...
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
                {!isSyncing && showSuccess && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="flex items-center gap-2 rounded-full bg-black/70 text-white px-3 py-1.5 shadow-lg backdrop-blur-sm border border-white/10"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium whitespace-nowrap">Synced</span>
                    </motion.div>
                )}
                {!isSyncing && !showSuccess && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        className="h-3 w-3 rounded-full bg-gray-500 cursor-pointer hover:opacity-80"
                        title="Connected"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
