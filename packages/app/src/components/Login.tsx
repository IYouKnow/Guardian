import { useState, FormEvent, useRef } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { loadVault } from "../../../shared/crypto";

interface LoginProps {
  onLogin: (vaultPath: string, masterPassword: string, vaultBytes: Uint8Array) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [masterPassword, setMasterPassword] = useState("");
  const [vaultPath, setVaultPath] = useState<string>("");
  const [vaultBytes, setVaultBytes] = useState<Uint8Array | null>(null);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectVault = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    
    setLoginError("");
    
    try {
      console.log("Reading file:", file.name, "Size:", file.size, "Type:", file.type);
      
      // Read file as ArrayBuffer directly
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      console.log("File read successfully, bytes length:", bytes.length);
      
      // Validate file format - check for "GUARDIAN" header
      if (bytes.length < 8) {
        setLoginError("File is too small to be a valid vault");
        setVaultPath("");
        setVaultBytes(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      const header = new TextDecoder().decode(bytes.slice(0, 8));
      console.log("File header:", header);
      
      if (header !== 'GUARDIAN') {
        setLoginError("Invalid vault file format. Expected 'GUARDIAN' header.");
        setVaultPath("");
        setVaultBytes(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      console.log("Vault file loaded successfully:", {
        name: file.name,
        size: bytes.length,
        header: header
      });
      
      // Store both the file name and bytes
      setVaultPath(file.name);
      setVaultBytes(bytes);
    } catch (err) {
      console.error("Error reading vault file:", err);
      setLoginError(`Failed to read vault file: ${err instanceof Error ? err.message : String(err)}`);
      setVaultPath("");
      setVaultBytes(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!vaultBytes) {
      setLoginError("Please select your vault file");
      return;
    }

    if (masterPassword.length < 8) {
      setLoginError("Master password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting to decrypt vault...", {
        vaultSize: vaultBytes.length,
        passwordLength: masterPassword.length
      });
      
      // Try to decrypt vault with the bytes we already have
      const decryptedVault = await loadVault(masterPassword, vaultBytes);
      
      console.log("Vault decrypted successfully!", {
        entryCount: decryptedVault.entries.length
      });

      // Save vault to app's data directory for future use
      const fileName = vaultPath.endsWith('.guardian') ? vaultPath : `${vaultPath}.guardian`;
      
      // Convert Uint8Array to base64 properly (handle large files)
      let binaryString = '';
      for (let i = 0; i < vaultBytes.length; i++) {
        binaryString += String.fromCharCode(vaultBytes[i]);
      }
      const base64Data = btoa(binaryString);
      
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data,
      });

      // Success - vault decrypted correctly
      onLogin(fileName, masterPassword, vaultBytes);
      setMasterPassword("");
    } catch (err) {
      console.error("Error loading vault:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error details:", errorMessage);
      
      // Provide more specific error messages
      if (errorMessage.includes('Invalid vault format')) {
        setLoginError("Invalid vault file format. Please select a valid .guardian file.");
      } else if (errorMessage.includes('Authentication failed') || errorMessage.includes('Invalid master password')) {
        setLoginError("Invalid master password. Please try again.");
      } else if (errorMessage.includes('corrupted')) {
        setLoginError("Vault file appears to be corrupted.");
      } else {
        setLoginError(`Error: ${errorMessage}`);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border-2 border-yellow-400/30 mb-4 shadow-lg shadow-yellow-400/10">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Guardian</h1>
          <p className="text-gray-400">Enter your master password to unlock</p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".guardian,application/octet-stream"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Vault File</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vaultPath || ""}
                readOnly
                placeholder="Select your vault file"
                className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3 text-white placeholder-gray-500 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleSelectVault}
                className="px-4 py-3 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg font-medium transition-all border border-[#1a1a1a] whitespace-nowrap"
              >
                {vaultPath ? "Change" : "Browse"}
              </button>
            </div>
            {vaultPath && (
              <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                File selected
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Master Password</label>
            <div className="relative">
              <input
                type={showMasterPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="Enter your master password"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-yellow-400 transition-colors"
              >
                {showMasterPassword ? (
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
            {loginError && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {loginError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-400/50 disabled:cursor-not-allowed text-black font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Unlocking...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Unlock Vault
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Select your .guardian vault file and enter your master password
          </p>
        </div>
      </div>
    </div>
  );
}
