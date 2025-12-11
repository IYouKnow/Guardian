import { useState, FormEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { Theme, AccentColor } from "../types";
import { getAccentColorClasses } from "../utils/accentColors";

interface RegisterWizardProps {
  onRegister: (vaultPath: string, masterPassword: string, theme: Theme, accentColor: AccentColor) => Promise<void>;
  onBackToLogin: () => void;
}

const STEPS = [
  { id: 1, title: "Vault Name", description: "Choose a name for your vault" },
  { id: 2, title: "Location", description: "Select where to save your vault file" },
  { id: 3, title: "Security", description: "Set up your master password" },
  { id: 4, title: "Theme", description: "Choose your preferred theme" },
  { id: 5, title: "Accent Color", description: "Select your accent color" },
];

export default function RegisterWizard({ onRegister, onBackToLogin }: RegisterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
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
    if (selectedTheme === "light") {
      return {
        bg: "bg-[#fafafa]",
        text: "text-gray-800",
        textSecondary: "text-gray-600",
        cardBg: "bg-gray-100",
        border: "border-gray-300",
        inputBg: "bg-gray-200",
      };
    } else if (selectedTheme === "slate") {
      return {
        bg: "bg-gray-900",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        cardBg: "bg-gray-800",
        border: "border-gray-700",
        inputBg: "bg-gray-800",
      };
    } else if (selectedTheme === "editor") {
      return {
        bg: "bg-[#1e1e1e]",
        text: "text-[#d4d4d4]",
        textSecondary: "text-[#858585]",
        cardBg: "bg-[#252526]",
        border: "border-[#3e3e42]",
        inputBg: "bg-[#2a2d2e]",
      };
    } else if (selectedTheme === "violet") {
      return {
        bg: "bg-[#282a36]",
        text: "text-[#f8f8f2]",
        textSecondary: "text-[#c9a0dc]",
        cardBg: "bg-[#44475a]",
        border: "border-[#6272a4]/60",
        inputBg: "bg-[#44475a]",
      };
    } else {
      return {
        bg: "bg-black",
        text: "text-white",
        textSecondary: "text-gray-400",
        cardBg: "bg-[#0a0a0a]",
        border: "border-[#1a1a1a]",
        inputBg: "bg-[#1a1a1a]",
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
          setError("Vault name is required");
          return false;
        }
        if (vaultName.trim().length < 3) {
          setError("Vault name must be at least 3 characters");
          return false;
        }
        return true;
      
      case 2:
        if (!vaultPath) {
          setError("Please select a location to save your vault");
          return false;
        }
        return true;
      
      case 3:
        if (masterPassword.length < 8) {
          setError("Master password must be at least 8 characters");
          return false;
        }
        if (masterPassword !== confirmPassword) {
          setError("Passwords do not match");
          return false;
        }
        return true;
      
      case 4:
      case 5:
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
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
      setError(
        err instanceof Error ? err.message : "Failed to create vault file. Please try again."
      );
      setIsCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                Vault Name
              </label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => {
                  setVaultName(e.target.value);
                  setError("");
                }}
                placeholder="My Vault"
                className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-4 py-3 ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} focus:border-transparent transition-all`}
                autoFocus
              />
              <p className={`mt-2 text-xs ${themeClasses.textSecondary}`}>
                This name will help you identify your vault
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                Vault Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vaultPath}
                  readOnly
                  placeholder="Select where to save your vault file"
                  className={`flex-1 ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-4 py-3 ${themeClasses.text} placeholder-gray-500 cursor-not-allowed`}
                />
                <button
                  type="button"
                  onClick={handleSelectLocation}
                  className={`px-4 py-3 ${themeClasses.cardBg} hover:opacity-80 ${themeClasses.text} rounded-lg font-medium transition-all border ${themeClasses.border} whitespace-nowrap`}
                >
                  Browse
                </button>
              </div>
              <p className={`mt-2 text-xs ${themeClasses.textSecondary}`}>
                Choose where to save your encrypted vault file
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter master password (min 8 characters)"
                  className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-4 py-3 pr-12 ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} focus:border-transparent transition-all`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${themeClasses.textSecondary} ${accentClasses.hoverTextClass} transition-colors`}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                Confirm Master Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Confirm master password"
                  className={`w-full ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg px-4 py-3 pr-12 ${themeClasses.text} placeholder-gray-500 focus:outline-none focus:ring-2 ${accentClasses.focusRingClass} focus:border-transparent transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${themeClasses.textSecondary} ${accentClasses.hoverTextClass} transition-colors`}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {(["light", "dark", "slate", "editor", "violet"] as Theme[]).map((theme) => {
                const tempThemeClasses = theme === selectedTheme 
                  ? (theme === "light" 
                      ? { bg: "bg-gray-200", text: "text-gray-800" }
                      : { bg: "bg-gray-800", text: "text-white" })
                  : { bg: themeClasses.cardBg, text: themeClasses.textSecondary };
                
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    className={`w-full text-left px-4 py-3.5 rounded-lg transition-all border-2 ${
                      selectedTheme === theme
                        ? `${accentClasses.borderClass} ${tempThemeClasses.bg} ${tempThemeClasses.text}`
                        : `${themeClasses.border} ${themeClasses.cardBg} ${themeClasses.textSecondary} hover:opacity-80`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedTheme === theme
                          ? accentClasses.baseClass
                          : themeClasses.border
                      }`}>
                        {selectedTheme === theme && (
                          <div className={`w-2 h-2 rounded-full ${selectedTheme === "light" ? "bg-gray-800" : "bg-white"}`} />
                        )}
                      </div>
                      <span className="text-sm font-medium capitalize">{theme}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {(["yellow", "blue", "green", "purple", "pink", "orange", "cyan", "red"] as AccentColor[]).map((color) => {
                const colorClasses = getAccentColorClasses(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedAccentColor(color)}
                    className={`relative aspect-square rounded-lg border-2 transition-all ${
                      selectedAccentColor === color
                        ? `${colorClasses.baseClass} ${colorClasses.lightClass}`
                        : `${themeClasses.border} ${themeClasses.cardBg} hover:opacity-80`
                    }`}
                  >
                    <div className={`w-full h-full rounded-md ${colorClasses.bgClass}`} />
                    {selectedAccentColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className={`w-6 h-6 ${colorClasses.textClass}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex h-screen ${themeClasses.bg} ${themeClasses.text} items-center justify-center p-6`}>
      <div className="w-full max-w-2xl">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${accentClasses.lightClass} border-2 ${accentClasses.borderClass} mb-4 shadow-lg ${accentClasses.shadowClass}`}>
            <svg className={`w-10 h-10 ${accentClasses.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className={`text-4xl font-bold mb-2 ${themeClasses.text}`}>Create Vault</h1>
          <p className={themeClasses.textSecondary}>Set up your password manager</p>
        </div>

        {/* Minimal Step Indicator */}
        <div className="mb-8">
          {/* Step Labels */}
          <div className="flex justify-between mb-4">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`text-xs font-bold transition-colors duration-300 ${
                  currentStep >= step.id
                    ? accentClasses.textClass
                    : themeClasses.textSecondary
                }`}
              >
                {step.title}
              </div>
            ))}
          </div>

          {/* Progress Line */}
          <div className="relative">
            <div className={`h-0.5 rounded-full ${themeClasses.border} opacity-20`} />
            <div 
              className={`absolute top-0 left-0 h-0.5 ${accentClasses.bgClass} transition-all duration-500 ease-out rounded-full`}
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className={`${themeClasses.cardBg} rounded-xl p-8 mb-6 border ${themeClasses.border}`}>
          <div className="mb-6">
            <h2 className={`text-2xl font-semibold mb-2 ${themeClasses.text}`}>
              {STEPS[currentStep - 1].title}
            </h2>
            <p className={themeClasses.textSecondary}>
              {STEPS[currentStep - 1].description}
            </p>
          </div>

          <form onSubmit={currentStep === STEPS.length ? handleFinish : (e) => { e.preventDefault(); handleNext(); }}>
            {renderStepContent()}

            {error && (
              <div className={`mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 gap-4">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className={`px-6 py-3 ${themeClasses.cardBg} hover:opacity-80 ${themeClasses.text} rounded-lg font-medium transition-all border ${themeClasses.border}`}
                  >
                    Previous
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {currentStep < STEPS.length ? (
                  <button
                    type="submit"
                    className={`px-6 py-3 ${accentClasses.bgClass} ${accentClasses.bgHoverClass} text-black font-semibold rounded-lg transition-all ${accentClasses.shadowClass} flex items-center gap-2`}
                  >
                    Next
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isCreating}
                    className={`px-6 py-3 ${accentClasses.bgClass} hover:${accentClasses.bgHoverClass} disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-all ${accentClasses.shadowClass} flex items-center gap-2`}
                  >
                    {isCreating ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Create Vault
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Back to Login */}
        <div className="text-center">
          <button
            onClick={onBackToLogin}
            className={`text-sm ${themeClasses.textSecondary} ${accentClasses.hoverTextClass} transition-colors flex items-center justify-center gap-1 mx-auto`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

