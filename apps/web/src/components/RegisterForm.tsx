import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, User, Lock, Server, ArrowRight, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';

interface RegisterFormProps {
    onRegistered: (username: string) => void;
}

type ServerMode = 'CHECKING' | 'SETUP' | 'READY' | 'ERROR';

// Mirrors the server-side policy in apps/server/validation.go so the user gets
// immediate feedback; the server re-validates regardless.
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
const MAX_PASSWORD_BYTES = 72;

// The server returns plain-text errors for most failures (http.Error) and a JSON
// {message} for body-limit errors, so pull the message out of either shape.
function describeRegisterError(err: unknown): { status?: number; message?: string } {
    const response = (err as { response?: { status?: number; data?: unknown } }).response;
    const data = response?.data;
    if (typeof data === 'string') return { status: response?.status, message: data };
    if (data && typeof data === 'object') {
        const message = (data as { message?: unknown }).message;
        return { status: response?.status, message: typeof message === 'string' ? message : undefined };
    }
    return { status: response?.status };
}

export default function RegisterForm({ onRegistered }: RegisterFormProps) {
    const [serverMode, setServerMode] = useState<ServerMode>('CHECKING');
    const [code, setCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [dbName, setDbName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        authApi.setupStatus()
            .then(res => { if (active) setServerMode(res.status); })
            .catch(() => { if (active) setServerMode('ERROR'); });
        return () => { active = false; };
    }, []);

    const isSetup = serverMode === 'SETUP';

    const validate = (): string => {
        if (serverMode === 'ERROR') return 'Cannot reach the server. Check that it is online.';
        if (!code.trim()) return isSetup ? 'Setup code is required.' : 'Invite token is required.';
        if (!username) return 'Username is required.';
        if (!USERNAME_PATTERN.test(username)) {
            return 'Username must be 3-32 characters using letters, digits, and . _ -';
        }
        if (password.length < 8) return 'Password must be at least 8 characters.';
        if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
            return `Password must be at most ${MAX_PASSWORD_BYTES} bytes.`;
        }
        if (password !== confirmPassword) return 'Passwords do not match.';
        return '';
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            // Match the sign-in flow's pacing for a consistent feel.
            await new Promise(resolve => setTimeout(resolve, 600));

            await authApi.register({
                username,
                password,
                invite_token: code.trim(),
                db_name: dbName.trim() || undefined,
            });

            onRegistered(username);
        } catch (err: unknown) {
            const { status, message } = describeRegisterError(err);

            if (status === 429) setError(message || 'Too many attempts. Try again later.');
            else if (status === 409) setError(message || 'Username taken');
            else setError(message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all duration-300 shadow-inner";
    const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/input:text-yellow-500 transition-colors";
    const labelClass = "text-xs font-semibold text-zinc-400 ml-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {isSetup && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200">
                    <strong>First run detected:</strong> enter the server setup code to claim the admin account.
                </div>
            )}

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className={labelClass}>{isSetup ? 'SETUP CODE' : 'INVITE TOKEN'}</label>
                    <div className="relative group/input">
                        <div className={iconClass}>
                            <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                            type="password"
                            value={code}
                            onChange={(e) => { setCode(e.target.value); setError(''); }}
                            className={inputClass}
                            placeholder={isSetup ? 'Server setup code' : 'Paste your invite code'}
                            autoComplete="off"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>USERNAME</label>
                    <div className="relative group/input">
                        <div className={iconClass}>
                            <User className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setError(''); }}
                            className={inputClass}
                            placeholder="Choose a username"
                            autoComplete="username"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>PASSWORD</label>
                    <div className="relative group/input">
                        <div className={iconClass}>
                            <Lock className="w-4 h-4" />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            className={inputClass}
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>CONFIRM PASSWORD</label>
                    <div className="relative group/input">
                        <div className={iconClass}>
                            <Lock className="w-4 h-4" />
                        </div>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                            className={inputClass}
                            placeholder="Repeat password"
                            autoComplete="new-password"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>DATABASE NAME (OPTIONAL)</label>
                    <div className="relative group/input">
                        <div className={iconClass}>
                            <Server className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={dbName}
                            onChange={(e) => { setDbName(e.target.value); setError(''); }}
                            className={inputClass}
                            placeholder="e.g. Personal"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || serverMode === 'CHECKING' || serverMode === 'ERROR'}
                className="w-full group relative flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold text-sm rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_-5px_theme(colors.yellow.400)] disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
                <span className="relative flex items-center gap-2">
                    {loading || serverMode === 'CHECKING' ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{loading ? 'Creating account...' : 'Checking server...'}</span>
                        </>
                    ) : (
                        <>
                            <span>Create account</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </>
                    )}
                </span>
            </button>

            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="text-red-400 text-xs font-medium text-center"
                >
                    {error}
                </motion.p>
            )}
        </form>
    );
}
