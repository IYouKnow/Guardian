import { useMemo, useRef, useState, type FormEvent } from "react";

type LoginMode = "local" | "server";

type LocalCredentials = {
  vaultFileName: string;
  vaultBytes: Uint8Array;
  password: string;
};

type ServerCredentials = {
  url: string;
  username: string;
  password: string;
};

interface LoginProps {
  onLogin: (mode: LoginMode, credentials: LocalCredentials | ServerCredentials) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<LoginMode>("local");
  const [screen, setScreen] = useState<"choose" | "local" | "server">("choose");
  const [password, setPassword] = useState("");

  const [vaultFileName, setVaultFileName] = useState("");
  const [vaultBytes, setVaultBytes] = useState<Uint8Array | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [serverUrl, setServerUrl] = useState(localStorage.getItem("guardian_server_url") || "");
  const [serverUsername, setServerUsername] = useState(
    localStorage.getItem("guardian_server_username") || "",
  );

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (screen === "choose") return false;
    if (password.length < 8) return false;
    const activeMode: LoginMode = screen === "server" ? "server" : "local";
    if (activeMode === "local") return !!vaultBytes;
    return !!serverUrl.trim() && !!serverUsername.trim();
  }, [password.length, screen, serverUrl, serverUsername, vaultBytes]);

  const handleSelectVault = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoginError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      if (bytes.length < 8) {
        throw new Error("File is too small to be a valid vault");
      }

      const header = new TextDecoder().decode(bytes.slice(0, 8));
      if (header !== "GUARDIAN") {
        throw new Error("Invalid vault file format. Expected 'GUARDIAN' header.");
      }

      setVaultFileName(file.name);
      setVaultBytes(bytes);
    } catch (err) {
      console.error("Error reading vault file:", err);
      setLoginError(err instanceof Error ? err.message : "Failed to read vault file");
      setVaultFileName("");
      setVaultBytes(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (screen === "choose") {
      return;
    }

    const activeMode: LoginMode = screen === "server" ? "server" : "local";

    if (password.length < 8) {
      setLoginError("Password must be at least 8 characters.");
      return;
    }

    if (activeMode === "local") {
      if (!vaultBytes || !vaultFileName) {
        setLoginError("Please select a vault file.");
        return;
      }
    } else {
      if (!serverUrl.trim() || !serverUsername.trim()) {
        setLoginError("Please enter server URL and username.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (activeMode === "local") {
        await onLogin("local", {
          vaultFileName,
          vaultBytes: vaultBytes!,
          password,
        });
      } else {
        localStorage.setItem("guardian_server_url", serverUrl);
        localStorage.setItem("guardian_server_username", serverUsername);
        await onLogin("server", { url: serverUrl, username: serverUsername, password });
      }
      setPassword("");
    } catch (err) {
      console.error("Login failed:", err);
      setLoginError(err instanceof Error ? err.message : "Login failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-12 pb-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".guardian,application/octet-stream"
        onChange={handleFileChange}
        className="hidden"
      />

      <header className="mb-6">
        {screen !== "choose" ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setScreen("choose");
                setLoginError("");
              }}
              className="h-10 w-10 rounded-full bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center active:opacity-90"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                {screen === "server" ? "Server sign in" : "Local vault"}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {screen === "server" ? "Connect to your Guardian Server" : "Unlock a .guardian file on this device"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">Guardian</h1>
            <p className="text-sm text-gray-400 mt-1">How do you want to unlock?</p>
          </>
        )}
      </header>

      {screen === "choose" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setMode("local");
              setScreen("local");
              setLoginError("");
            }}
            className="w-full text-left rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-4 active:opacity-90"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium">Local vault</p>
                <p className="text-sm text-gray-400 mt-0.5">Use a `.guardian` file stored on this device</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("server");
              setScreen("server");
              setLoginError("");
            }}
            className="w-full text-left rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-4 active:opacity-90"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 9h16.8" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 15h16.8" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium">Server</p>
                <p className="text-sm text-gray-400 mt-0.5">Sign in and sync encrypted items from your server</p>
              </div>
            </div>
          </button>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
              {loginError}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "local" ? (
          <section className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl px-4 py-4">
            <p className="text-xs text-gray-500 mb-2">Vault file</p>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-300 truncate">
                  {vaultFileName ? vaultFileName : "No file selected"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Choose your `.guardian` vault file</p>
              </div>
              <button
                type="button"
                onClick={handleSelectVault}
                className="shrink-0 rounded-xl bg-[#141414] border border-[#1a1a1a] px-4 py-2.5 text-sm font-medium active:opacity-90"
              >
                Choose
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl px-4 py-3">
              <label className="block text-xs text-gray-500">Server address</label>
              <input
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setLoginError("");
                }}
                placeholder="http://<your-lan-ip>:8080"
                className="mt-2 w-full bg-transparent text-white placeholder-gray-600 outline-none text-base"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl px-4 py-3">
              <label className="block text-xs text-gray-500">Username</label>
              <input
                value={serverUsername}
                onChange={(e) => {
                  setServerUsername(e.target.value);
                  setLoginError("");
                }}
                placeholder="username"
                className="mt-2 w-full bg-transparent text-white placeholder-gray-600 outline-none text-base"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </>
        )}

        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-xs text-gray-500">
              {mode === "server" ? "Account password" : "Master password"}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-yellow-400 font-medium active:opacity-90"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError("");
            }}
            placeholder={mode === "server" ? "Password" : "Master Password"}
            className="mt-2 w-full bg-transparent text-white placeholder-gray-600 outline-none text-base"
            autoFocus
          />
          <p className="text-xs text-gray-600 mt-1">Minimum 8 characters</p>
        </div>

        {loginError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
            {loginError}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="w-full rounded-2xl bg-yellow-400 text-black py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:opacity-90"
          >
            {isLoading ? (mode === "server" ? "Signing in…" : "Unlocking…") : mode === "server" ? "Sign in" : "Unlock"}
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            {mode === "server"
              ? "Tip: on Android, your server must be reachable from the device network."
              : "Your vault stays on this device."}
          </p>
        </div>
        </form>
      )}
    </div>
  );
}
