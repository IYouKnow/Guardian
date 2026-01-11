import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Artificial delay for smoother UX feeling
            await new Promise(resolve => setTimeout(resolve, 600));

            const response = await authApi.login({ username, password });

            if (!response.is_admin) {
                setError('Access denied: Admin privileges required');
                authApi.logout();
                return;
            }

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 overflow-hidden font-sans text-zinc-100 selection:bg-yellow-500/30">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-yellow-600/5 rounded-full blur-[100px]" />
            </div>

            {/* Grid Pattern Overlay */}
            <div
                className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"
                style={{ mixBlendMode: 'overlay' }}
            />

            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-6"
            >
                <div className="group relative bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/5">
                    {/* Top Shine Effect */}
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="p-8 md:p-10 space-y-8">
                        {/* Header */}
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 font-display">
                                Welcome back
                            </h1>
                            <p className="text-zinc-500 text-sm font-medium">
                                Enter your credentials to access the admin panel
                            </p>
                        </div>
                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 ml-1">USERNAME</label>
                                    <div className="relative group/input">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/input:text-yellow-500 transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all duration-300 shadow-inner"
                                            placeholder="Enter your username"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-400 ml-1">PASSWORD</label>
                                    <div className="relative group/input">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/input:text-yellow-500 transition-colors">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all duration-300 shadow-inner"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full group relative flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold text-sm rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_-5px_theme(colors.yellow.400)] disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                            >
                                <span className="relative flex items-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Authenticate</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        x: [0, -2, 2, -2, 2, 0]
                                    }}
                                    transition={{
                                        duration: 0.3,
                                        x: { delay: 0.1, duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
                                    }}
                                    className="text-red-400 text-xs font-medium text-center mt-4"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/recover')}
                                    className="text-xs text-zinc-500 hover:text-yellow-500 font-medium transition-colors"
                                >
                                    Recover Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
