import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteInviteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isLoading: boolean;
    token?: string;
}

export default function DeleteInviteModal({
    open,
    onOpenChange,
    onConfirm,
    isLoading,
    token
}: DeleteInviteModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-[#0f0f0f] border-gray-800 text-white rounded-2xl shadow-2xl focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                <DialogHeader className="flex flex-col items-center pt-2">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <DialogTitle className="text-xl font-semibold tracking-tight">Delete Invitation</DialogTitle>
                    <DialogDescription className="text-gray-400 text-center pt-2 leading-relaxed">
                        This invitation will be permanently removed. Any pending registrations using this token will be invalidated and this action cannot be reversed.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center py-6">
                    <code className="px-4 py-2 bg-[#0a0a0a] rounded-xl text-yellow-400 font-mono text-lg border border-yellow-500/20 shadow-inner">
                        {token}
                    </code>
                </div>

                <DialogFooter className="flex sm:justify-center gap-3 mt-2 pb-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="flex-1 h-11 bg-transparent hover:bg-white/5 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 h-11 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Confirm Deletion'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
