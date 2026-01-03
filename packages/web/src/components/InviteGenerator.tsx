import { useState } from 'react';
import { adminApi } from '../api/admin';

export default function InviteGenerator() {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateToken = async () => {
        setLoading(true);
        try {
            const response = await adminApi.generateInvite({
                max_uses: 1,
                expires_in: '7d',
                note: 'Generated from quick generator'
            });
            setToken(response.token);
            setCopied(false);
        } catch (error) {
            console.error('Failed to generate invite:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-50 mb-2">Invite Token Generator</h3>
            <p className="text-zinc-400 text-sm mb-6">Generate invite tokens for new users to register.</p>

            <button
                onClick={generateToken}
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-zinc-950 font-bold text-sm uppercase tracking-wider rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
                {loading ? 'Generating...' : 'Generate New Invite Token'}
            </button>

            {token && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Invite Token
                    </label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-yellow-500 font-mono text-sm break-all">
                            {token}
                        </code>
                        <button
                            onClick={copyToClipboard}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all text-sm"
                        >
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
