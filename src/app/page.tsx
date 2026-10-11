"use client";

import React, { useState } from "react";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { IntakeFormValues } from "@/lib/schemas/intake";

export default function Home() {
  const [showIntake, setShowIntake] = useState<boolean>(false);
  const [verifiedIntake, setVerifiedIntake] = useState<IntakeFormValues | null>(null);

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 md:p-12 max-w-6xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-semibold text-zinc-300">
            Multiverse You • v0.1.0
          </span>
        </div>
        <div className="text-xs text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
          Phase 12: Intake Active
        </div>
      </header>

      {/* Main Content Area */}
      <div className="my-auto py-10">
        {!showIntake && !verifiedIntake ? (
          <section className="flex flex-col gap-6 max-w-2xl mx-auto text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400 w-fit">
              <span>Counterfactual Reflection Engine</span>
              <span className="text-zinc-600">•</span>
              <span>12 Divergent Branches</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100 leading-tight">
              Fork a single real-world decision into 12 parallel simulated futures.
            </h1>

            <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
              Explore your personal trade-offs quarter-by-quarter across 5 simulated years.
              Analyze where burnout emerges, how financial runway compounds, and what life
              feels like when you take the leap vs staying the course.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIntake(true)}
                className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-zinc-50 transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
              >
                <span>Begin Decision Intake</span>
                <span className="text-emerald-300">→</span>
              </button>

              <div className="px-4 py-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-400 flex items-center">
                <span>5-Question Profiler • 0% Vision Tokens • Strict Math</span>
              </div>
            </div>

            <div className="pt-4 text-xs text-zinc-500">
              <div className="p-3 rounded border border-zinc-800/80 bg-zinc-900/30">
                <span className="text-zinc-300 font-medium">Framing Invariant:</span>{" "}
                Multiverse You is a reflective sandbox for personal introspection, not an oracle or predictive forecast.
              </div>
            </div>
          </section>
        ) : (
          <section className="py-2">
            <IntakeForm
              onCancel={() => setShowIntake(false)}
              onSubmitSuccess={(data) => {
                setVerifiedIntake(data);
              }}
            />
          </section>
        )}
      </div>

      {/* Bottom Footer Info */}
      <footer className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-zinc-500">
        <div>Typography: Poppins • Palette: Warm Restrained Slate • Stack: Next.js 15, TypeScript, Tailwind CSS v4</div>
        <div className="font-mono">Engine: Zero-Token Math & Dynamic Multi-Provider AI</div>
      </footer>
    </main>
  );
}
