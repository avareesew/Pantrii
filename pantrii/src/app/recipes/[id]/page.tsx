'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

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
  id: string;
  recipe_name: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutrition: Nutrition | null;
  createdAt: string;
  updatedAt: string;
}

export default function RecipePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [editForm, setEditForm] = useState({
    recipe_name: '',
    servings: '',
    prep_time_minutes: '',
    cook_time_minutes: '',
    ingredients: [] as Ingredient[],
    instructions: [] as Instruction[],
    nutrition: null as Nutrition | null,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchRecipe();
  }, [params.id, session, status]);

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${params.id}`);
      if (!response.ok) {
        throw new Error('Recipe not found');
      }
      const data = await response.json();
      setRecipe(data);
      setEditForm({
        recipe_name: data.recipe_name,
        servings: data.servings?.toString() || '',
        prep_time_minutes: data.prep_time_minutes?.toString() || '',
        cook_time_minutes: data.cook_time_minutes?.toString() || '',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions: Array.isArray(data.instructions) ? data.instructions : [],
        nutrition: data.nutrition,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/recipes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: editForm.recipe_name,
          servings: editForm.servings ? parseInt(editForm.servings) : null,
          prep_time_minutes: editForm.prep_time_minutes ? parseInt(editForm.prep_time_minutes) : null,
          cook_time_minutes: editForm.cook_time_minutes ? parseInt(editForm.cook_time_minutes) : null,
          ingredients: editForm.ingredients,
          instructions: editForm.instructions,
          nutrition: editForm.nutrition,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update recipe');
      }

      const updatedRecipe = await response.json();
      setRecipe(updatedRecipe);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
    }
  };

  const addIngredient = () => {
    setEditForm({
      ...editForm,
      ingredients: [...editForm.ingredients, { quantity: '', unit: '', item: '', notes: '' }],
    });
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...editForm.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setEditForm({ ...editForm, ingredients: updated });
  };

  const removeIngredient = (index: number) => {
    setEditForm({
      ...editForm,
      ingredients: editForm.ingredients.filter((_, i) => i !== index),
    });
  };

  const addInstruction = () => {
    setEditForm({
      ...editForm,
      instructions: [...editForm.instructions, { step_number: editForm.instructions.length + 1, text: '' }],
    });
  };

  const updateInstruction = (index: number, text: string) => {
    const updated = [...editForm.instructions];
    updated[index] = { ...updated[index], text };
    setEditForm({ ...editForm, instructions: updated });
  };

  const removeInstruction = (index: number) => {
    setEditForm({
      ...editForm,
      instructions: editForm.instructions.filter((_, i) => i !== index).map((inst, i) => ({
        ...inst,
        step_number: i + 1,
      })),
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Recipe not found</p>
          <Link href="/dashboard" className="text-green-600 hover:text-green-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image src="/logo-pantrii.svg" alt="Pantrii" width={120} height={28} />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Recipes
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                ✅ Recipe updated successfully!
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            {editing ? (
              <input
                type="text"
                value={editForm.recipe_name}
                onChange={(e) => setEditForm({ ...editForm, recipe_name: e.target.value })}
                className="text-3xl font-bold text-gray-900 flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Recipe Name"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900">{recipe.recipe_name}</h1>
            )}
            <div className="flex gap-2 ml-4">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditForm({
                        recipe_name: recipe.recipe_name,
                        servings: recipe.servings?.toString() || '',
                        prep_time_minutes: recipe.prep_time_minutes?.toString() || '',
                        cook_time_minutes: recipe.cook_time_minutes?.toString() || '',
                        ingredients: recipe.ingredients,
                        instructions: recipe.instructions,
                        nutrition: recipe.nutrition,
                      });
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
            {editing ? (
              <>
                <input
                  type="number"
                  value={editForm.prep_time_minutes}
                  onChange={(e) => setEditForm({ ...editForm, prep_time_minutes: e.target.value })}
                  placeholder="Prep time (min)"
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                />
                <input
                  type="number"
                  value={editForm.cook_time_minutes}
                  onChange={(e) => setEditForm({ ...editForm, cook_time_minutes: e.target.value })}
                  placeholder="Cook time (min)"
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                />
                <input
                  type="number"
                  value={editForm.servings}
                  onChange={(e) => setEditForm({ ...editForm, servings: e.target.value })}
                  placeholder="Servings"
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                />
              </>
            ) : (
              <>
                {recipe.prep_time_minutes && <span>Prep: {recipe.prep_time_minutes} min</span>}
                {recipe.cook_time_minutes && <span>Cook: {recipe.cook_time_minutes} min</span>}
                {recipe.servings && <span>Serves: {recipe.servings}</span>}
              </>
            )}
          </div>

          {editing ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Ingredients
                  </label>
                  <button
                    onClick={addIngredient}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    + Add Ingredient
                  </button>
                </div>
                <div className="space-y-2">
                  {editForm.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={ingredient.item}
                        onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                        placeholder="Item"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={ingredient.notes}
                        onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-32 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeIngredient(index)}
                        className="text-red-600 hover:text-red-700 px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Instructions
                  </label>
                  <button
                    onClick={addInstruction}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {editForm.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold mt-1">
                        {instruction.step_number}
                      </span>
                      <textarea
                        value={instruction.text}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        rows={2}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                        placeholder="Instruction text..."
                      />
                      <button
                        onClick={() => removeInstruction(index)}
                        className="text-red-600 hover:text-red-700 px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span className="text-gray-700">
                        {ingredient.quantity && `${ingredient.quantity} `}
                        {ingredient.unit && `${ingredient.unit} `}
                        {ingredient.item}
                        {ingredient.notes && ` (${ingredient.notes})`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
                <ol className="space-y-3">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                        {instruction.step_number || index + 1}
                      </span>
                      <span className="text-gray-700">{instruction.text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {recipe.nutrition && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Nutrition</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {recipe.nutrition.calories !== null && (
                      <div>
                        <span className="text-gray-600">Calories:</span>
                        <span className="ml-2 font-medium">{recipe.nutrition.calories}</span>
                      </div>
                    )}
                    {recipe.nutrition.protein_g !== null && (
                      <div>
                        <span className="text-gray-600">Protein:</span>
                        <span className="ml-2 font-medium">{recipe.nutrition.protein_g}g</span>
                      </div>
                    )}
                    {recipe.nutrition.fat_g !== null && (
                      <div>
                        <span className="text-gray-600">Fat:</span>
                        <span className="ml-2 font-medium">{recipe.nutrition.fat_g}g</span>
                      </div>
                    )}
                    {recipe.nutrition.carbs_g !== null && (
                      <div>
                        <span className="text-gray-600">Carbs:</span>
                        <span className="ml-2 font-medium">{recipe.nutrition.carbs_g}g</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
