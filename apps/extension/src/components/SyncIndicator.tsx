import { CheckCircle2, Loader2 } from "lucide-react";
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
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, lastEventTimestamp]);

  return (
    <AnimatePresence>
      {(isSyncing || showSuccess) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-popover px-3.5 py-1.5 text-popover-foreground shadow-lg"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs font-medium">Syncing…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Up to date</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
