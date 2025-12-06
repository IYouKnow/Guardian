interface SettingsProps {
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
}

export default function Settings({ viewMode, onViewModeChange }: SettingsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your password manager preferences</p>
        </div>

        <div className="space-y-6">
          {/* View Mode Setting */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">Display Preferences</h2>
              <p className="text-gray-400 text-sm">
                Customize how your passwords are displayed in the main view
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  View Mode
                </label>
                <select
                  value={viewMode}
                  onChange={(e) => onViewModeChange(e.target.value as "grid" | "table")}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                >
                  <option value="grid">Grid View</option>
                  <option value="table">Table View</option>
                </select>
              </div>

              <div className="bg-[#111111] border border-[#1a1a1a] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white mb-1">About View Modes</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      <strong className="text-gray-300">Grid View:</strong> Displays passwords as cards in a grid layout. 
                      Ideal for quickly browsing through your passwords with visual icons. Best for users who prefer a 
                      more visual and modern interface.
                    </p>
                    <p className="text-sm text-gray-400 leading-relaxed mt-2">
                      <strong className="text-gray-300">Table View:</strong> Displays passwords in a traditional table format 
                      with columns for service, username, website, password, and category. Perfect for users who need to 
                      see more information at once and prefer a compact, organized layout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Settings Placeholder */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">Security</h2>
              <p className="text-gray-400 text-sm">
                Security and encryption settings
              </p>
            </div>
            <p className="text-gray-500 text-sm">More security options coming soon...</p>
          </div>

          {/* Additional Settings Placeholder */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">General</h2>
              <p className="text-gray-400 text-sm">
                General application preferences
              </p>
            </div>
            <p className="text-gray-500 text-sm">More general options coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
