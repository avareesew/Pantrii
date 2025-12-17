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
  author: string | null;
  description: string | null;
  link: string | null;
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
  const [ingredientTexts, setIngredientTexts] = useState<{ [key: number]: string }>({});
  const instructionTextareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});

  // Auto-resize instruction textareas when they're rendered or content changes
  useEffect(() => {
    if (editing && editForm) {
      editForm.instructions.forEach((_, index) => {
        const textarea = instructionTextareaRefs.current[index];
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      });
    }
  }, [editing, editForm?.instructions]);

  const [editForm, setEditForm] = useState({
    recipe_name: '',
    author: '',
    description: '',
    link: '',
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
        author: data.author || '',
        description: data.description || '',
        link: data.link || '',
        servings: data.servings?.toString() || '',
        prep_time_minutes: data.prep_time_minutes?.toString() || '',
        cook_time_minutes: data.cook_time_minutes?.toString() || '',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions: Array.isArray(data.instructions) ? data.instructions : [],
        nutrition: data.nutrition,
      });
      // Initialize ingredient texts for editing
      const initialTexts: { [key: number]: string } = {};
      (Array.isArray(data.ingredients) ? data.ingredients : []).forEach((ing, idx) => {
        initialTexts[idx] = formatIngredient(ing);
      });
      setIngredientTexts(initialTexts);
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
          author: editForm.author || null,
          description: editForm.description || null,
          link: editForm.link || null,
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

  // Helper function to format ingredient object into a single string
  const formatIngredient = (ingredient: Ingredient): string => {
    const parts: string[] = [];
    if (ingredient.quantity) parts.push(ingredient.quantity);
    if (ingredient.unit) parts.push(ingredient.unit);
    if (ingredient.item) parts.push(ingredient.item);
    if (ingredient.notes) parts.push(`(${ingredient.notes})`);
    return parts.join(' ');
  };

  // Helper function to parse ingredient string back into object
  const parseIngredient = (text: string): Ingredient => {
    // Simple parsing: try to extract notes in parentheses, then split the rest
    const notesMatch = text.match(/\(([^)]+)\)/);
    const notes = notesMatch ? notesMatch[1] : '';
    const withoutNotes = text.replace(/\([^)]+\)/g, '').trim();
    
    // Split by spaces and try to identify quantity, unit, and item
    const parts = withoutNotes.split(/\s+/).filter(p => p);
    
    if (parts.length === 0) {
      return { quantity: '', unit: '', item: '', notes };
    }
    
    // If it's just one or two words, treat as item
    if (parts.length <= 2) {
      return { quantity: '', unit: '', item: parts.join(' '), notes };
    }
    
    // Try to parse: first part might be quantity, second might be unit, rest is item
    const quantity = parts[0];
    const unit = parts[1];
    const item = parts.slice(2).join(' ');
    
    return { quantity, unit, item, notes };
  };

  const addIngredient = () => {
    const newIndex = editForm.ingredients.length;
    setEditForm({
      ...editForm,
      ingredients: [...editForm.ingredients, { quantity: '', unit: '', item: '', notes: '' }],
    });
    // Initialize the text for the new ingredient
    setIngredientTexts({ ...ingredientTexts, [newIndex]: '' });
  };

  const updateIngredient = (index: number, text: string) => {
    // Store the raw text for editing (preserves cursor position)
    setIngredientTexts({ ...ingredientTexts, [index]: text });
  };

  const handleIngredientBlur = (index: number) => {
    // Parse the ingredient when user finishes editing (on blur)
    const text = ingredientTexts[index] !== undefined 
      ? ingredientTexts[index] 
      : formatIngredient(editForm.ingredients[index]);
    const updated = [...editForm.ingredients];
    updated[index] = parseIngredient(text);
    setEditForm({ ...editForm, ingredients: updated });
    // Update the stored text to match the parsed format
    setIngredientTexts({ ...ingredientTexts, [index]: formatIngredient(updated[index]) });
  };

  const removeIngredient = (index: number) => {
    setEditForm({
      ...editForm,
      ingredients: editForm.ingredients.filter((_, i) => i !== index),
    });
    // Remove the text entry and reindex remaining entries
    const newTexts: { [key: number]: string } = {};
    editForm.ingredients.forEach((_, i) => {
      if (i < index && ingredientTexts[i] !== undefined) {
        newTexts[i] = ingredientTexts[i];
      } else if (i > index && ingredientTexts[i] !== undefined) {
        newTexts[i - 1] = ingredientTexts[i];
      }
    });
    setIngredientTexts(newTexts);
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
                        author: recipe.author || '',
                        description: recipe.description || '',
                        link: recipe.link || '',
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

          {/* Author, Description, Link */}
          {(recipe.author || recipe.description || recipe.link || editing) && (
            <div className="mb-6 space-y-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                    <input
                      type="text"
                      value={editForm.author}
                      onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      placeholder="Recipe author"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Recipe description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                    <input
                      type="url"
                      value={editForm.link}
                      onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                      placeholder="https://example.com/recipe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  {recipe.author && (
                    <p className="text-gray-600">
                      <span className="font-medium">Author:</span> {recipe.author}
                    </p>
                  )}
                  {recipe.description && (
                    <p className="text-gray-700">{recipe.description}</p>
                  )}
                  {recipe.link && (
                    <p className="text-gray-600">
                      <span className="font-medium">Source:</span>{' '}
                      <a
                        href={recipe.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 underline"
                      >
                        {recipe.link}
                      </a>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
            {editing ? (
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={editForm.prep_time_minutes}
                    onChange={(e) => setEditForm({ ...editForm, prep_time_minutes: e.target.value })}
                    placeholder="Prep time"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (min)</label>
                  <input
                    type="number"
                    value={editForm.cook_time_minutes}
                    onChange={(e) => setEditForm({ ...editForm, cook_time_minutes: e.target.value })}
                    placeholder="Cook time"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                  <input
                    type="number"
                    value={editForm.servings}
                    onChange={(e) => setEditForm({ ...editForm, servings: e.target.value })}
                    placeholder="Servings"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                  />
                </div>
              </div>
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
                  {editForm.ingredients.map((ingredient, index) => {
                    // Use stored text if available, otherwise format the ingredient
                    const displayValue = ingredientTexts[index] !== undefined 
                      ? ingredientTexts[index] 
                      : formatIngredient(ingredient);
                    
                    return (
                      <div key={index} className="flex gap-2 items-start">
                        <input
                          type="text"
                          value={displayValue}
                          onChange={(e) => updateIngredient(index, e.target.value)}
                          onBlur={() => handleIngredientBlur(index)}
                          placeholder="e.g., 1 cup flour or 2 tablespoons butter, melted"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          onClick={() => removeIngredient(index)}
                          className="text-red-600 hover:text-red-700 px-2 py-2"
                          title="Remove ingredient"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
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
                        ref={(el) => {
                          instructionTextareaRefs.current[index] = el;
                          if (el) {
                            // Initialize height
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }
                        }}
                        value={instruction.text}
                        onChange={(e) => {
                          updateInstruction(index, e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onInput={(e) => {
                          // Auto-resize on input
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        rows={1}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm resize-none overflow-hidden"
                        placeholder="Instruction text..."
                        style={{ minHeight: '2rem' }}
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

              {/* Nutrition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Nutrition
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Calories</label>
                    <input
                      type="number"
                      value={editForm.nutrition?.calories || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        nutrition: {
                          ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                          calories: e.target.value ? parseInt(e.target.value) : null,
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={editForm.nutrition?.protein_g || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        nutrition: {
                          ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                          protein_g: e.target.value ? parseInt(e.target.value) : null,
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Fat (g)</label>
                    <input
                      type="number"
                      value={editForm.nutrition?.fat_g || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        nutrition: {
                          ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                          fat_g: e.target.value ? parseInt(e.target.value) : null,
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={editForm.nutrition?.carbs_g || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        nutrition: {
                          ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                          carbs_g: e.target.value ? parseInt(e.target.value) : null,
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
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
