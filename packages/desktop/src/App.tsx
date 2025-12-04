import { useState } from "react";
import "./App.css";

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  website: string;
  password: string;
  category?: string;
  favorite?: boolean;
  passwordStrength?: "weak" | "medium" | "strong" | "very-strong";
  lastModified?: string;
  notes?: string;
  tags?: string[];
  breached?: boolean;
}

function App() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([
    {
      id: "1",
      title: "GitHub",
      username: "user@example.com",
      website: "github.com",
      password: "••••••••",
      category: "Development",
      favorite: true,
      passwordStrength: "very-strong",
      lastModified: "2 days ago",
      notes: "Personal account",
      tags: ["work", "coding"],
      breached: false,
    },
    {
      id: "2",
      title: "Gmail",
      username: "user@gmail.com",
      website: "gmail.com",
      password: "••••••••",
      category: "Email",
      favorite: false,
      passwordStrength: "strong",
      lastModified: "1 week ago",
      tags: ["personal"],
      breached: false,
    },
    {
      id: "3",
      title: "Twitter",
      username: "@username",
      website: "twitter.com",
      password: "••••••••",
      category: "Social",
      favorite: true,
      passwordStrength: "medium",
      lastModified: "3 days ago",
      tags: ["social", "public"],
      breached: true,
    },
    {
      id: "4",
      title: "Netflix",
      username: "user@netflix.com",
      website: "netflix.com",
      password: "••••••••",
      category: "Entertainment",
      favorite: false,
      passwordStrength: "weak",
      lastModified: "1 month ago",
      tags: ["streaming"],
      breached: false,
    },
    {
      id: "5",
      title: "Stripe",
      username: "admin@company.com",
      website: "stripe.com",
      password: "••••••••",
      category: "Development",
      favorite: true,
      passwordStrength: "very-strong",
      lastModified: "1 day ago",
      notes: "Business account - 2FA enabled",
      tags: ["work", "payment"],
      breached: false,
    },
    {
      id: "6",
      title: "Discord",
      username: "user#1234",
      website: "discord.com",
      password: "••••••••",
      category: "Social",
      favorite: false,
      passwordStrength: "strong",
      lastModified: "5 days ago",
      tags: ["gaming", "social"],
      breached: false,
    },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPassword, setSelectedPassword] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredPasswords = passwords.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.website.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(passwords.map((p) => p.category).filter(Boolean)))];

  const togglePasswordVisibility = (id: string) => {
    setShowPassword((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleFavorite = (id: string) => {
    setPasswords((prev) =>
      prev.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p))
    );
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col">
        <div className="p-8 border-b border-[#1a1a1a]">
          <h1 className="text-3xl font-bold text-white mb-1">Guardian</h1>
          <p className="text-sm text-gray-400">Password Manager</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
              Categories
            </h3>
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => setActiveCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      activeCategory === category
                        ? "bg-[#1a1a1a] text-yellow-400"
                        : "text-gray-400 hover:text-white hover:bg-[#111111]"
                    }`}
                  >
                    {category === "all" ? "All Passwords" : category}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#1a1a1a] pt-4">
            <ul className="space-y-1">
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#111111] transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Favorites
                </button>
              </li>
              <li>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#111111] transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div className="p-4 border-t border-[#1a1a1a]">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Password
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-black">
        {/* Header */}
        <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {activeCategory === "all" ? "All Passwords" : activeCategory}
              </h2>
              <p className="text-sm text-gray-400">{filteredPasswords.length} passwords</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="relative">
                <button
                  onClick={() => setViewMode(viewMode === "grid" ? "table" : "grid")}
                  className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-sm font-medium transition-all border border-[#1a1a1a] flex items-center gap-2"
                >
                  {viewMode === "grid" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <span>Table</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span>Grid</span>
                    </>
                  )}
                </button>
              </div>
              <button className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-sm font-medium transition-all border border-[#1a1a1a]">
                Import
              </button>
              <button className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-sm font-medium transition-all border border-[#1a1a1a]">
                Export
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search passwords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
            />
          </div>
        </header>

        {/* Password List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredPasswords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg mb-2">
                {searchQuery ? "No passwords found" : "No passwords yet"}
              </p>
              <p className="text-gray-500 text-sm">
                {searchQuery ? "Try a different search term" : "Add your first password to get started"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredPasswords.map((password) => {
                const getStrengthColor = (strength?: string) => {
                  switch (strength) {
                    case "very-strong": return "bg-green-500";
                    case "strong": return "bg-green-400";
                    case "medium": return "bg-yellow-400";
                    case "weak": return "bg-red-500";
                    default: return "bg-gray-500";
                  }
                };

                return (
                  <div
                    key={password.id}
                    onClick={() => setSelectedPassword(selectedPassword === password.id ? null : password.id)}
                    className={`bg-gradient-to-br from-[#0a0a0a] to-[#111111] rounded-xl border transition-all cursor-pointer aspect-square flex flex-col overflow-hidden group ${
                      selectedPassword === password.id
                        ? "border-yellow-400/50 shadow-lg shadow-yellow-400/10"
                        : "border-[#1a1a1a] hover:border-yellow-400/30 hover:shadow-lg"
                    }`}
                  >
                    {/* Header with icon and favorite */}
                    <div className="relative p-4 pb-2">
                      <div className="flex items-start justify-between mb-3">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400/30 to-yellow-500/20 border-2 border-yellow-400/30 flex items-center justify-center text-yellow-400 font-bold text-xl shadow-lg">
                            {password.title.charAt(0).toUpperCase()}
                          </div>
                          {password.breached && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(password.id);
                          }}
                          className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                            password.favorite
                              ? "text-yellow-400 bg-yellow-400/10"
                              : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
                          }`}
                          title="Toggle favorite"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      </div>

                      {/* Title and username */}
                      <div className="mb-2">
                        <h3 className="font-bold text-white text-sm mb-0.5 truncate">{password.title}</h3>
                        <p className="text-xs text-gray-400 truncate">{password.username}</p>
                      </div>

                      {/* Password strength indicator */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStrengthColor(password.passwordStrength)} transition-all`}
                            style={{
                              width:
                                password.passwordStrength === "very-strong"
                                  ? "100%"
                                  : password.passwordStrength === "strong"
                                  ? "75%"
                                  : password.passwordStrength === "medium"
                                  ? "50%"
                                  : "25%",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase font-medium">
                          {password.passwordStrength?.replace("-", " ") || "unknown"}
                        </span>
                      </div>

                      {/* Tags */}
                      {password.tags && password.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {password.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-[#1a1a1a] text-[10px] text-gray-400 rounded border border-[#1a1a1a]"
                            >
                              {tag}
                            </span>
                          ))}
                          {password.tags.length > 2 && (
                            <span className="px-1.5 py-0.5 text-[10px] text-gray-500">+{password.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded content */}
                    {selectedPassword === password.id && (
                      <div className="px-4 pb-4 mt-auto border-t border-[#1a1a1a] pt-3 space-y-2 bg-[#0a0a0a]/50">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
                          <span>Modified: {password.lastModified || "Unknown"}</span>
                          {password.category && (
                            <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 rounded border border-yellow-400/20">
                              {password.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mb-2">
                          <input
                            type={showPassword[password.id] ? "text" : "password"}
                            value={showPassword[password.id] ? "MySecurePassword123!" : "••••••••"}
                            readOnly
                            className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePasswordVisibility(password.id);
                            }}
                            className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-[#1a1a1a] rounded-lg transition-all"
                          >
                            {showPassword[password.id] ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>

                        {password.notes && (
                          <p className="text-[10px] text-gray-500 italic mb-2 line-clamp-2">{password.notes}</p>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Copy logic
                            }}
                            className="flex-1 px-2 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-semibold transition-all shadow-sm"
                          >
                            Copy
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit logic
                            }}
                            className="px-2 py-1.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-xs font-medium transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open website
                            }}
                            className="px-2 py-1.5 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg text-xs transition-all"
                            title="Open website"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
      </div>
                    )}

                    {/* Quick actions when not expanded */}
                    {selectedPassword !== password.id && (
                      <div className="px-4 pb-3 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>{password.lastModified || "Unknown"}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Quick copy
                              }}
                              className="p-1 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                              title="Quick copy"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open website
                              }}
                              className="p-1 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                              title="Open website"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Website</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPasswords.map((password) => (
                    <tr
                      key={password.id}
                      className={`border-b border-[#1a1a1a] hover:bg-[#0a0a0a] transition-colors cursor-pointer ${
                        selectedPassword === password.id ? "bg-[#111111]" : ""
                      }`}
                      onClick={() => setSelectedPassword(selectedPassword === password.id ? null : password.id)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold">
                            {password.title.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{password.title}</span>
                            {password.favorite && (
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">{password.username}</td>
                      <td className="py-4 px-4 text-gray-400 text-sm">{password.website}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type={showPassword[password.id] ? "text" : "password"}
                            value={showPassword[password.id] ? "MySecurePassword123!" : "••••••••"}
                            readOnly
                            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded px-2 py-1 text-white font-mono text-sm w-32"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePasswordVisibility(password.id);
                            }}
                            className="p-1 text-gray-500 hover:text-yellow-400 transition-colors"
                          >
                            {showPassword[password.id] ? (
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
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-[#1a1a1a] text-gray-400 text-xs rounded">{password.category}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(password.id);
                            }}
                            className={`p-2 rounded-lg transition-all ${
                              password.favorite
                                ? "text-yellow-400 hover:bg-yellow-400/10"
                                : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
                            }`}
                            title="Toggle favorite"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Copy logic
                            }}
                            className="p-2 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all"
                            title="Copy password"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit logic
                            }}
                            className="p-2 text-gray-500 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Delete logic
                            }}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Password Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add New Password</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Title</label>
                <input
                  type="text"
                  placeholder="e.g., GitHub"
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Username/Email</label>
                <input
                  type="text"
                  placeholder="user@example.com"
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Website</label>
                <input
                  type="text"
                  placeholder="example.com"
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
        <input
                  type="password"
                  placeholder="Enter password"
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <select className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all">
                  <option>Development</option>
                  <option>Email</option>
                  <option>Social</option>
                  <option>Entertainment</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-semibold transition-all"
                >
                  Add Password
                </button>
              </div>
      </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
