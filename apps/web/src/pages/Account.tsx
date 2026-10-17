import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, MonitorSmartphone, LogOut } from 'lucide-react';
import { authApi } from '../api/auth';

export default function Account() {
    // Seed from the cached user so the card renders instantly; the effect below
    // refreshes it from the server.
    const stored = authApi.getStoredUser();
    const [username, setUsername] = useState<string>(stored?.username || '');
    const [isAdmin, setIsAdmin] = useState<boolean>(!!stored?.is_admin);
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        authApi.me()
            .then(me => {
                if (!active) return;
                setUsername(me.username);
                setIsAdmin(me.is_admin);
            })
            .catch(() => { /* token handled by the 401 interceptor */ });
        return () => { active = false; };
    }, []);

    const handleSignOut = () => {
        authApi.logout();
        navigate('/login');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl"
        >
            <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden ring-1 ring-white/5">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-bold text-zinc-950">
                                {(username || 'U').charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{username || 'User'}</p>
                            <p className="text-zinc-500 text-xs">{isAdmin ? 'Administrator' : 'User'}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <MonitorSmartphone className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-200 space-y-1">
                            <p className="font-semibold">Your vault lives in the Guardian apps</p>
                            <p>
                                Account creation is done here, but the encrypted vault is only created,
                                unlocked and synced in the desktop and mobile apps. Sign in there with the
                                same username and password to set up your vault.
                            </p>
                        </div>
                    </div>

                    {!isAdmin && (
                        <div className="flex items-start gap-3 p-4 bg-zinc-800/40 border border-white/5 rounded-xl">
                            <ShieldCheck className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-zinc-400">
                                This dashboard is administered by your server operator. Ask an
                                administrator if you need an invite, a reset, or your account disabled.
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-lg transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
