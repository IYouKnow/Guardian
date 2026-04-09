import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SyncIndicatorProps {
    isSyncing: boolean;
    position?: "bottom-right" | "top-right" | "top-center" | "bottom-center";
    variant?: "subtle" | "full";
}

export function SyncIndicator({ 
    isSyncing, 
    position = "bottom-right",
    variant = "subtle" 
}: SyncIndicatorProps) {
    const [showStatus, setShowStatus] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const prevIsSyncing = useRef(isSyncing);

    useEffect(() => {
        if (isSyncing) {
            setShowStatus(true);
            setShowSuccess(false);
        } else if (prevIsSyncing.current && !isSyncing) {
            setShowStatus(false);
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 1500);
            return () => clearTimeout(timer);
        }
        prevIsSyncing.current = isSyncing;
    }, [isSyncing]);

    const positionClasses = {
        "bottom-right": "bottom-4 right-4",
        "top-right": "top-4 right-4",
        "top-center": "top-4 left-1/2 -translate-x-1/2",
        "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
    };

    const containerClasses = variant === "full" 
        ? "flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 shadow-lg backdrop-blur-md border border-border text-foreground"
        : "flex items-center gap-2 rounded-full bg-background/80 dark:bg-black/70 px-3 py-1.5 shadow-lg backdrop-blur-sm border border-border dark:border-white/10";

    return (
        <div className={`fixed ${positionClasses[position]} z-[9999]`}>
            <AnimatePresence mode="wait">
                {isSyncing && (
                    <motion.div
                        key="syncing"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className={containerClasses}
                        onMouseEnter={() => setShowStatus(true)}
                        onMouseLeave={() => setShowStatus(false)}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                        {variant === "full" && (
                            <span className="text-sm font-medium">Syncing...</span>
                        )}
                        {variant === "subtle" && (
                            <AnimatePresence>
                                {showStatus && (
                                    <motion.span
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: "auto", opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="text-xs font-medium whitespace-nowrap overflow-hidden text-foreground dark:text-white"
                                    >
                                        Syncing...
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        )}
                    </motion.div>
                )}
                {!isSyncing && showSuccess && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className={containerClasses}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500"></span>
                        </span>
                        {variant === "full" && (
                            <span className="text-sm font-medium">Up to date</span>
                        )}
                        {variant === "subtle" && (
                            <span className="text-xs font-medium whitespace-nowrap text-foreground dark:text-white">Synced</span>
                        )}
                    </motion.div>
                )}
                {!isSyncing && !showSuccess && variant === "subtle" && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        className="h-3 w-3 rounded-full bg-muted-foreground cursor-pointer hover:opacity-80"
                        title="Connected"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}