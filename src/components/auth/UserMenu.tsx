"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth/authContext";

export interface UserMenuProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
}

export function UserMenu({ onOpenLogin, onOpenSignup }: UserMenuProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenLogin}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition"
        >
          Log In
        </button>
        <button
          type="button"
          onClick={onOpenSignup}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white transition shadow-sm"
        >
          Sign Up
        </button>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition text-left"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        <div className="relative w-6 h-6 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-200 border border-zinc-700">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name}
              width={24}
              height={24}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
          <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-zinc-900" />
        </div>
        <span className="text-xs font-medium text-zinc-200 hidden sm:inline max-w-[120px] truncate">
          {user.name}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 text-zinc-200 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* User Details */}
          <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
            <p className="text-xs font-semibold text-zinc-100 truncate">{user.name}</p>
            <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => setDropdownOpen(false)}
            className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-850 transition flex items-center justify-between"
          >
            <span>My Simulations</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-zinc-400">
              {user.simulationsCount ?? 4}
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => setDropdownOpen(false)}
            className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-850 transition flex items-center justify-between"
          >
            <span>Profile & Settings</span>
          </button>

          <div className="border-t border-zinc-800/80 my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout();
              setDropdownOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
