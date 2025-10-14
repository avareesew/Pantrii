"use client"

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();
  
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 rounded-xl frosted border border-black/5 dark:border-white/10 shadow-sm">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Image src="/logo-pantrii.svg" alt="Pantrii" width={120} height={28} />
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-stone-600 dark:text-neutral-300">
              <a className="hover:text-black dark:hover:text-white" href="#features">Features</a>
              <a className="hover:text-black dark:hover:text-white" href="#how">How it works</a>
              <a className="hover:text-black dark:hover:text-white" href="/scan">Scan Recipes</a>
              <a className="hover:text-black dark:hover:text-white" href="#cta">Get started</a>
            </nav>
            <div className="flex items-center gap-2">
              {session ? (
                <Link href="/dashboard" className="inline-flex rounded-full bg-pantrii-600 text-white px-4 py-2 text-sm font-medium hover:opacity-95">
                  Dashboard
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className="text-stone-600 dark:text-neutral-300 hover:text-black dark:hover:text-white px-3 py-2 text-sm font-medium">
                    Sign in
                  </Link>
                  <Link href="/register" className="inline-flex rounded-full bg-pantrii-600 text-white px-4 py-2 text-sm font-medium hover:opacity-95">
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

