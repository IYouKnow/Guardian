function App() {
  const platform = import.meta.env.VITE_PLATFORM || "Web"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center p-10 bg-black/40 backdrop-blur rounded-2xl border border-purple-500/30">
        <h1 className="text-7xl font-bold text-white mb-4">Guardian</h1>
        <p className="text-2xl text-purple-200">Your forever password vault</p>
        <p className="mt-8 text-lg text-gray-300">
          Running on: <span className="font-mono text-green-400">{platform}</span>
        </p>
      </div>
    </div>
  )
}
export default App
