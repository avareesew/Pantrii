"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading
    if (!session) router.push("/login") // Not authenticated
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[--color-cream] dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pantrii-600 mx-auto"></div>
          <p className="mt-2 text-stone-600 dark:text-neutral-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-[--color-cream] dark:bg-black">
      {/* Header */}
      <header className="border-b border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Image src="/logo-pantrii.svg" alt="Pantrii" width={120} height={28} />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-600 dark:text-neutral-300">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-stone-600 dark:text-neutral-300 hover:text-stone-900 dark:hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
            Your Kitchen Dashboard
          </h1>
          <p className="mt-2 text-stone-600 dark:text-neutral-300">
            Manage your recipes, meal plans, and grocery lists.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/feature-recipes.svg" alt="" width={32} height={32} />
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
                My Recipes
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-neutral-300 mb-4">
              Save and organize your favorite recipes.
            </p>
            <button className="w-full rounded-lg bg-pantrii-600 text-white px-4 py-2 text-sm font-medium hover:bg-pantrii-700">
              View Recipes
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/feature-meal-prep.svg" alt="" width={32} height={32} />
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
                Meal Plans
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-neutral-300 mb-4">
              Plan your weekly meals and generate grocery lists.
            </p>
            <button className="w-full rounded-lg bg-pantrii-600 text-white px-4 py-2 text-sm font-medium hover:bg-pantrii-700">
              Create Meal Plan
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/feature-grocery.svg" alt="" width={32} height={32} />
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
                Scan Recipes
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-neutral-300 mb-4">
              Import recipes from photos or documents.
            </p>
            <Link
              href="/scan"
              className="block w-full rounded-lg bg-pantrii-600 text-white px-4 py-2 text-sm font-medium hover:bg-pantrii-700 text-center"
            >
              Scan Recipe
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8">
            <p className="text-stone-500 dark:text-neutral-400">
              No recent activity yet. Start by scanning a recipe or creating a meal plan!
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

