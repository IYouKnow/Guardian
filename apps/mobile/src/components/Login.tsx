import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { Theme, AccentColor } from "@guardian/core/themes";
import { getAccentColorClasses, getAccentColorHex } from "@guardian/core/themes";
import { getThemeClasses } from "../utils/theme";
import guardianLogo from "../assets/guardian-logo.png";
import { getSavedServers, removeServer, displayNameFor, cleanUrl, type SavedServer } from "../api/savedServers";
import { getStoredServerUrl } from "../api/serverAuth";

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

function formatLastLogin(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return "recently";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}

function FaceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" x2="9.01" y1="9" y2="9" />
      <line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
  );
}

interface LoginProps {
  onLogin: (mode: LoginMode, credentials: LocalCredentials | ServerCredentials) => Promise<void>;
  theme: Theme;
  accentColor: AccentColor;
  autofillPrompt?: string;
  autofillMode?: "save" | "fill";
  initialScreen?: "choose" | "local" | "server";
  biometric?: {
    available: boolean;
    label: string;
    localEnabled: boolean;
    serverEnabled: boolean;
    localReady: boolean;
    serverReady: boolean;
    serverHint?: string;
  };
  onBiometricUnlockLocal?: () => Promise<void>;
  onBiometricUnlockServer?: () => Promise<void>;
}

export default function Login({
  onLogin,
  theme,
  accentColor,
  autofillPrompt,
  autofillMode,
  initialScreen,
  biometric,
  onBiometricUnlockLocal,
  onBiometricUnlockServer,
}: LoginProps) {
  const [mode, setMode] = useState<LoginMode>("local");
  const [screen, setScreen] = useState<"choose" | "local" | "server">(() => initialScreen || "choose");
  const [password, setPassword] = useState("");

  const [vaultFileName, setVaultFileName] = useState("");
  const [vaultBytes, setVaultBytes] = useState<Uint8Array | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [serverUrl, setServerUrl] = useState(localStorage.getItem("guardian_server_url") || "");
  const [serverUsername, setServerUsername] = useState(
    localStorage.getItem("guardian_server_username") || "",
  );
  const [serverView, setServerView] = useState<"list" | "biometric" | "form">("list");
  const [savedServers, setSavedServers] = useState<SavedServer[]>(() => getSavedServers());
  const [localView, setLocalView] = useState<"biometric" | "form">("form");
  const [biometricServer, setBiometricServer] = useState<SavedServer | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [preferManualLogin, setPreferManualLogin] = useState(false);
  const autoBiometricSigRef = useRef<string>("");
  const [introSettled, setIntroSettled] = useState(false);
  const [cardsShown, setCardsShown] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showName, setShowName] = useState(false);

  const themeClasses = getThemeClasses(theme);
  const accentClasses = getAccentColorClasses(accentColor, theme);
  const accentHex = getAccentColorHex(accentColor, theme);

  const canBiometricUnlockLocal = !!onBiometricUnlockLocal && !!biometric?.available && !!biometric?.localEnabled && !!biometric?.localReady;
  const canBiometricUnlockServer = !!onBiometricUnlockServer && !!biometric?.available && !!biometric?.serverEnabled && !!biometric?.serverReady;
  const serverBiometricAvailableFor = (url: string) =>
    !!onBiometricUnlockServer &&
    !!biometric?.available &&
    !!biometric?.serverEnabled &&
    !!biometric?.serverReady &&
    cleanUrl(url) === cleanUrl(getStoredServerUrl());
  const preferredBiometricKind: LoginMode | null = useMemo(() => {
    if (screen === "server" && canBiometricUnlockServer) return "server";
    if (screen === "local" && canBiometricUnlockLocal) return "local";
    if (initialScreen === "server" && canBiometricUnlockServer) return "server";
    if (initialScreen === "local" && canBiometricUnlockLocal) return "local";
    if (canBiometricUnlockServer) return "server";
    if (canBiometricUnlockLocal) return "local";
    return null;
  }, [canBiometricUnlockLocal, canBiometricUnlockServer, initialScreen, screen]);

  useEffect(() => {
    if (screen === "server") {
      setMode("server");
      return;
    }
    if (screen === "local") {
      setMode("local");
    }
  }, [screen]);

  useEffect(() => {
    if (!initialScreen) return;
    if (initialScreen === "choose") return;
    setScreen(initialScreen);
    setPreferManualLogin(false);
  }, [initialScreen]);

  const introPlayedRef = useRef(false);

  useEffect(() => {
    if (screen === "choose") return;
    const backButtonListener = CapacitorApp.addListener("backButton", () => {
      if (screen === "server" && serverView !== "list") {
        setServerView("list");
        setLoginError("");
      } else {
        setScreen("choose");
        setLoginError("");
      }
    });
    return () => {
      backButtonListener.then((listener) => listener.remove());
    };
  }, [screen, serverView]);

  useEffect(() => {
    if (screen !== "choose") return;
    if (introPlayedRef.current) {
      setShowLogo(true);
      setShowName(true);
      setIntroSettled(true);
      setCardsShown(true);
      return;
    }
    introPlayedRef.current = true;
    setShowLogo(false);
    setShowName(false);
    setIntroSettled(false);
    setCardsShown(false);
    const a = window.setTimeout(() => setShowLogo(true), 100);
    const b = window.setTimeout(() => setShowName(true), 900);
    const c = window.setTimeout(() => setIntroSettled(true), 1700);
    const d = window.setTimeout(() => setCardsShown(true), 2400);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.clearTimeout(c);
      window.clearTimeout(d);
    };
  }, [screen]);

  useEffect(() => {
    if (!autofillMode) return;
    if (preferManualLogin) return;
    if (!preferredBiometricKind) return;
    if (isBiometricLoading || isLoading) return;

    const sig = `${autofillMode}|${autofillPrompt || ""}|${preferredBiometricKind}|${initialScreen || ""}`;
    if (autoBiometricSigRef.current === sig) return;
    autoBiometricSigRef.current = sig;
    handleBiometricUnlock(preferredBiometricKind).catch(() => undefined);
  }, [autofillMode, autofillPrompt, initialScreen, isBiometricLoading, isLoading, preferredBiometricKind]);

  const autoBiometricPromptRef = useRef<string>("");

  useEffect(() => {
    let kind: "local" | "server" | null = null;
    if (screen === "local" && localView === "biometric" && canBiometricUnlockLocal) {
      kind = "local";
    } else if (
      screen === "server" &&
      serverView === "biometric" &&
      biometricServer &&
      serverBiometricAvailableFor(biometricServer.url)
    ) {
      kind = "server";
    }
    if (!kind) return;
    if (isBiometricLoading) return;
    const sig = `${kind}|${screen === "server" ? biometricServer?.url ?? "" : ""}`;
    if (autoBiometricPromptRef.current === sig) return;
    autoBiometricPromptRef.current = sig;
    handleBiometricUnlock(kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, localView, serverView, biometricServer, canBiometricUnlockLocal, isBiometricLoading]);

  const friendlyError = (raw: string) => {
    const msg = (raw || "").trim();
    if (!msg) return "Login failed.";

    const lower = msg.toLowerCase();
    const looksLikeNetwork =
      lower.includes("failed to fetch") ||
      lower.includes("network request failed") ||
      lower.includes("network") ||
      lower.includes("timeout") ||
      lower.includes("connection");

    if (!looksLikeNetwork) return msg;

    const urlLower = serverUrl.trim().toLowerCase();
    if (urlLower.includes("localhost") || urlLower.includes("127.0.0.1")) {
      return "Can't reach localhost from Android. Use your LAN IP (e.g. 192.168.x.x) or (on Android emulator) 10.0.2.2 instead.";
    }

    return "Failed to reach server. Check the address/port and that your device is on the same network.";
  };

  const handlePickServer = (s: SavedServer) => {
    setBiometricServer(s);
    setServerUrl(s.url);
    setServerUsername(s.username);
    setPassword("");
    setLoginError("");
    setServerView(serverBiometricAvailableFor(s.url) ? "biometric" : "form");
  };

  const handleRemoveServer = (url: string) => {
    removeServer(url);
    setSavedServers(getSavedServers());
    setLoginError("");
  };

  const handleAddNewServer = () => {
    setBiometricServer(null);
    setServerUrl("");
    setServerUsername("");
    setPassword("");
    setLoginError("");
    setServerView("form");
  };

  const handleUseBiometricsInstead = () => {
    setLoginError("");
    if (screen === "server") {
      setBiometricServer({ url: serverUrl, username: serverUsername, lastLoginAt: "" });
      setServerView("biometric");
    } else {
      setLocalView("biometric");
    }
  };

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
      setLoginError(friendlyError(err instanceof Error ? err.message : "Login failed."));
      setIsLoading(false);
    }
  };

  const handleBiometricUnlock = async (kind: "local" | "server") => {
    if (kind === "local" && !canBiometricUnlockLocal) return;
    if (kind === "server" && !canBiometricUnlockServer) return;
    setLoginError("");
    setIsBiometricLoading(true);
    try {
      if (kind === "local") await onBiometricUnlockLocal?.();
      else await onBiometricUnlockServer?.();
    } catch (err) {
      console.error("Biometric unlock failed:", err);
      setLoginError(friendlyError(err instanceof Error ? err.message : "Biometric unlock failed."));
      setIsBiometricLoading(false);
    }
  };

  const renderBiometricView = (kind: "local" | "server") => {
    const isServer = kind === "server";
    const label = biometric?.label ?? "biometrics";
    const iconKind =
      label.toLowerCase().includes("face") || label.toLowerCase().includes("iris") ? "face" : "fingerprint";
    const subtitle = isServer
      ? `Signing in to ${biometricServer ? displayNameFor(biometricServer.url) : ""}${
          biometricServer?.username ? ` as ${biometricServer.username}` : ""
        }`
      : "Open your local vault";

    return (
      <div className="space-y-4">
        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl px-4 py-8 flex flex-col items-center text-center`}>
          <div className={`h-20 w-20 rounded-2xl ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center ${isBiometricLoading ? "animate-pulse" : ""}`}>
            {iconKind === "face" ? (
              <FaceIcon className={`h-10 w-10 ${accentClasses.textClass}`} />
            ) : (
              <FingerprintIcon className={`h-10 w-10 ${accentClasses.textClass}`} />
            )}
          </div>
          <p className={`mt-4 text-lg font-semibold ${themeClasses.text}`}>
            {isBiometricLoading
              ? isServer
                ? "Signing in..."
                : "Unlocking..."
              : `Unlock with ${label}`}
          </p>
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{subtitle}</p>
          {loginError && (
            <p className="mt-3 text-xs text-red-400 max-w-full break-words">{loginError}</p>
          )}
        </div>

        <button
          type="button"
          disabled={isBiometricLoading}
          onClick={() => handleBiometricUnlock(kind)}
          className={`w-full rounded-2xl ${accentClasses.bgClass} ${accentClasses.onContrastClass} py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:opacity-90`}
        >
          {iconKind === "face" ? (
            <FaceIcon className="h-5 w-5" />
          ) : (
            <FingerprintIcon className="h-5 w-5" />
          )}
          {isBiometricLoading
            ? isServer
              ? "Signing in..."
              : "Unlocking..."
            : `Unlock with ${label}`}
        </button>

        <button
          type="button"
          onClick={() => {
            if (isServer) setServerView("form");
            else setLocalView("form");
          }}
          className={`w-full text-center text-sm font-semibold ${themeClasses.textSecondary} underline underline-offset-4 py-2 active:opacity-90`}
        >
          Use password instead
        </button>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} px-5 pt-12 pb-8`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".guardian,application/octet-stream"
        onChange={handleFileChange}
        className="hidden"
      />

      <header className="mb-6">
        {autofillMode && preferredBiometricKind && !preferManualLogin && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setPreferManualLogin(true);
                setLoginError("");
                const target = initialScreen && initialScreen !== "choose" ? initialScreen : preferredBiometricKind;
                setScreen(target);
                if (target === "server") setServerView("form");
              }}
              className={`rounded-xl border ${themeClasses.border} ${themeClasses.cardBg} px-3 py-2 text-xs font-semibold ${themeClasses.textSecondary} active:opacity-90`}
            >
              Use form
            </button>
          </div>
        )}
        {screen !== "choose" ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (screen === "server" && serverView !== "list") {
                  setServerView("list");
                  setLoginError("");
                } else {
                  setScreen("choose");
                  setLoginError("");
                }
              }}
              className={`h-10 w-10 rounded-full ${themeClasses.cardBg} border ${themeClasses.border} flex items-center justify-center active:opacity-90`}
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
                {screen === "server"
                  ? serverView === "list"
                    ? "Pick a server or add a new one"
                    : "Connect to your Guardian Server"
                  : "Unlock a .guardian file on this device"}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {!!autofillPrompt && (
        <div className={`mb-5 px-4 py-3 rounded-2xl ${themeClasses.cardBg} border ${themeClasses.border}`}>
          <p className="text-sm font-semibold">
            {autofillMode === "fill" ? "Unlock to autofill login" : "Unlock to save login"}
          </p>
          <p className={`text-xs mt-0.5 ${themeClasses.textSecondary}`}>
            {autofillMode === "fill"
              ? `Unlock to fill credentials into ${autofillPrompt}.`
              : `Unlock to save login from ${autofillPrompt}.`}
          </p>
        </div>
      )}

      {screen === "choose" ? (
        <div className="flex flex-col">
          <div
            className={`flex flex-col items-center transition-[padding] duration-700 ease-out ${introSettled ? "pt-4" : "pt-[calc(50vh-9rem)]"}`}
          >
            <div
              aria-label="Guardian"
              role="img"
              className={`rounded-2xl shadow-lg transition-all duration-700 ease-out ${introSettled ? "h-16 w-16" : "h-40 w-40"} ${showLogo ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              style={{
                backgroundColor: accentHex,
                WebkitMaskImage: `url(${guardianLogo})`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskImage: `url(${guardianLogo})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
              }}
            />
            <h1
              className={`mt-4 text-3xl font-semibold tracking-tight transition-all duration-500 ease-out ${accentClasses.textClass} ${showName ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
            >
              Guardian
            </h1>
          </div>

          <div
            className={`mt-10 space-y-3 transition-all duration-500 ease-out ${cardsShown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
          <button
            type="button"
            onClick={() => {
              setMode("local");
              setScreen("local");
              setLocalView(canBiometricUnlockLocal ? "biometric" : "form");
              setLoginError("");
            }}
            className={`w-full text-left rounded-2xl border ${themeClasses.border} ${themeClasses.cardBg} px-4 py-4 active:opacity-90`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 shrink-0 rounded-xl ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center`}>
                <svg className={`h-6 w-6 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-base font-semibold ${themeClasses.text}`}>Local vault</p>
                <p className={`text-sm ${themeClasses.textSecondary} mt-0.5`}>Open a `.guardian` file stored on this device</p>
              </div>
              <svg className={`h-5 w-5 shrink-0 ${themeClasses.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("server");
              setScreen("server");
              setServerView("list");
              setSavedServers(getSavedServers());
              setLoginError("");
            }}
            className={`w-full text-left rounded-2xl border ${themeClasses.border} ${themeClasses.cardBg} px-4 py-4 active:opacity-90`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 shrink-0 rounded-xl ${accentClasses.lightClass} border ${accentClasses.borderClass} flex items-center justify-center`}>
                <svg className={`h-6 w-6 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 9h16.8" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 15h16.8" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-base font-semibold ${themeClasses.text}`}>Server</p>
                <p className={`text-sm ${themeClasses.textSecondary} mt-0.5`}>Sign in and sync encrypted items from your server</p>
              </div>
              <svg className={`h-5 w-5 shrink-0 ${themeClasses.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
              {loginError}
            </div>
          )}
          </div>
        </div>
      ) : screen === "server" && serverView === "list" ? (
        <div className="space-y-3">
          {savedServers.length === 0 && (
            <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl px-4 py-5 text-center`}>
              <p className={`text-sm ${themeClasses.textSecondary}`}>No saved servers yet.</p>
              <p className={`text-xs ${themeClasses.textMuted} mt-1`}>Add your server to sign in and sync.</p>
            </div>
          )}

          {savedServers.map((s) => (
            <div key={s.url} className={`flex items-center gap-3 rounded-2xl border ${themeClasses.border} ${themeClasses.cardBg} px-4 py-4`}>
              <button
                type="button"
                onClick={() => handlePickServer(s)}
                className="min-w-0 flex-1 text-left active:opacity-90"
              >
                <p className={`text-base font-semibold ${themeClasses.text}`}>{displayNameFor(s.url)}</p>
                <p className={`text-sm ${themeClasses.textSecondary} mt-0.5 truncate`}>
                  {s.username || "No username saved"}
                </p>
                {s.lastLoginAt && (
                  <p className={`text-xs ${themeClasses.textMuted} mt-0.5`}>Last used {formatLastLogin(s.lastLoginAt)}</p>
                )}
              </button>
              <button
                type="button"
                aria-label="Remove server"
                onClick={() => handleRemoveServer(s.url)}
                className={`h-9 w-9 shrink-0 rounded-full ${themeClasses.cardBg} border ${themeClasses.border} flex items-center justify-center active:opacity-90`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddNewServer}
            className={`w-full rounded-2xl ${themeClasses.cardBg} border ${themeClasses.border} py-4 text-base font-semibold ${accentClasses.textClass} active:opacity-90`}
          >
            Add new server
          </button>
        </div>
      ) : screen === "server" && serverView === "biometric" ? (
        renderBiometricView("server")
      ) : screen === "local" && localView === "biometric" ? (
        renderBiometricView("local")
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "local" ? (
          <section className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl px-4 py-4`}>
            <p className={`text-xs ${themeClasses.textMuted} mb-2`}>Vault file</p>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm ${themeClasses.textSecondary} truncate`}>
                  {vaultFileName ? vaultFileName : "No file selected"}
                </p>
                <p className={`text-xs ${themeClasses.textMuted} mt-0.5`}>Choose your `.guardian` vault file</p>
              </div>
              <button
                type="button"
                onClick={handleSelectVault}
                className={`shrink-0 rounded-xl ${themeClasses.cardBg} border ${themeClasses.border} px-4 py-2.5 text-sm font-medium active:opacity-90`}
              >
                Choose
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl px-4 py-3`}>
              <label className={`block text-xs ${themeClasses.textMuted}`}>Server address</label>
              <input
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setLoginError("");
                }}
                placeholder="http://<your-lan-ip>:8080"
                className={`mt-2 w-full bg-transparent ${themeClasses.text} placeholder-gray-600 outline-none text-base`}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl px-4 py-3`}>
              <label className={`block text-xs ${themeClasses.textMuted}`}>Username</label>
              <input
                value={serverUsername}
                onChange={(e) => {
                  setServerUsername(e.target.value);
                  setLoginError("");
                }}
                placeholder="username"
                className={`mt-2 w-full bg-transparent ${themeClasses.text} placeholder-gray-600 outline-none text-base`}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </>
        )}

        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl px-4 py-3`}>
          <div className="flex items-center justify-between gap-3">
            <label className={`block text-xs ${themeClasses.textMuted}`}>
              {mode === "server" ? "Account password" : "Master password"}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`text-sm ${accentClasses.textClass} font-medium active:opacity-90`}
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
            className={`mt-2 w-full bg-transparent ${themeClasses.text} placeholder-gray-600 outline-none text-base`}
            autoFocus
          />
          <p className={`text-xs ${themeClasses.textMuted} mt-1`}>Minimum 8 characters</p>
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
            className={`w-full rounded-2xl ${themeClasses.cardBg} border ${themeClasses.border} py-4 text-base font-semibold ${accentClasses.textClass} disabled:opacity-50 disabled:cursor-not-allowed active:opacity-90`}
          >
            {isLoading ? (mode === "server" ? "Signing in..." : "Unlocking...") : mode === "server" ? "Sign in" : "Unlock"}
          </button>
          {mode === "local" && canBiometricUnlockLocal && (
            <button
              type="button"
              onClick={handleUseBiometricsInstead}
              disabled={isLoading}
              className={`w-full text-center text-sm font-semibold ${themeClasses.textSecondary} underline underline-offset-4 py-2 active:opacity-90`}
            >
              Use {biometric?.label ?? "biometrics"} instead
            </button>
          )}
          {mode === "server" && serverBiometricAvailableFor(serverUrl) && (
            <button
              type="button"
              onClick={handleUseBiometricsInstead}
              disabled={isLoading}
              className={`w-full text-center text-sm font-semibold ${themeClasses.textSecondary} underline underline-offset-4 py-2 active:opacity-90`}
            >
              Use {biometric?.label ?? "biometrics"} instead
            </button>
          )}
          <p className={`text-xs ${themeClasses.textMuted} text-center mt-3`}>
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
