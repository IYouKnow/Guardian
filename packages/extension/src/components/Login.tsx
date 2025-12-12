import { useState, useRef, type FormEvent } from "react";
import { openVault } from "../../../shared/crypto";

interface LoginProps {
  onLogin: (file: File, masterPassword: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [masterPassword, setMasterPassword] = useState("");
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectVault = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVaultFile(file);
      setLoginError("");
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!vaultFile) {
      setLoginError("Please select your vault file");
      return;
    }

    if (masterPassword.length < 8) {
      setLoginError("Master password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Read file and try to decrypt vault
      const arrayBuffer = await vaultFile.arrayBuffer();
      const vaultBytes = new Uint8Array(arrayBuffer);
      await openVault(masterPassword, vaultBytes);

      // Success - vault decrypted correctly
      onLogin(vaultFile, masterPassword);
      setMasterPassword("");
    } catch (err) {
      console.error("Error loading vault:", err);
      setLoginError("Invalid master password or corrupted vault file");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full h-full bg-black text-white items-center justify-center p-4">
      <div className="w-full max-w-full">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border-2 border-yellow-400/30 mb-3 shadow-lg shadow-yellow-400/10">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Guardian</h1>
          <p className="text-sm text-gray-400">Enter your master password to unlock</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Vault File</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vaultFile?.name || ""}
                readOnly
                placeholder="Select your vault file"
                className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleSelectVault}
                className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-sm font-medium transition-all border border-[#1a1a1a] whitespace-nowrap"
              >
                Browse
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".guardian"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Master Password</label>
            <div className="relative">
              <input
                type={showMasterPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="Enter your master password"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-yellow-400 transition-colors"
              >
                {showMasterPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {loginError && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {loginError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-400/50 disabled:cursor-not-allowed text-black font-semibold py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Unlocking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Unlock Vault
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Select your .guardian vault file and enter your master password
          </p>
        </div>
      </div>
    </div>
  );
}

