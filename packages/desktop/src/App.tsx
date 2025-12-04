import { useState } from "react";
import "./App.css";
import { PasswordEntry } from "./types";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PasswordGrid from "./components/PasswordGrid";
import PasswordTable from "./components/PasswordTable";
import AddPasswordModal from "./components/AddPasswordModal";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  const categories = ["all", ...Array.from(new Set(passwords.map((p) => p.category).filter((c): c is string => Boolean(c))))];

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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedPassword(null);
  };

  // Login Page
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  // Main App
  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onAddPassword={() => setShowAddModal(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-black">
        <Header
          activeCategory={activeCategory}
          passwordCount={filteredPasswords.length}
          viewMode={viewMode}
          onViewModeToggle={() => setViewMode(viewMode === "grid" ? "table" : "grid")}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

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
            <PasswordGrid
              passwords={filteredPasswords}
              selectedPassword={selectedPassword}
              showPasswords={showPassword}
              onSelectPassword={setSelectedPassword}
              onToggleFavorite={toggleFavorite}
              onTogglePasswordVisibility={togglePasswordVisibility}
            />
          ) : (
            <PasswordTable
              passwords={filteredPasswords}
              selectedPassword={selectedPassword}
              showPasswords={showPassword}
              onSelectPassword={setSelectedPassword}
              onToggleFavorite={toggleFavorite}
              onTogglePasswordVisibility={togglePasswordVisibility}
            />
          )}
        </div>
      </main>

      <AddPasswordModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}

export default App;
