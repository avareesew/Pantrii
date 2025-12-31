"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface Ingredient {
  quantity: string;
  unit: string;
  item: string;
  notes: string;
}

interface Instruction {
  step_number: number;
  text: string;
}

interface Nutrition {
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
}

interface Recipe {
  id: string
  recipe_name: string
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  ingredients: Ingredient[]
  instructions: Instruction[]
  nutrition: Nutrition | null
  image: string | null
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/login")
  }, [session, status, router])

  useEffect(() => {
    if (session) {
      fetchRecipes()
    }
  }, [session])

  const fetchRecipes = async () => {
    try {
      const response = await fetch("/api/recipes")
      if (response.ok) {
        const data = await response.json()
        setRecipes(data)
      }
    } catch (error) {
      console.error("Error fetching recipes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image src="/logo-pantrii.svg" alt="Pantrii" width={120} height={28} />
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Recipes
            </h1>
            <p className="text-gray-600">
              Manage your recipe collection.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/scan"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Scan Recipe
            </Link>
            <Link
              href="/manual-recipe"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Add Manually
            </Link>
          </div>
        </div>

        {/* Recipes List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-lg shadow text-center">
              <p className="text-gray-500 mb-4">No recipes yet. Start by adding one!</p>
              <div className="flex gap-2 justify-center">
                <Link
                  href="/scan"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Scan Recipe
                </Link>
                <Link
                  href="/manual-recipe"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Add Manually
                </Link>
              </div>
            </div>
          ) : (
            recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">
                    {recipe.recipe_name}
                  </h3>
                  {recipe.image && (
                    <div className="flex-shrink-0">
                      <img
                        src={recipe.image}
                        alt={recipe.recipe_name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  {recipe.prep_time_minutes && (
                    <span>Prep: {recipe.prep_time_minutes} min</span>
                  )}
                  {recipe.cook_time_minutes && (
                    <span>Cook: {recipe.cook_time_minutes} min</span>
                  )}
                  {recipe.servings && (
                    <span>Serves: {recipe.servings}</span>
                  )}
                </div>
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {recipe.ingredients.length} ingredients
                  </p>
                )}
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}



