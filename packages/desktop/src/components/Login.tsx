import { useState, useEffect, FormEvent } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Theme, AccentColor } from "../types";
import { getAccentColorClasses, getThemeClasses } from "../utils/accentColors";

interface LoginProps {
  onLogin: (mode: "local" | "server", credentials: any) => Promise<void>;
  onRegister: (mode: "local" | "server") => void;
  lastVaultPath?: string | null;
  theme?: Theme;
  accentColor?: AccentColor;
}

export default function Login({
  onLogin,
  onRegister,
  lastVaultPath,
  theme = "dark",
  accentColor = "yellow"
}: LoginProps) {
  const [mode, setMode] = useState<"local" | "server">("local");
  const [masterPassword, setMasterPassword] = useState("");
  const [vaultPath, setVaultPath] = useState<string>(lastVaultPath || "");
  const [serverUrl, setServerUrl] = useState("http://localhost:8080");
  const [username, setUsername] = useState("");

  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const accentClasses = getAccentColorClasses(accentColor);

  const themeClasses = getThemeClasses(theme);

  useEffect(() => {
    if (lastVaultPath) {
      setVaultPath(lastVaultPath);
    }
  }, [lastVaultPath]);

  const handleSelectVault = async () => {
    try {
      const filePath = await open({
        title: "Select your vault file",
        filters: [{ name: "Guardian Vault", extensions: ["guardian"] }],
        multiple: false,
      });

      if (filePath && typeof filePath === "string") {
        setVaultPath(filePath);
        setLoginError("");
      }
    } catch (err) {
      console.error("Error selecting vault file:", err);
      setLoginError("Failed to select vault file");
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (mode === "local") {
      if (!vaultPath) {
        setLoginError("Please select a vault file.");
        return;
      }
    } else {
      if (!serverUrl || !username) {
        setLoginError("Please enter server URL and username.");
        return;
      }
    }

    if (masterPassword.length < 8) {
      setLoginError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "local") {
        await onLogin("local", { path: vaultPath, password: masterPassword });
      } else {
        await onLogin("server", { url: serverUrl, username, password: masterPassword });
      }
      setMasterPassword("");
    } catch (err) {
      console.error("Error loading vault:", err);
      setLoginError(err instanceof Error ? err.message : "Invalid credentials or connection failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative flex h-screen w-full font-sans ${themeClasses.bg} ${themeClasses.text} items-center justify-center p-6 overflow-hidden transition-colors duration-500`}>
      {/* Background gradients */}
      <div className={`absolute top-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full blur-[100px] opacity-15 ${accentClasses.bgClass} transition-colors duration-700`} />
      <div className={`absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full blur-[100px] opacity-10 ${accentClasses.bgClass} transition-colors duration-700`} />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${accentClasses.lightClass} border border-white/5 mb-4 shadow-xl`}>
            <svg className={`w-7 h-7 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Welcome Back</h1>
          <p className={`${themeClasses.textMuted} text-sm font-medium`}>Unlock your secure workspace</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${themeClasses.card} rounded-[1.5rem] border ${themeClasses.border} overflow-hidden shadow-2xl p-8`}
        >
          {/* Tabs */}
          <div className="flex p-1 mb-6 bg-black/20 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("local")}
              className={`flex-1 py-2 text-[0.65rem] font-bold uppercase tracking-wider rounded-lg transition-all ${mode === "local" ? `${accentClasses.bgClass} text-black shadow-lg` : `${themeClasses.textMuted} hover:${themeClasses.text}`}`}
            >
              Local File
            </button>
            <button
              type="button"
              onClick={() => setMode("server")}
              className={`flex-1 py-2 text-[0.65rem] font-bold uppercase tracking-wider rounded-lg transition-all ${mode === "server" ? `${accentClasses.bgClass} text-black shadow-lg` : `${themeClasses.textMuted} hover:${themeClasses.text}`}`}
            >
              Server
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">

            {mode === "local" ? (
              <div className="space-y-2">
                <label className={`block text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                  Vault File
                </label>
                <div className="flex gap-2">
                  <div className={`flex-1 ${themeClasses.input} border ${themeClasses.border} rounded-xl px-4 py-3.5 flex items-center overflow-hidden`}>
                    <span className={`text-sm truncate ${vaultPath ? themeClasses.text : themeClasses.textMuted}`}>
                      {vaultPath ? vaultPath.split(/[\\/]/).pop() : "No vault selected"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectVault}
                    className={`px-5 rounded-xl ${themeClasses.input} border ${themeClasses.border} hover:border-white/10 transition-colors font-bold text-[0.65rem] uppercase tracking-wider`}
                  >
                    Browse
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className={`block text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                    Server URL
                  </label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:8080"
                    className={`w-full ${themeClasses.input} border ${themeClasses.border} focus:${accentClasses.borderClass} rounded-xl px-4 py-3.5 ${themeClasses.text} placeholder-white/20 outline-none transition-all duration-200 ring-0 focus:ring-4 ${accentClasses.focusRingClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`block text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className={`w-full ${themeClasses.input} border ${themeClasses.border} focus:${accentClasses.borderClass} rounded-xl px-4 py-3.5 ${themeClasses.text} placeholder-white/20 outline-none transition-all duration-200 ring-0 focus:ring-4 ${accentClasses.focusRingClass}`}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className={`block text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                {mode === "server" ? "Account Password" : "Access Key"}
              </label>
              <div className="relative">
                <input
                  type={showMasterPassword ? "text" : "password"}
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    setLoginError("");
                  }}
                  placeholder={mode === "server" ? "Password" : "Master Password"}
                  className={`w-full ${themeClasses.input} border ${themeClasses.border} focus:${accentClasses.borderClass} rounded-xl px-4 py-3.5 pr-12 ${themeClasses.text} placeholder-white/20 outline-none transition-all duration-200 ring-0 focus:ring-4 ${accentClasses.focusRingClass}`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${themeClasses.textMuted} hover:${themeClasses.text} transition-colors p-1`}
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
              <AnimatePresence>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-xs font-medium ml-1"
                  >
                    {loginError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl ${accentClasses.bgClass} text-black font-bold text-[0.65rem] uppercase tracking-wider shadow-lg ${accentClasses.shadowClass} disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {mode === "server" ? "Authenticating..." : "Unlocking..."}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {mode === "server" ? "Login to Server" : "Unlock Vault"}
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button onClick={() => onRegister(mode)} className={`text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.textMuted} hover:${accentClasses.textClass} transition-colors`}>
              {mode === "server" ? "Create Server Account" : "Create New Vault"}
            </button>
          </div>
        </motion.div>


      </div>
    </div>
  );
}

