export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-8 md:p-16 max-w-6xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
            Multiverse You • v0.1.0
          </span>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          Phase 1: Foundation Active
        </div>
      </header>

      {/* Central Product Hero */}
      <section className="my-auto py-12 flex flex-col gap-6 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400 w-fit">
          <span>Simulation Engine</span>
          <span className="text-zinc-600">•</span>
          <span>5-Year Counterfactual Modeler</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100 leading-tight">
          Fork a single real-world decision into 12 parallel simulated futures.
        </h1>

        <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
          Simulate life quarter-by-quarter across divergent realities. Explore where
          hidden trade-offs emerge, how regret accumulates, and which small daily choices
          shape long-term outcomes.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-zinc-500">
          <div className="p-3 rounded border border-zinc-800/80 bg-zinc-900/30">
            <span className="text-zinc-300 font-medium">Important Framing:</span>{" "}
            This is an interactive reflection tool and counterfactual simulator, not a predictive forecast.
          </div>
        </div>
      </section>

      {/* Bottom Footer Info */}
      <footer className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-zinc-500">
        <div>Typography: Poppins • Stack: Next.js 15, TypeScript, Tailwind CSS</div>
        <div className="font-mono">Status: Ready for Phase 2</div>
      </footer>
    </main>
  );
}
