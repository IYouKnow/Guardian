interface HeaderProps {
  activeCategory: string;
  passwordCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Header({
  activeCategory,
  passwordCount,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  return (
    <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {activeCategory === "all" ? "All Passwords" : activeCategory}
          </h2>
          <p className="text-sm text-gray-400">{passwordCount} passwords</p>
        </div>
        <div className="flex items-center gap-3">
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
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
        />
      </div>
    </header>
  );
}

