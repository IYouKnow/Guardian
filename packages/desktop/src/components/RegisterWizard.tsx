import { useState, FormEvent, useEffect } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface RegisterWizardProps {
  onRegister: (vaultPath: string, masterPassword: string, theme: Theme, accentColor: AccentColor) => Promise<void>;
  onBackToLogin: () => void;
}

const STEPS = [
  { id: 1, title: "Vault Name", description: "Choose a name to identify your encrypted storage." },
  { id: 2, title: "Storage Path", description: "Specify the local directory for your vault file." },
  { id: 3, title: "Access Key", description: "Set a strong master password to secure your data." },
  { id: 4, title: "Visual Theme", description: "Select the interface style that suits your environment." },
  { id: 5, title: "Color Accent", description: "Choose an accent color for the interface elements." },
];

export default function RegisterWizard({ onRegister, onBackToLogin }: RegisterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [vaultName, setVaultName] = useState("");
  const [vaultPath, setVaultPath] = useState<string>("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme>("dark");
  const [selectedAccentColor, setSelectedAccentColor] = useState<AccentColor>("yellow");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const accentClasses = getAccentColorClasses(selectedAccentColor);

  const getThemeClasses = () => {
    switch (selectedTheme) {
      case "light":
        return {
          bg: "bg-[#f8fafc]",
          card: "bg-white/80 backdrop-blur-xl",
          text: "text-slate-900",
          textMuted: "text-slate-500",
          border: "border-slate-200",
          input: "bg-slate-100",
          item: "bg-slate-50",
          indicator: "bg-slate-200"
        };
      case "slate":
        return {
          bg: "bg-slate-950",
          card: "bg-slate-900/40 backdrop-blur-xl",
          text: "text-slate-100",
          textMuted: "text-slate-400",
          border: "border-slate-800",
          input: "bg-slate-800/50",
          item: "bg-slate-800/30",
          indicator: "bg-slate-800"
        };
      case "editor":
        return {
          bg: "bg-[#0d0d0d]",
          card: "bg-[#1a1a1a]/60 backdrop-blur-xl",
          text: "text-[#d4d4d4]",
          textMuted: "text-[#858585]",
          border: "border-[#333333]",
          input: "bg-[#252526]",
          item: "bg-[#1e1e1e]",
          indicator: "bg-[#2d2d2d]"
        };
      case "violet":
        return {
          bg: "bg-[#120a1f]",
          card: "bg-[#23173a]/50 backdrop-blur-xl",
          text: "text-[#f8f8f2]",
          textMuted: "text-[#c9a0dc]/70",
          border: "border-[#4a3a6b]",
          input: "bg-[#2d1b4d]",
          item: "bg-[#1a0f2e]",
          indicator: "bg-[#3d2c61]"
        };
      default: // dark / amoled
        return {
          bg: "bg-black",
          card: "bg-[#0a0a0a]/60 backdrop-blur-xl",
          text: "text-white",
          textMuted: "text-zinc-500",
          border: "border-zinc-800/50",
          input: "bg-zinc-900/50",
          item: "bg-zinc-900/30",
          indicator: "bg-zinc-900"
        };
    }
  };

  const themeClasses = getThemeClasses();

  const handleSelectLocation = async () => {
    try {
      const defaultFileName = vaultName.trim()
        ? `${vaultName.trim().replace(/[^a-z0-9]/gi, '-').toLowerCase()}.guardian`
        : "guardian-vault.guardian";

      const filePath = await save({
        title: "Choose where to save your vault",
        defaultPath: defaultFileName,
        filters: [
          {
            name: "Guardian Vault",
            extensions: ["guardian"],
          },
        ],
      });

      if (filePath) {
        setVaultPath(filePath);
        setError("");
      }
    } catch (err) {
      console.error("Error selecting file location:", err);
      setError("Failed to select file location");
    }
  };

  const validateStep = (step: number): boolean => {
    setError("");

    switch (step) {
      case 1:
        if (!vaultName.trim()) {
          setError("Vault name is required.");
          return false;
        }
        if (vaultName.trim().length < 3) {
          setError("Vault name must be at least 3 characters.");
          return false;
        }
        return true;
      case 2:
        if (!vaultPath) {
          setError("Storage location is required.");
          return false;
        }
        return true;
      case 3:
        if (masterPassword.length < 8) {
          setError("Master password must be at least 8 characters.");
          return false;
        }
        if (masterPassword !== confirmPassword) {
          setError("Passwords do not match.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setDirection(1);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const handleFinish = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) {
      setCurrentStep(3);
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      await onRegister(vaultPath, masterPassword, selectedTheme, selectedAccentColor);
    } catch (err) {
      console.error("Error creating vault:", err);
      setError(err instanceof Error ? err.message : "Failed to create vault file.");
      setIsCreating(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  };

  return (
    <div className={`relative flex h-screen w-full font-sans ${themeClasses.bg} ${themeClasses.text} items-center justify-center p-6 overflow-hidden transition-colors duration-500`}>
      {/* Background gradients */}
      <div className={`absolute top-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full blur-[100px] opacity-15 ${accentClasses.bgClass} transition-colors duration-700`} />
      <div className={`absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] rounded-full blur-[100px] opacity-10 ${accentClasses.bgClass} transition-colors duration-700`} />

      <div className="relative z-10 w-full max-w-lg">
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
          <h1 className="text-3xl font-bold tracking-tight mb-1">Create Vault</h1>
          <p className={`${themeClasses.textMuted} text-sm font-medium`}>Setup your secure storage profile</p>
        </motion.div>

        <motion.div
          layout
          className={`${themeClasses.card} rounded-[1.5rem] border ${themeClasses.border} overflow-hidden shadow-2xl relative`}
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
            <motion.div
              className={`h-full ${accentClasses.bgClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${accentClasses.textClass}`}>
                Step {currentStep} of {STEPS.length}
              </span>
              <div className="flex gap-1">
                {STEPS.map((s) => (
                  <div
                    key={s.id}
                    className={`h-1 rounded-full transition-all duration-300 ${currentStep === s.id ? `w-4 ${accentClasses.bgClass}` : `w-1 ${themeClasses.indicator}`
                      }`}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={currentStep === STEPS.length ? handleFinish : (e) => { e.preventDefault(); handleNext(); }}>
              <div className="min-h-[200px]">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                  >
                    <header className="mb-6">
                      <h2 className="text-xl font-bold mb-1">{STEPS[currentStep - 1].title}</h2>
                      <p className={`${themeClasses.textMuted} text-sm`}>
                        {STEPS[currentStep - 1].description}
                      </p>
                    </header>

                    {currentStep === 1 && (
                      <InputField
                        label="Vault Name"
                        placeholder="e.g. Work Documents"
                        value={vaultName}
                        onChange={(v: string) => { setVaultName(v); setError(""); }}
                        theme={themeClasses}
                        accent={accentClasses}
                        autoFocus
                        error={error}
                      />
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-2">
                        <label className={`block text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                          File Path
                        </label>
                        <div className="flex gap-2">
                          <div className={`flex-1 ${themeClasses.input} border ${themeClasses.border} rounded-xl px-4 py-3.5 flex items-center overflow-hidden`}>
                            <span className={`text-sm truncate ${vaultPath ? themeClasses.text : themeClasses.textMuted}`}>
                              {vaultPath || "Click browse to select..."}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleSelectLocation}
                            className={`px-5 rounded-xl ${themeClasses.item} border ${themeClasses.border} hover:border-white/10 transition-colors font-bold text-[0.65rem] uppercase tracking-wider`}
                          >
                            Browse
                          </button>
                        </div>
                        {error && <p className="text-red-400 text-xs font-medium ml-1">{error}</p>}
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <PasswordField
                          label="Master Password"
                          value={masterPassword}
                          onChange={(v: string) => { setMasterPassword(v); setError(""); }}
                          show={showPassword}
                          setShow={setShowPassword}
                          theme={themeClasses}
                          accent={accentClasses}
                          placeholder="Password"
                        />
                        <PasswordField
                          label="Confirm Password"
                          value={confirmPassword}
                          onChange={(v: string) => { setConfirmPassword(v); setError(""); }}
                          show={showConfirmPassword}
                          setShow={setShowConfirmPassword}
                          theme={themeClasses}
                          accent={accentClasses}
                          placeholder="Repeat password"
                          error={error}
                        />
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="grid grid-cols-1 gap-2">
                        {(["dark", "slate", "editor", "violet", "light"] as Theme[]).map((t) => (
                          <ThemeOption
                            key={t}
                            id={t}
                            selected={selectedTheme === t}
                            onClick={() => setSelectedTheme(t)}
                            theme={themeClasses}
                            accent={accentClasses}
                          />
                        ))}
                      </div>
                    )}

                    {currentStep === 5 && (
                      <div className="grid grid-cols-4 gap-3">
                        {(["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red"] as AccentColor[]).map((c) => (
                          <ColorOption
                            key={c}
                            id={c}
                            selected={selectedAccentColor === c}
                            onClick={() => setSelectedAccentColor(c)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mt-10">
                <button
                  type="button"
                  onClick={currentStep === 1 ? onBackToLogin : handlePrevious}
                  className={`flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider ${themeClasses.textMuted} hover:${themeClasses.text} transition-colors`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  {currentStep === 1 ? "Cancel" : "Back"}
                </button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isCreating}
                  className={`px-7 py-3 rounded-xl ${accentClasses.bgClass} text-black font-bold text-[0.65rem] uppercase tracking-wider shadow-lg ${accentClasses.shadowClass} disabled:opacity-50 flex items-center gap-2`}
                >
                  {isCreating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      {currentStep === STEPS.length ? "Finish Setup" : "Continue"}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>


      </div>
    </div>
  );
}

// Reusable Sub-components for cleaner code
function InputField({ label, placeholder, value, onChange, theme, accent, autoFocus = false, error }: any) {
  return (
    <div className="space-y-2">
      <label className={`block text-[0.65rem] font-bold uppercase tracking-wider ${theme.textMuted}`}>
        {label}
      </label>
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${theme.input} border ${theme.border} focus:${accent.borderClass} rounded-xl px-4 py-3.5 ${theme.text} placeholder-white/20 outline-none transition-all duration-200 ring-0 focus:ring-4 ${accent.focusRingClass}`}
      />
      {error && <p className="text-red-400 text-xs font-medium ml-1">{error}</p>}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, setShow, theme, accent, placeholder, error }: any) {
  return (
    <div className="space-y-2">
      <label className={`block text-[0.65rem] font-bold uppercase tracking-wider ${theme.textMuted}`}>
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${theme.input} border ${theme.border} focus:${accent.borderClass} rounded-xl px-4 py-4 pr-12 ${theme.text} placeholder-white/20 outline-none transition-all duration-200 ring-0 focus:ring-4 ${accent.focusRingClass}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.textMuted} hover:${theme.text} transition-colors p-1`}
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs font-medium ml-1">{error}</p>}
    </div>
  );
}

function ThemeOption({ id, selected, onClick, theme, accent }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${selected
        ? `${accent.borderClass} ${theme.item} shadow-sm`
        : `${theme.border} hover:border-white/10`
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${selected ? accent.borderClass : theme.border}`}>
          {selected && <div className={`w-2 h-2 rounded-full ${accent.bgClass}`} />}
        </div>
        <span className="text-xs font-bold uppercase tracking-widest capitalize">{id}</span>
      </div>
      {selected && <div className={`text-[0.6rem] font-bold uppercase tracking-widest ${accent.textClass}`}>Selected</div>}
    </button>
  );
}

function ColorOption({ id, selected, onClick }: any) {
  const c = getAccentColorClasses(id as AccentColor);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-xl border-2 transition-all ${selected ? `border-white shadow-lg` : `border-transparent opacity-80`
        }`}
    >
      <div className={`w-full h-full rounded-[0.55rem] ${c.bgClass} flex items-center justify-center`}>
        {selected && (
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}
