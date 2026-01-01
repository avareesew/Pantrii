'use client';

import { useState, useRef } from 'react';
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

export default function ManualRecipePage() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [recipePhoto, setRecipePhoto] = useState<string | null>(null);
  const [madeBefore, setMadeBefore] = useState<boolean | null>(null);
  const [genreOfFood, setGenreOfFood] = useState<string | null>(null);
  const [typeOfDish, setTypeOfDish] = useState<string[]>([]);
  const [typeOfDishSearch, setTypeOfDishSearch] = useState<string>('');
  const [methodOfCooking, setMethodOfCooking] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Form state - same structure as scan page
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

  const handleSaveRecipe = async () => {
    if (!editForm.recipe_name.trim()) {
      setError('Recipe name is required');
      return;
    }

    if (editForm.ingredients.length === 0) {
      setError('At least one ingredient is required');
      return;
    }

    if (editForm.instructions.length === 0) {
      setError('At least one instruction step is required');
      return;
    }

    if (madeBefore === null) {
      setError('Please answer whether you have made this recipe before');
      return;
    }

    setIsSaving(true);
    setError(null);

    // Validate taxonomy fields
    const validatedGenreOfFood = genreOfFood && isValidGenreOfFood(genreOfFood) ? genreOfFood : null;
    const validatedTypeOfDish = typeOfDish.length > 0 ? validateTypeOfDishArray(typeOfDish) : null;
    const validatedMethodOfCooking = methodOfCooking && isValidMethodOfCooking(methodOfCooking) ? methodOfCooking : null;

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: editForm.recipe_name.trim(),
          author: editForm.author.trim() || null,
          description: editForm.description.trim() || null,
          link: editForm.link.trim() || null,
          servings: editForm.servings ? parseInt(editForm.servings) : null,
          prep_time_minutes: editForm.prep_time_minutes ? parseInt(editForm.prep_time_minutes) : null,
          cook_time_minutes: editForm.cook_time_minutes ? parseInt(editForm.cook_time_minutes) : null,
          ingredients: editForm.ingredients,
          instructions: editForm.instructions,
          nutrition: editForm.nutrition,
          fileHash: null,
          image: recipePhoto || null,
          made_before: madeBefore,
          genreOfFood: validatedGenreOfFood,
          typeOfDish: validatedTypeOfDish,
          methodOfCooking: validatedMethodOfCooking,
          userNotes: userNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }

      setSaved(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image src="/logo-pantrii.svg" alt="Pantrii" width={120} height={28} />
            </Link>
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Add Recipe Manually
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your recipe details below.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                ✅ Recipe saved successfully! Redirecting to dashboard...
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Recipe Photo Upload */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipe Photo (Optional)
              </label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={isSaving}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-800 file:text-white
                  hover:file:bg-green-900
                  disabled:opacity-50"
              />
              <div className="text-xs text-gray-500 mt-1">
                Upload a photo of your finished dish (JPEG, PNG - max 5MB)
              </div>
              {recipePhoto && (
                <div className="mt-3">
                  <img
                    src={recipePhoto}
                    alt="Recipe preview"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => {
                      setRecipePhoto(null);
                      if (photoInputRef.current) {
                        photoInputRef.current.value = '';
                      }
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.recipe_name}
                    onChange={(e) => setEditForm({ ...editForm, recipe_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-2xl font-bold"
                    placeholder="Recipe Name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Author name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Recipe description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Link
                  </label>
                  <input
                    type="url"
                    value={editForm.link}
                    onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="https://..."
                  />
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prep Time (min)
                    </label>
                    <input
                      type="number"
                      value={editForm.prep_time_minutes}
                      onChange={(e) => setEditForm({ ...editForm, prep_time_minutes: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Prep time"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cook Time (min)
                    </label>
                    <input
                      type="number"
                      value={editForm.cook_time_minutes}
                      onChange={(e) => setEditForm({ ...editForm, cook_time_minutes: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Cook time"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servings
                    </label>
                    <input
                      type="number"
                      value={editForm.servings}
                      onChange={(e) => setEditForm({ ...editForm, servings: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Servings"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Ingredients
                </h3>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                >
                  + Add Ingredient
                </button>
              </div>
              <div className="space-y-3">
                {editForm.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        placeholder="Quantity"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                      <input
                        type="text"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                      <input
                        type="text"
                        value={ingredient.item}
                        onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                        placeholder="Item"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                      <input
                        type="text"
                        value={ingredient.notes}
                        onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-red-600 hover:text-red-800 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {editForm.ingredients.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No ingredients added yet. Click "Add Ingredient" to get started.</p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Instructions
                </h3>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                >
                  + Add Step
                </button>
              </div>
              <div className="space-y-3">
                {editForm.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                      {instruction.step_number || index + 1}
                    </span>
                    <textarea
                      value={instruction.text}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder={`Step ${index + 1}...`}
                      rows={2}
                    />
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="text-red-600 hover:text-red-800 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {editForm.instructions.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No instructions added yet. Click "Add Step" to get started.</p>
                )}
              </div>
            </div>

            {/* Nutrition */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Nutrition (Optional)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Calories</label>
                  <input
                    type="number"
                    value={editForm.nutrition?.calories ?? ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      nutrition: {
                        ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                        calories: e.target.value ? parseFloat(e.target.value) : null,
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Calories"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={editForm.nutrition?.protein_g ?? ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      nutrition: {
                        ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                        protein_g: e.target.value ? parseFloat(e.target.value) : null,
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Protein"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={editForm.nutrition?.fat_g ?? ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      nutrition: {
                        ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                        fat_g: e.target.value ? parseFloat(e.target.value) : null,
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Fat"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={editForm.nutrition?.carbs_g ?? ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      nutrition: {
                        ...(editForm.nutrition || { calories: null, protein_g: null, fat_g: null, carbs_g: null }),
                        carbs_g: e.target.value ? parseFloat(e.target.value) : null,
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Carbs"
                  />
                </div>
              </div>
            </div>

            {/* Taxonomy Fields */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Taxonomy & Details</h3>
              
              {/* Genre of Food - Single Select */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Genre of Food <span className="text-xs font-normal text-gray-500">(Select one)</span>
                </h4>
                <select
                  value={genreOfFood || ''}
                  onChange={(e) => setGenreOfFood(e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a genre...</option>
                  {GENRE_OF_FOOD_OPTIONS.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type of Dish - Multi Select (1-3) with Search */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Type of Dish <span className="text-xs font-normal text-gray-500">(Select 1-3)</span>
                  {typeOfDish.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({typeOfDish.length}/3 selected)
                    </span>
                  )}
                </h4>
                
                {/* Search Input */}
                <input
                  type="text"
                  value={typeOfDishSearch}
                  onChange={(e) => setTypeOfDishSearch(e.target.value)}
                  placeholder="Search for a dish type..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
                />
                
                {/* Selected Items */}
                {typeOfDish.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {typeOfDish.map((selected) => (
                      <span
                        key={selected}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {selected}
                        <button
                          type="button"
                          onClick={() => {
                            setTypeOfDish(typeOfDish.filter((t) => t !== selected));
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
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {TYPE_OF_DISH_OPTIONS
                    .filter((dishType) => 
                      dishType.toLowerCase().includes(typeOfDishSearch.toLowerCase()) &&
                      !typeOfDish.includes(dishType)
                    )
                    .map((dishType) => {
                      const isDisabled = typeOfDish.length >= 3;
                      return (
                        <button
                          key={dishType}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (typeOfDish.length < 3) {
                              setTypeOfDish([...typeOfDish, dishType]);
                              setTypeOfDishSearch('');
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded mb-1 transition-colors ${
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
                    !typeOfDish.includes(dishType)
                  ).length === 0 && typeOfDishSearch && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No matching options found
                    </p>
                  )}
                </div>
              </div>

              {/* Method of Cooking - Single Select */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Method of Cooking <span className="text-xs font-normal text-gray-500">(Select one)</span>
                </h4>
                <select
                  value={methodOfCooking || ''}
                  onChange={(e) => setMethodOfCooking(e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a cooking method...</option>
                  {METHOD_OF_COOKING_OPTIONS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Made Before Question - Always Editable */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Have you made this recipe before? <span className="text-sm font-normal text-red-600">*</span>
              </h3>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setMadeBefore(true)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    madeBefore === true
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setMadeBefore(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    madeBefore === false
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  No
                </button>
              </div>
              {madeBefore === null && (
                <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Please answer this question before saving</span>
                </p>
              )}
            </div>

            {/* User Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Notes</h3>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Add your personal notes about this recipe..."
                rows={6}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {saved ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1">
                  <p className="text-green-800 text-sm">
                    ✅ Recipe saved successfully! Redirecting to dashboard...
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleSaveRecipe}
                    disabled={isSaving || madeBefore === null}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Recipe'}
                  </button>
                  <Link
                    href="/dashboard"
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
