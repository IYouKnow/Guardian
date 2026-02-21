import { Loader2, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SyncIndicatorProps {
    isSyncing: boolean;
    lastEventTimestamp?: number;
}

export function SyncIndicator({ isSyncing, lastEventTimestamp }: SyncIndicatorProps) {
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (!isSyncing && lastEventTimestamp) {
            // When syncing stops, briefly show standard success icon
            setShowSuccess(true);
            const timer = setTimeout(() => {
                setShowSuccess(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isSyncing, lastEventTimestamp]);

    return (
        <AnimatePresence>
            {(isSyncing || showSuccess) && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 shadow-lg backdrop-blur-md border border-border"
                >
                    {isSyncing ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Syncing...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-muted-foreground">Up to date</span>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
