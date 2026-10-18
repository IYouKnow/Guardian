import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, User, Lock, Server, ArrowRight, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';

interface RegisterFormProps {
    onRegistered: (username: string) => void;
}

type ServerMode = 'CHECKING' | 'SETUP' | 'READY' | 'ERROR';
type VerifyState = 'idle' | 'checking' | 'valid' | 'invalid';

// Mirrors the server-side policy in apps/server/validation.go so the user gets
// immediate feedback; the server re-validates regardless.
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
const MAX_PASSWORD_BYTES = 72;
const VERIFY_DEBOUNCE_MS = 400;

// The server returns plain-text errors for most failures (http.Error) and a JSON
// {message} for body-limit errors, so pull the message out of either shape.
function describeApiError(err: unknown): { status?: number; message?: string } {
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
    const [step, setStep] = useState<1 | 2>(1);
    const [code, setCode] = useState('');
    const [verifyState, setVerifyState] = useState<VerifyState>('idle');
    const [verifyError, setVerifyError] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [dbName, setDbName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Guards against out-of-order responses and remembers the last code we
    // already verified so returning to step 1 doesn't re-check it.
    const verifyRequestRef = useRef(0);
    const verifiedCodeRef = useRef<string | null>(null);

    useEffect(() => {
        let active = true;
        authApi.setupStatus()
            .then(res => { if (active) setServerMode(res.status); })
            .catch(() => { if (active) setServerMode('ERROR'); });
        return () => { active = false; };
    }, []);

    const isSetup = serverMode === 'SETUP';
    const codeLabel = isSetup ? 'SETUP CODE' : 'INVITE TOKEN';
    const codePlaceholder = isSetup ? 'Server setup code' : 'Paste your invite code';
    const serverUnavailable = serverMode === 'CHECKING' || serverMode === 'ERROR';

    // Auto-verify the code (debounced) as the user types; a successful check is
    // what unlocks the Next button.
    useEffect(() => {
        const trimmed = code.trim();

        if (!trimmed) {
            setVerifyState('idle');
            setVerifyError('');
            return;
        }
        if (trimmed === verifiedCodeRef.current) {
            setVerifyState('valid');
            setVerifyError('');
            return;
        }
        if (serverUnavailable) {
            setVerifyState('idle');
            return;
        }

        const requestId = ++verifyRequestRef.current;
        setVerifyState('checking');
        setVerifyError('');

        const timer = setTimeout(async () => {
            try {
                await authApi.validateInvite(trimmed);
                if (verifyRequestRef.current !== requestId) return;
                verifiedCodeRef.current = trimmed;
                setVerifyState('valid');
            } catch (err: unknown) {
                if (verifyRequestRef.current !== requestId) return;
                const { status, message } = describeApiError(err);
                setVerifyState('invalid');
                setVerifyError(
                    status === 429
                        ? (message || 'Too many attempts. Try again later.')
                        : (message || (isSetup ? 'Invalid setup code' : 'Invalid invite token'))
                );
            }
        }, VERIFY_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [code, serverUnavailable, isSetup]);

    const goToDetails = () => {
        if (verifyState === 'valid') {
            setError('');
            setStep(2);
        }
    };

    const validateDetails = (): string => {
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

        const validationError = validateDetails();
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
            const { status, message } = describeApiError(err);

            if (status === 429) setError(message || 'Too many attempts. Try again later.');
            else if (status === 409) setError(message || 'Username taken');
            // The code passed verification but was consumed/expired by the time we
            // submitted — send the user back to re-enter it.
            else if (status === 403) {
                verifiedCodeRef.current = null;
                setError(message || (isSetup ? 'Invalid setup code' : 'Invite no longer valid'));
                setVerifyState('idle');
                setStep(1);
            } else setError(message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all duration-300 shadow-inner";
    const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/input:text-yellow-500 transition-colors";
    const labelClass = "text-xs font-semibold text-zinc-400 ml-1";
    const primaryButtonClass = "w-full group relative flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold text-sm rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_-5px_theme(colors.yellow.400)] disabled:opacity-70 disabled:cursor-not-allowed mt-6";

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-yellow-500">
                    Step {step} of 2
                </span>
                <div className="flex gap-1">
                    {[1, 2].map(s => (
                        <div
                            key={s}
                            className={`h-1 rounded-full transition-all duration-300 ${step === s ? 'w-4 bg-yellow-500' : 'w-1 bg-zinc-700'}`}
                        />
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                    <motion.form
                        key="verify"
                        onSubmit={(e) => { e.preventDefault(); goToDetails(); }}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                    >
                        {isSetup && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200">
                                <strong>First run detected:</strong> enter the server setup code to claim the admin account.
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className={labelClass}>{codeLabel}</label>
                            <div className="relative group/input">
                                <div className={iconClass}>
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <input
                                    type="password"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className={inputClass}
                                    placeholder={codePlaceholder}
                                    autoComplete="off"
                                    autoFocus
                                    required
                                />
                            </div>

                            {serverMode === 'ERROR' ? (
                                <p className="text-red-400 text-xs font-medium ml-1">
                                    Cannot reach the server. Check that it is online.
                                </p>
                            ) : verifyState === 'valid' ? (
                                <p className="flex items-center gap-1 text-[0.7rem] font-medium text-emerald-400 ml-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    {isSetup ? 'Setup code' : 'Invite code'} verified
                                </p>
                            ) : verifyState === 'invalid' ? (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-400 text-xs font-medium ml-1"
                                >
                                    {verifyError}
                                </motion.p>
                            ) : verifyState === 'checking' ? (
                                <p className="flex items-center gap-1 text-[0.7rem] font-medium text-zinc-500 ml-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Verifying code...
                                </p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={goToDetails}
                            disabled={verifyState !== 'valid'}
                            className={primaryButtonClass}
                        >
                            <span className="relative flex items-center gap-2">
                                {verifyState === 'checking' ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Verifying code...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Next</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </motion.form>
                ) : (
                    <motion.form
                        key="details"
                        onSubmit={handleSubmit}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                    >
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-200">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            <span>{isSetup ? 'Setup code' : 'Invite code'} verified. Set up your account.</span>
                        </div>

                        <div className="space-y-4">
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
                                        autoFocus
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
                            disabled={loading}
                            className={primaryButtonClass}
                        >
                            <span className="relative flex items-center gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Creating account...</span>
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

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(''); }}
                                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-yellow-500 font-medium transition-colors"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                Use a different code
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}
