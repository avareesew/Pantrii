'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { GenreOfFood, TypeOfDish, MethodOfCooking, GENRE_OF_FOOD_OPTIONS, TYPE_OF_DISH_OPTIONS, METHOD_OF_COOKING_OPTIONS, isValidGenreOfFood, validateTypeOfDishArray, isValidMethodOfCooking } from '@/lib/recipeTaxonomy';

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
  nutrition_ai_estimated?: boolean;
  nutrition_servings_used?: number | null;
  made_before: boolean;
  genreOfFood: string | null;
  typeOfDish: string[] | null;
  methodOfCooking: string | null;
  image: string | null;
  userNotes: string | null;
  authorsNotes: string | null;
  originalFile: string | null;
  originalFileName: string | null;
  originalFileType: string | null;
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
  const [recipePhoto, setRecipePhoto] = useState<string | null>(null);
  const [showOriginalFile, setShowOriginalFile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
    made_before: false,
    genreOfFood: null as string | null,
    typeOfDish: [] as string[],
    methodOfCooking: null as string | null,
    userNotes: '',
  });
  const [typeOfDishSearch, setTypeOfDishSearch] = useState<string>('');

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
      setRecipe(data);
      setRecipePhoto(data.image || null);
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
          made_before: data.made_before || false,
          genreOfFood: data.genreOfFood || null,
          typeOfDish: Array.isArray(data.typeOfDish) ? data.typeOfDish : [],
          methodOfCooking: data.methodOfCooking || null,
          userNotes: data.userNotes || '',
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
          author: editForm.author || null,
          description: editForm.description || null,
          link: editForm.link || null,
          servings: editForm.servings ? parseInt(editForm.servings) : null,
          prep_time_minutes: editForm.prep_time_minutes ? parseInt(editForm.prep_time_minutes) : null,
          cook_time_minutes: editForm.cook_time_minutes ? parseInt(editForm.cook_time_minutes) : null,
          ingredients: editForm.ingredients,
          instructions: editForm.instructions,
          nutrition: editForm.nutrition,
          made_before: editForm.made_before,
          genreOfFood: editForm.genreOfFood || null,
          typeOfDish: editForm.typeOfDish.length > 0 ? validateTypeOfDishArray(editForm.typeOfDish) : null,
          methodOfCooking: editForm.methodOfCooking || null,
          image: recipePhoto || null,
          userNotes: editForm.userNotes || null,
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

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB for photos)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Photo is too large. Maximum size is 5MB.');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setRecipePhoto(result);
      };
      reader.onerror = () => {
        setError('Failed to read photo file');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process photo');
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

          <div className="flex items-start justify-between mb-6 gap-4">
            <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={editForm.recipe_name}
                onChange={(e) => setEditForm({ ...editForm, recipe_name: e.target.value })}
                  className="text-3xl font-bold text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Recipe Name"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900">{recipe.recipe_name}</h1>
            )}
            </div>
            {(editing ? recipePhoto : recipe.image) && (
              <div className="flex-shrink-0">
                <img
                  src={(editing ? recipePhoto : recipe.image) || ''}
                  alt={recipe.recipe_name}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
                {editing && (
                  <div className="mt-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="block w-full text-xs text-gray-500
                        file:mr-2 file:py-1 file:px-2
                        file:rounded file:border-0
                        file:text-xs file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-700"
                    />
                    {recipePhoto && (
                      <button
                        onClick={() => {
                          setRecipePhoto(null);
                          if (photoInputRef.current) {
                            photoInputRef.current.value = '';
                          }
                        }}
                        className="mt-1 text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {editing && !recipePhoto && !recipe.image && (
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Photo
                </label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="block w-full text-xs text-gray-500
                    file:mr-2 file:py-1 file:px-2
                    file:rounded file:border-0
                    file:text-xs file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700"
                />
              </div>
            )}
            
            {/* Original Document Button */}
            {recipe.originalFile && (
              <div className="mt-6">
                <button
                  onClick={() => setShowOriginalFile(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Original Document
                </button>
              </div>
            )}

            {/* Original Document Modal */}
            {showOriginalFile && recipe.originalFile && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowOriginalFile(false)}>
                <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {recipe.originalFileName || 'Original Document'}
                    </h3>
                    <button
                      onClick={() => setShowOriginalFile(false)}
                      className="text-gray-500 hover:text-gray-700"
                      title="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6">
                    {recipe.originalFileType?.includes('pdf') ? (
                      <iframe
                        src={recipe.originalFile}
                        className="w-full h-[calc(90vh-120px)] border border-gray-300 rounded-lg"
                        title="Original PDF"
                      />
                    ) : (
                      <img
                        src={recipe.originalFile}
                        alt="Original recipe document"
                        className="w-full h-auto border border-gray-300 rounded-lg object-contain max-h-[calc(90vh-120px)] mx-auto"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 flex-shrink-0">
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
                      setRecipePhoto(recipe.image || null);
                      if (photoInputRef.current) {
                        photoInputRef.current.value = '';
                      }
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
                  made_before: recipe.made_before || false,
                  genreOfFood: recipe.genreOfFood || null,
                  typeOfDish: Array.isArray(recipe.typeOfDish) ? recipe.typeOfDish : [],
                  methodOfCooking: recipe.methodOfCooking || null,
                  userNotes: recipe.userNotes || '',
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

          {/* Author, Description, Link - Show missing indicators */}
          {!editing && (
            <div className="mb-6 space-y-2">
              {/* Author */}
              {recipe.author ? (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Author:</span> {recipe.author}
                </div>
              ) : (
                <div className="text-sm text-amber-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Author: Missing</span>
                </div>
              )}

              {/* Description */}
              {recipe.description ? (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Description:</span> {recipe.description}
                </div>
              ) : (
                <div className="text-sm text-amber-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Description: Missing</span>
                </div>
              )}

              {/* Link */}
              {recipe.link ? (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Source:</span>{' '}
                  <a href={recipe.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {recipe.link}
                  </a>
                </div>
              ) : (
                <div className="text-sm text-amber-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Source Link: Missing</span>
                </div>
              )}
            </div>
          )}

          {/* Edit mode fields for author, description, link */}
          {editing && (
            <div className="mb-6 space-y-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                    <input
                      type="text"
                      value={editForm.author}
                      onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                  placeholder="Recipe author (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Recipe description (optional)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Link
                </label>
                    <input
                      type="url"
                      value={editForm.link}
                      onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  placeholder="https://example.com/recipe (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre of Food
                </label>
                <select
                  value={editForm.genreOfFood || ''}
                  onChange={(e) => setEditForm({ ...editForm, genreOfFood: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a genre...</option>
                  {GENRE_OF_FOOD_OPTIONS.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
            </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Dish <span className="text-xs text-gray-500">(Select 1-3)</span>
                  {editForm.typeOfDish.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({editForm.typeOfDish.length}/3 selected)
                    </span>
                  )}
                </label>
                
                {/* Search Input */}
                  <input
                  type="text"
                  value={typeOfDishSearch}
                  onChange={(e) => setTypeOfDishSearch(e.target.value)}
                  placeholder="Search for a dish type..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                />
                
                {/* Selected Items */}
                {editForm.typeOfDish.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editForm.typeOfDish.map((selected) => (
                      <span
                        key={selected}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {selected}
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({ ...editForm, typeOfDish: editForm.typeOfDish.filter((t) => t !== selected) });
                          }}
                          className="text-green-600 hover:text-green-800 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Filtered Options */}
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {TYPE_OF_DISH_OPTIONS
                    .filter((dishType) => 
                      dishType.toLowerCase().includes(typeOfDishSearch.toLowerCase()) &&
                      !editForm.typeOfDish.includes(dishType)
                    )
                    .map((dishType) => {
                      const isDisabled = editForm.typeOfDish.length >= 3;
                      return (
                        <button
                          key={dishType}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (editForm.typeOfDish.length < 3) {
                              setEditForm({ ...editForm, typeOfDish: [...editForm.typeOfDish, dishType] });
                              setTypeOfDishSearch('');
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded mb-1 transition-colors text-sm ${
                            isDisabled
                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-800'
                          }`}
                        >
                          {dishType}
                        </button>
                      );
                    })}
                  {TYPE_OF_DISH_OPTIONS.filter((dishType) => 
                    dishType.toLowerCase().includes(typeOfDishSearch.toLowerCase()) &&
                    !editForm.typeOfDish.includes(dishType)
                  ).length === 0 && typeOfDishSearch && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No matching options found
                    </p>
                  )}
                </div>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method of Cooking
                </label>
                <select
                  value={editForm.methodOfCooking || ''}
                  onChange={(e) => setEditForm({ ...editForm, methodOfCooking: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a method...</option>
                  {METHOD_OF_COOKING_OPTIONS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Have you made this recipe before?
                </label>
                <div className="flex gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, made_before: true })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      editForm.made_before === true
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, made_before: false })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      editForm.made_before === false
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display taxonomy and made_before status when not editing */}
          {!editing && (
            <div className="mb-6 space-y-2">
              {recipe.genreOfFood && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Genre:</span> {recipe.genreOfFood}
          </div>
              )}
              {!recipe.genreOfFood && (
                <div className="text-sm text-amber-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Genre: Missing</span>
                </div>
              )}
              {recipe.typeOfDish && recipe.typeOfDish.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Type:</span> {recipe.typeOfDish.join(', ')}
                </div>
              )}
              {(!recipe.typeOfDish || recipe.typeOfDish.length === 0) && (
                <div className="text-sm text-amber-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Type: Missing</span>
                </div>
              )}
              {recipe.methodOfCooking && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Method:</span> {recipe.methodOfCooking}
                </div>
              )}
              {!recipe.methodOfCooking && (
                <div className="text-sm text-amber-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Method: Missing</span>
                </div>
              )}
              <div className="text-sm text-gray-600">
                <span className="font-medium">Made before:</span>{' '}
                <span className={recipe.made_before ? 'text-green-600' : 'text-gray-500'}>
                  {recipe.made_before ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          )}

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
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">Nutrition</h2>
                    {recipe.nutrition_ai_estimated && (
                      <span className="text-xs text-gray-500 italic">
                        AI-estimated
                      </span>
                    )}
                  </div>
                  {recipe.nutrition_ai_estimated && recipe.nutrition_servings_used && (
                    <p className="text-xs text-gray-500 mb-3">
                      Values are per serving. Calculated using {recipe.nutrition_servings_used} {recipe.nutrition_servings_used === 1 ? 'serving' : 'servings'}.
                      {recipe.servings && String(recipe.servings).includes('-') && (
                        <span> (Recipe indicates {recipe.servings} servings)</span>
                      )}
                    </p>
                  )}
                  {!recipe.nutrition_ai_estimated && recipe.servings && (
                    <p className="text-xs text-gray-500 mb-3">
                      Values are per serving
                    </p>
                  )}
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

          {/* Author's Notes - Read-only, extracted by AI */}
          {recipe.authorsNotes && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Author's Notes</h3>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-gray-700 whitespace-pre-wrap">{recipe.authorsNotes}</p>
              </div>
            </div>
          )}

          {/* User Notes - Always at the bottom */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Notes</h3>
            {editing ? (
              <textarea
                value={editForm.userNotes}
                onChange={(e) => setEditForm({ ...editForm, userNotes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Add your personal notes about this recipe..."
                rows={6}
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                {recipe.userNotes ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{recipe.userNotes}</p>
                ) : (
                  <p className="text-gray-400 italic">No notes yet. Click Edit to add your personal notes about this recipe.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
