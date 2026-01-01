'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface RecipeData {
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
  genreOfFood?: string | null;
  typeOfDish?: string[] | null;
  methodOfCooking?: string | null;
  authorsNotes?: string | null;
}

interface ProcessedRecipe {
  id: string;
  filename: string;
  originalName: string;
  fileHash?: string;
  recipeData: RecipeData;
  editForm: {
    recipe_name: string;
    author: string;
    description: string;
    link: string;
    servings: string;
    prep_time_minutes: string;
    cook_time_minutes: string;
    ingredients: Ingredient[];
    instructions: Instruction[];
    nutrition: Nutrition | null;
  };
  recipePhoto: string | null;
  madeBefore: boolean | null;
  genreOfFood: string | null;
  typeOfDish: string[];
  methodOfCooking: string | null;
  userNotes: string;
  originalFile: string | null;
  originalFileName: string | null;
  originalFileType: string | null;
  saved: boolean;
  error: string | null;
}

export default function BulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, filename: '' });
  const [recipes, setRecipes] = useState<ProcessedRecipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length, filename: '' });
    setRecipes([]); // Clear existing recipes
    setCurrentIndex(0); // Reset to first recipe

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress({ current: i + 1, total: files.length, filename: file.name });

      try {
        // Step 1: Upload file
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          const errorRecipe: ProcessedRecipe = {
            id: `recipe-${i}`,
            filename: file.name,
            originalName: file.name,
            recipeData: {
              recipe_name: file.name,
              author: null,
              description: null,
              link: null,
              servings: null,
              prep_time_minutes: null,
              cook_time_minutes: null,
              ingredients: [],
              instructions: [],
              nutrition: null,
            },
            editForm: {
              recipe_name: file.name,
              author: '',
              description: '',
              link: '',
              servings: '',
              prep_time_minutes: '',
              cook_time_minutes: '',
              ingredients: [],
              instructions: [],
              nutrition: null,
            },
            recipePhoto: null,
            madeBefore: null,
            genreOfFood: null,
            typeOfDish: [],
            methodOfCooking: null,
            userNotes: '',
            originalFile: null,
            originalFileName: null,
            originalFileType: null,
            saved: false,
            error: errorData.error || 'Upload failed',
          };
          // Add recipe to state immediately
          setRecipes(prev => [...prev, errorRecipe]);
          // Set to first recipe if this is the first one
          if (i === 0) {
            setCurrentIndex(0);
          }
          continue;
        }

        const uploadData = await uploadResponse.json();
        
        // Store original file from upload
        const originalFileFromUpload = uploadData.base64 || null;
        const originalFileNameFromUpload = uploadData.originalName || uploadData.filename || file.name;
        const originalFileTypeFromUpload = uploadData.type || '';

        // Step 2: Scan file
        const scanResponse = await fetch('/api/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: uploadData.filename,
            filepath: uploadData.filepath,
            debug: false,
          }),
        });

        if (!scanResponse.ok) {
          const errorData = await scanResponse.json();
          const errorRecipe: ProcessedRecipe = {
            id: `recipe-${i}`,
            filename: uploadData.filename,
            originalName: file.name,
            fileHash: uploadData.fileHash,
            recipeData: {
              recipe_name: file.name,
              author: null,
              description: null,
              link: null,
              servings: null,
              prep_time_minutes: null,
              cook_time_minutes: null,
              ingredients: [],
              instructions: [],
              nutrition: null,
            },
            editForm: {
              recipe_name: file.name,
              author: '',
              description: '',
              link: '',
              servings: '',
              prep_time_minutes: '',
              cook_time_minutes: '',
              ingredients: [],
              instructions: [],
              nutrition: null,
            },
            recipePhoto: null,
            madeBefore: null,
            genreOfFood: null,
            typeOfDish: [],
            methodOfCooking: null,
            userNotes: '',
            originalFile: originalFileFromUpload || null,
            originalFileName: originalFileNameFromUpload || null,
            originalFileType: originalFileTypeFromUpload || null,
            saved: false,
            error: errorData.error || errorData.message || 'Scan failed',
          };
          // Add recipe to state immediately
          setRecipes(prev => [...prev, errorRecipe]);
          // Set to first recipe if this is the first one
          if (i === 0) {
            setCurrentIndex(0);
          }
          continue;
        }

        const scanData = await scanResponse.json();

        // Initialize form from scan result
        const recipeData = scanData.recipeData;
        // Use original file from scan result if available, otherwise use from upload
        const originalFile = scanData.originalFile || originalFileFromUpload;
        const originalFileName = scanData.originalFileName || originalFileNameFromUpload;
        const originalFileType = scanData.originalFileType || originalFileTypeFromUpload;
        
        const newRecipe: ProcessedRecipe = {
          id: `recipe-${i}`,
          filename: uploadData.filename,
          originalName: file.name,
          fileHash: scanData.fileHash,
          recipeData: recipeData,
          editForm: {
            recipe_name: recipeData.recipe_name || '',
            author: recipeData.author || '',
            description: recipeData.description || '',
            link: recipeData.link || '',
            servings: recipeData.servings?.toString() || '',
            prep_time_minutes: recipeData.prep_time_minutes?.toString() || '',
            cook_time_minutes: recipeData.cook_time_minutes?.toString() || '',
            ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
            instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
            nutrition: recipeData.nutrition || null,
          },
          recipePhoto: null,
          madeBefore: null,
          genreOfFood: recipeData.genreOfFood && isValidGenreOfFood(recipeData.genreOfFood) ? recipeData.genreOfFood : null,
          typeOfDish: Array.isArray(recipeData.typeOfDish) && recipeData.typeOfDish.length > 0
            ? validateTypeOfDishArray(recipeData.typeOfDish)
            : [],
          methodOfCooking: recipeData.methodOfCooking && isValidMethodOfCooking(recipeData.methodOfCooking) ? recipeData.methodOfCooking : null,
          userNotes: '',
          originalFile: originalFile || null,
          originalFileName: originalFileName || null,
          originalFileType: originalFileType || null,
          saved: false,
          error: null,
        };
        
        // Add recipe to state immediately
        setRecipes(prev => [...prev, newRecipe]);
        // Set to first recipe if this is the first one
        if (i === 0) {
          setCurrentIndex(0);
        }
      } catch (err) {
        const errorRecipe: ProcessedRecipe = {
          id: `recipe-${i}`,
          filename: file.name,
          originalName: file.name,
          recipeData: {
            recipe_name: file.name,
            author: null,
            description: null,
            link: null,
            servings: null,
            prep_time_minutes: null,
            cook_time_minutes: null,
            ingredients: [],
            instructions: [],
            nutrition: null,
          },
          editForm: {
            recipe_name: file.name,
            author: '',
            description: '',
            link: '',
            servings: '',
            prep_time_minutes: '',
            cook_time_minutes: '',
            ingredients: [],
            instructions: [],
            nutrition: null,
          },
          recipePhoto: null,
          madeBefore: null,
          genreOfFood: null,
          typeOfDish: [],
          methodOfCooking: null,
          userNotes: '',
          originalFile: null,
          originalFileName: null,
          originalFileType: null,
          saved: false,
          error: err instanceof Error ? err.message : 'Processing failed',
        };
        // Add recipe to state immediately
        setRecipes(prev => [...prev, errorRecipe]);
        // Set to first recipe if this is the first one
        if (i === 0) {
          setCurrentIndex(0);
        }
      }
    }

    // Processing complete
    setIsProcessing(false);
  };

  const updateRecipe = (index: number, updates: Partial<ProcessedRecipe>) => {
    setRecipes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const addIngredient = (recipeIndex: number) => {
    const recipe = recipes[recipeIndex];
    updateRecipe(recipeIndex, {
      editForm: {
        ...recipe.editForm,
        ingredients: [...recipe.editForm.ingredients, { quantity: '', unit: '', item: '', notes: '' }],
      },
    });
  };

  const updateIngredient = (recipeIndex: number, ingredientIndex: number, field: keyof Ingredient, value: string) => {
    const recipe = recipes[recipeIndex];
    const updated = [...recipe.editForm.ingredients];
    updated[ingredientIndex] = { ...updated[ingredientIndex], [field]: value };
    updateRecipe(recipeIndex, {
      editForm: { ...recipe.editForm, ingredients: updated },
    });
  };

  const removeIngredient = (recipeIndex: number, ingredientIndex: number) => {
    const recipe = recipes[recipeIndex];
    updateRecipe(recipeIndex, {
      editForm: {
        ...recipe.editForm,
        ingredients: recipe.editForm.ingredients.filter((_, i) => i !== ingredientIndex),
      },
    });
  };

  const addInstruction = (recipeIndex: number) => {
    const recipe = recipes[recipeIndex];
    updateRecipe(recipeIndex, {
      editForm: {
        ...recipe.editForm,
        instructions: [...recipe.editForm.instructions, { step_number: recipe.editForm.instructions.length + 1, text: '' }],
      },
    });
  };

  const updateInstruction = (recipeIndex: number, instructionIndex: number, text: string) => {
    const recipe = recipes[recipeIndex];
    const updated = [...recipe.editForm.instructions];
    updated[instructionIndex] = { ...updated[instructionIndex], text };
    updateRecipe(recipeIndex, {
      editForm: { ...recipe.editForm, instructions: updated },
    });
  };

  const removeInstruction = (recipeIndex: number, instructionIndex: number) => {
    const recipe = recipes[recipeIndex];
    updateRecipe(recipeIndex, {
      editForm: {
        ...recipe.editForm,
        instructions: recipe.editForm.instructions.filter((_, i) => i !== instructionIndex).map((inst, i) => ({
          ...inst,
          step_number: i + 1,
        })),
      },
    });
  };

  const handleSaveRecipe = async (recipeIndex: number) => {
    const recipe = recipes[recipeIndex];
    
    if (!recipe.editForm.recipe_name.trim()) {
      updateRecipe(recipeIndex, { error: 'Recipe name is required' });
      return;
    }

    if (recipe.madeBefore === null) {
      updateRecipe(recipeIndex, { error: 'Please answer whether you have made this recipe before' });
      return;
    }

    updateRecipe(recipeIndex, { error: null });

    const validatedGenreOfFood = recipe.genreOfFood && isValidGenreOfFood(recipe.genreOfFood) ? recipe.genreOfFood : null;
    const validatedTypeOfDish = recipe.typeOfDish.length > 0 ? validateTypeOfDishArray(recipe.typeOfDish) : null;
    const validatedMethodOfCooking = recipe.methodOfCooking && isValidMethodOfCooking(recipe.methodOfCooking) ? recipe.methodOfCooking : null;

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: recipe.editForm.recipe_name.trim(),
          author: recipe.editForm.author.trim() || null,
          description: recipe.editForm.description.trim() || null,
          link: recipe.editForm.link.trim() || null,
          servings: recipe.editForm.servings ? parseInt(recipe.editForm.servings) : null,
          prep_time_minutes: recipe.editForm.prep_time_minutes ? parseInt(recipe.editForm.prep_time_minutes) : null,
          cook_time_minutes: recipe.editForm.cook_time_minutes ? parseInt(recipe.editForm.cook_time_minutes) : null,
          ingredients: recipe.editForm.ingredients,
          instructions: recipe.editForm.instructions,
          nutrition: recipe.editForm.nutrition ? {
            ...recipe.editForm.nutrition,
            _ai_estimated: recipe.recipeData.nutrition_ai_estimated || false,
            _servings_used: recipe.recipeData.nutrition_servings_used || null,
          } : null,
          fileHash: recipe.fileHash || null,
          image: recipe.recipePhoto || null,
          made_before: recipe.madeBefore,
          genreOfFood: validatedGenreOfFood,
          typeOfDish: validatedTypeOfDish,
          methodOfCooking: validatedMethodOfCooking,
          userNotes: recipe.userNotes.trim() || null,
          originalFile: recipe.originalFile || null,
          originalFileName: recipe.originalFileName || null,
          originalFileType: recipe.originalFileType || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }

      updateRecipe(recipeIndex, { saved: true, error: null });
      setSavedCount(prev => prev + 1);
    } catch (err) {
      updateRecipe(recipeIndex, { error: err instanceof Error ? err.message : 'Failed to save recipe' });
    }
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    setSavedCount(0);
    
    for (let i = 0; i < recipes.length; i++) {
      if (!recipes[i].saved && !recipes[i].error) {
        await handleSaveRecipe(i);
      }
    }
    
    setIsSavingAll(false);
  };

  // Reset comparison view when switching recipes
  const handleRecipeChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
    setShowComparison(false);
  };

  const currentRecipe = recipes[currentIndex];
  const allSaved = recipes.length > 0 && recipes.every(r => r.saved);
  const hasUnsaved = recipes.some(r => !r.saved && !r.error);

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
              href="/scan" 
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Upload
            </Link>
          </div>
        </div>
      </header>

      <main className={`${showComparison && currentRecipe?.originalFile ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-4 py-12 transition-all duration-300`}>
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bulk Recipe Upload
          </h1>
          <p className="text-gray-600 mb-6">
            Upload multiple recipe files at once. You'll be able to review and edit each recipe before saving.
          </p>

          {!isProcessing && recipes.length === 0 && (
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-green-600 file:text-white
                    hover:file:bg-green-700"
                />
              </div>
              <div className="text-xs text-gray-500">
                Select multiple files: JPEG, PNG, PDF (max 10MB each)
              </div>
            </div>
          )}

          {isProcessing && recipes.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                Processing {processingProgress.current} of {processingProgress.total} files...
              </div>
              <div className="text-sm text-gray-600">
                Current file: {processingProgress.filename}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {recipes.length > 0 && (
            <>
              {/* Show processing status if still processing */}
              {isProcessing && (
                <div className="mb-6 space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-800 border-t-transparent"></div>
                    Processing {processingProgress.current} of {processingProgress.total} files...
                  </div>
                  <div className="text-sm text-gray-600">
                    Current file: {processingProgress.filename}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-800 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="mb-6 flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <button
                  onClick={() => handleRecipeChange(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {recipes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecipeChange(index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        index === currentIndex
                          ? 'bg-green-600 text-white'
                          : recipes[index].saved
                          ? 'bg-green-100 text-green-800'
                          : recipes[index].error
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => handleRecipeChange(Math.min(recipes.length - 1, currentIndex + 1))}
                  disabled={currentIndex === recipes.length - 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                Recipe {currentIndex + 1} of {recipes.length} • {savedCount} saved
              </div>

              {currentRecipe && (
                <div className="space-y-6">
                  {currentRecipe.error && !currentRecipe.saved && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm">{currentRecipe.error}</p>
                    </div>
                  )}

                  {currentRecipe.saved && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 text-sm">✅ Recipe saved successfully!</p>
                    </div>
                  )}

                  {/* Comparison mode toggle button */}
                  {currentRecipe.originalFile && !showComparison && (
                    <div className="mb-6">
                      <button
                        onClick={() => setShowComparison(true)}
                        className="bg-green-800 text-white px-6 py-3 rounded-lg hover:bg-green-900 font-medium flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        Want to compare the recipe to your upload?
                      </button>
                    </div>
                  )}

                  {/* Layout: Show PDF on left when comparison is enabled, otherwise just recipe */}
                  <div className={showComparison && currentRecipe.originalFile ? "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6" : ""}>
                    {/* Left side: Sticky original file display (only in comparison mode) */}
                    {showComparison && currentRecipe.originalFile && (
                      <div className="lg:sticky lg:top-4 lg:self-start">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Original Document</h3>
                            <button
                              onClick={() => setShowComparison(false)}
                              className="text-gray-500 hover:text-gray-700"
                              title="Close comparison view"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="space-y-4">
                            {currentRecipe.originalFileType?.includes('pdf') ? (
                              <iframe
                                src={currentRecipe.originalFile}
                                className="w-full h-[calc(100vh-200px)] border border-gray-300 rounded-lg"
                                title="Original PDF"
                              />
                            ) : (
                              <img
                                src={currentRecipe.originalFile}
                                alt="Original recipe document"
                                className="w-full h-auto border border-gray-300 rounded-lg object-contain max-h-[calc(100vh-200px)]"
                              />
                            )}
                            {currentRecipe.originalFileName && (
                              <p className="text-sm text-gray-500 text-center">
                                {currentRecipe.originalFileName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recipe details - Always shown */}
                    <div className="space-y-6">
                      {/* Recipe Editor - Same structure as scan page */}
                      <RecipeEditor
                        recipe={currentRecipe}
                        recipeIndex={currentIndex}
                        onUpdate={(updates) => updateRecipe(currentIndex, updates)}
                        onAddIngredient={() => addIngredient(currentIndex)}
                        onUpdateIngredient={(idx, field, value) => updateIngredient(currentIndex, idx, field, value)}
                        onRemoveIngredient={(idx) => removeIngredient(currentIndex, idx)}
                        onAddInstruction={() => addInstruction(currentIndex)}
                        onUpdateInstruction={(idx, text) => updateInstruction(currentIndex, idx, text)}
                        onRemoveInstruction={(idx) => removeInstruction(currentIndex, idx)}
                        onSave={() => handleSaveRecipe(currentIndex)}
                        isSaving={isSavingAll}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Save All Button */}
              {hasUnsaved && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSaveAll}
                    disabled={isSavingAll}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {isSavingAll ? `Saving... (${savedCount}/${recipes.length})` : `Save All Recipes (${recipes.length - savedCount} remaining)`}
                  </button>
                </div>
              )}

              {allSaved && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-800 text-sm font-medium">
                      ✅ All recipes saved successfully!
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Recipe Editor Component - Extracted for reusability
function RecipeEditor({
  recipe,
  recipeIndex,
  onUpdate,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
  onAddInstruction,
  onUpdateInstruction,
  onRemoveInstruction,
  onSave,
  isSaving,
}: {
  recipe: ProcessedRecipe;
  recipeIndex: number;
  onUpdate: (updates: Partial<ProcessedRecipe>) => void;
  onAddIngredient: () => void;
  onUpdateIngredient: (index: number, field: keyof Ingredient, value: string) => void;
  onRemoveIngredient: (index: number) => void;
  onAddInstruction: () => void;
  onUpdateInstruction: (index: number, text: string) => void;
  onRemoveInstruction: (index: number) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [typeOfDishSearch, setTypeOfDishSearch] = useState<string>('');
  
  // Track which sections are being edited
  const [editingSections, setEditingSections] = useState({
    basic: false,
    ingredients: false,
    instructions: false,
    nutrition: false,
    taxonomy: false,
  });

  const toggleSectionEdit = (section: keyof typeof editingSections) => {
    setEditingSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const cancelSectionEdit = (section: keyof typeof editingSections) => {
    // Reset form data for this section from recipe data
    if (section === 'basic') {
      onUpdate({
        editForm: {
          ...recipe.editForm,
          recipe_name: recipe.recipeData.recipe_name || '',
          author: recipe.recipeData.author || '',
          description: recipe.recipeData.description || '',
          link: recipe.recipeData.link || '',
          servings: recipe.recipeData.servings?.toString() || '',
          prep_time_minutes: recipe.recipeData.prep_time_minutes?.toString() || '',
          cook_time_minutes: recipe.recipeData.cook_time_minutes?.toString() || '',
        },
      });
    } else if (section === 'ingredients') {
      onUpdate({
        editForm: {
          ...recipe.editForm,
          ingredients: Array.isArray(recipe.recipeData.ingredients) ? recipe.recipeData.ingredients : [],
        },
      });
    } else if (section === 'instructions') {
      onUpdate({
        editForm: {
          ...recipe.editForm,
          instructions: Array.isArray(recipe.recipeData.instructions) ? recipe.recipeData.instructions : [],
        },
      });
    } else if (section === 'nutrition') {
      onUpdate({
        editForm: {
          ...recipe.editForm,
          nutrition: recipe.recipeData.nutrition || null,
        },
      });
    } else if (section === 'taxonomy') {
      onUpdate({
        genreOfFood: recipe.recipeData.genreOfFood && isValidGenreOfFood(recipe.recipeData.genreOfFood) ? recipe.recipeData.genreOfFood : null,
        typeOfDish: Array.isArray(recipe.recipeData.typeOfDish) && recipe.recipeData.typeOfDish.length > 0
          ? validateTypeOfDishArray(recipe.recipeData.typeOfDish)
          : [],
        methodOfCooking: recipe.recipeData.methodOfCooking && isValidMethodOfCooking(recipe.recipeData.methodOfCooking) ? recipe.recipeData.methodOfCooking : null,
      });
    }
    setEditingSections(prev => ({
      ...prev,
      [section]: false,
    }));
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onUpdate({ recipePhoto: result });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      // Handle error silently
    }
  };

  return (
    <>
      {/* Photo Upload */}
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
        {recipe.recipePhoto && (
          <div className="mt-3">
            <img
              src={recipe.recipePhoto}
              alt="Recipe preview"
              className="w-24 h-24 object-cover rounded-lg border border-gray-200"
            />
            <button
              onClick={() => onUpdate({ recipePhoto: null })}
              className="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Remove photo
            </button>
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          {!editingSections.basic ? (
            <button
              type="button"
              onClick={() => toggleSectionEdit('basic')}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleSectionEdit('basic')}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => cancelSectionEdit('basic')}
                className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {!editingSections.basic ? (
          // Read-only view
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{recipe.editForm.recipe_name || 'Untitled Recipe'}</h2>
            </div>
            
            {recipe.editForm.author ? (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Author:</span> {recipe.editForm.author}
              </div>
            ) : (
              <div className="text-sm text-amber-600 flex items-center gap-1">
                <span>⚠️</span>
                <span className="italic">Author: Missing</span>
              </div>
            )}

            {recipe.editForm.description ? (
              <div className="text-sm text-gray-700">
                <span className="font-medium">Description:</span> {recipe.editForm.description}
              </div>
            ) : (
              <div className="text-sm text-amber-600 flex items-center gap-1">
                <span>⚠️</span>
                <span className="italic">Description: Missing</span>
              </div>
            )}

            {recipe.recipeData.authorsNotes && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm font-medium text-gray-900 mb-2">Author's Notes</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{recipe.recipeData.authorsNotes}</p>
              </div>
            )}

            {recipe.editForm.link ? (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Source:</span>{' '}
                <a href={recipe.editForm.link} target="_blank" rel="noopener noreferrer" className="text-green-800 hover:text-green-900 hover:underline">
                  {recipe.editForm.link}
                </a>
              </div>
            ) : (
              <div className="text-sm text-amber-600 flex items-center gap-1">
                <span>⚠️</span>
                <span className="italic">Source Link: Missing</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {recipe.editForm.prep_time_minutes && <span>Prep: {recipe.editForm.prep_time_minutes} min</span>}
              {recipe.editForm.cook_time_minutes && <span>Cook: {recipe.editForm.cook_time_minutes} min</span>}
              {recipe.editForm.servings && <span>Serves: {recipe.editForm.servings}</span>}
            </div>
          </div>
        ) : (
          // Editable view
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Name *</label>
              <input
                type="text"
                value={recipe.editForm.recipe_name}
                onChange={(e) => onUpdate({ editForm: { ...recipe.editForm, recipe_name: e.target.value } })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-2xl font-bold"
                placeholder="Recipe Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
              <input
                type="text"
                value={recipe.editForm.author}
                onChange={(e) => onUpdate({ editForm: { ...recipe.editForm, author: e.target.value } })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Author name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={recipe.editForm.description}
                onChange={(e) => onUpdate({ editForm: { ...recipe.editForm, description: e.target.value } })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Recipe description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Link</label>
              <input
                type="url"
                value={recipe.editForm.link}
                onChange={(e) => onUpdate({ editForm: { ...recipe.editForm, link: e.target.value } })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://..."
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                <input
                  type="number"
                  value={recipe.editForm.prep_time_minutes}
                  onChange={(e) => onUpdate({ editForm: { ...recipe.editForm, prep_time_minutes: e.target.value } })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (min)</label>
                <input
                  type="number"
                  value={recipe.editForm.cook_time_minutes}
                  onChange={(e) => onUpdate({ editForm: { ...recipe.editForm, cook_time_minutes: e.target.value } })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                <input
                  type="number"
                  value={recipe.editForm.servings}
                  onChange={(e) => onUpdate({ editForm: { ...recipe.editForm, servings: e.target.value } })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
          {!editingSections.ingredients ? (
            <button
              type="button"
              onClick={() => toggleSectionEdit('ingredients')}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAddIngredient}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                + Add Ingredient
              </button>
              <button
                type="button"
                onClick={() => toggleSectionEdit('ingredients')}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => cancelSectionEdit('ingredients')}
                className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {!editingSections.ingredients ? (
          // Read-only view
          <ul className="space-y-2">
            {recipe.editForm.ingredients.length > 0 ? (
              recipe.editForm.ingredients.map((ingredient, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {ingredient.quantity && `${ingredient.quantity} `}
                  {ingredient.unit && `${ingredient.unit} `}
                  <span className="font-medium">{ingredient.item}</span>
                  {ingredient.notes && ` (${ingredient.notes})`}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500 italic">No ingredients</li>
            )}
          </ul>
        ) : (
          // Editable view
          <div className="space-y-3">
            {recipe.editForm.ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-4 gap-2">
                <input
                  type="text"
                  value={ingredient.quantity}
                  onChange={(e) => onUpdateIngredient(index, 'quantity', e.target.value)}
                  placeholder="Quantity"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <input
                  type="text"
                  value={ingredient.unit}
                  onChange={(e) => onUpdateIngredient(index, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <input
                  type="text"
                  value={ingredient.item}
                  onChange={(e) => onUpdateIngredient(index, 'item', e.target.value)}
                  placeholder="Item"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <input
                  type="text"
                  value={ingredient.notes}
                  onChange={(e) => onUpdateIngredient(index, 'notes', e.target.value)}
                  placeholder="Notes"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveIngredient(index)}
                className="text-red-600 hover:text-red-800 px-2"
              >
                ×
              </button>
            </div>
          ))}
          {recipe.editForm.ingredients.length === 0 && (
            <p className="text-sm text-gray-500 italic">No ingredients added yet. Click "Add Ingredient" to get started.</p>
          )}
        </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Instructions</h3>
          {!editingSections.instructions ? (
            <button
              type="button"
              onClick={() => toggleSectionEdit('instructions')}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAddInstruction}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                + Add Step
              </button>
              <button
                type="button"
                onClick={() => toggleSectionEdit('instructions')}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => cancelSectionEdit('instructions')}
                className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {!editingSections.instructions ? (
          // Read-only view
          <ol className="space-y-3">
            {recipe.editForm.instructions.length > 0 ? (
              recipe.editForm.instructions.map((instruction, index) => (
                <li key={index} className="text-sm text-gray-700">
                  <span className="font-medium">{instruction.step_number}.</span> {instruction.text}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500 italic">No instructions</li>
            )}
          </ol>
        ) : (
          // Editable view
          <div className="space-y-3">
            {recipe.editForm.instructions.map((instruction, index) => (
            <div key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                {instruction.step_number || index + 1}
              </span>
              <textarea
                value={instruction.text}
                onChange={(e) => onUpdateInstruction(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={2}
              />
              <button
                type="button"
                onClick={() => onRemoveInstruction(index)}
                className="text-red-600 hover:text-red-800 px-2"
              >
                ×
              </button>
            </div>
          ))}
          {recipe.editForm.instructions.length === 0 && (
            <p className="text-sm text-gray-500 italic">No instructions added yet.</p>
          )}
        </div>
        )}
      </div>

      {/* Nutrition */}
      {recipe.editForm.nutrition && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Nutrition</h3>
            {!editingSections.nutrition ? (
              <button
                type="button"
                onClick={() => toggleSectionEdit('nutrition')}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleSectionEdit('nutrition')}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => cancelSectionEdit('nutrition')}
                  className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {recipe.recipeData.nutrition_ai_estimated && recipe.recipeData.nutrition_servings_used && (
            <p className="text-xs text-gray-500 mb-3">
              Values are per serving. Calculated using {recipe.recipeData.nutrition_servings_used} {recipe.recipeData.nutrition_servings_used === 1 ? 'serving' : 'servings'}.
              {recipe.editForm.servings && String(recipe.editForm.servings).includes('-') && (
                <span> (Recipe indicates {recipe.editForm.servings} servings)</span>
              )}
            </p>
          )}
          {!recipe.recipeData.nutrition_ai_estimated && recipe.editForm.servings && (
            <p className="text-xs text-gray-500 mb-3">
              Values are per serving
            </p>
          )}
          
          {!editingSections.nutrition ? (
            // Read-only view
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {recipe.editForm.nutrition.calories !== null && (
                <div>
                  <span className="text-gray-600">Calories:</span>
                  <span className="ml-2 font-medium">{recipe.editForm.nutrition.calories}</span>
                </div>
              )}
              {recipe.editForm.nutrition.protein_g !== null && (
                <div>
                  <span className="text-gray-600">Protein:</span>
                  <span className="ml-2 font-medium">{recipe.editForm.nutrition.protein_g}g</span>
                </div>
              )}
              {recipe.editForm.nutrition.fat_g !== null && (
                <div>
                  <span className="text-gray-600">Fat:</span>
                  <span className="ml-2 font-medium">{recipe.editForm.nutrition.fat_g}g</span>
                </div>
              )}
              {recipe.editForm.nutrition.carbs_g !== null && (
                <div>
                  <span className="text-gray-600">Carbs:</span>
                  <span className="ml-2 font-medium">{recipe.editForm.nutrition.carbs_g}g</span>
                </div>
              )}
            </div>
          ) : (
            // Editable view
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Calories</label>
              <input
                type="number"
                value={recipe.editForm.nutrition.calories ?? ''}
                onChange={(e) => onUpdate({
                  editForm: {
                    ...recipe.editForm,
                    nutrition: {
                      ...recipe.editForm.nutrition!,
                      calories: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Protein (g)</label>
              <input
                type="number"
                value={recipe.editForm.nutrition.protein_g ?? ''}
                onChange={(e) => onUpdate({
                  editForm: {
                    ...recipe.editForm,
                    nutrition: {
                      ...recipe.editForm.nutrition!,
                      protein_g: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fat (g)</label>
              <input
                type="number"
                value={recipe.editForm.nutrition.fat_g ?? ''}
                onChange={(e) => onUpdate({
                  editForm: {
                    ...recipe.editForm,
                    nutrition: {
                      ...recipe.editForm.nutrition!,
                      fat_g: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={recipe.editForm.nutrition.carbs_g ?? ''}
                onChange={(e) => onUpdate({
                  editForm: {
                    ...recipe.editForm,
                    nutrition: {
                      ...recipe.editForm.nutrition!,
                      carbs_g: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          )}
        </div>
      )}

      {/* Taxonomy */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recipe Details</h3>
          {!editingSections.taxonomy ? (
            <button
              type="button"
              onClick={() => toggleSectionEdit('taxonomy')}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleSectionEdit('taxonomy')}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => cancelSectionEdit('taxonomy')}
                className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {!editingSections.taxonomy ? (
          // Read-only view
          <div className="space-y-4">
            {/* Genre of Food */}
            <div>
              <span className="text-sm font-medium text-gray-700">Genre of Food:</span>
              {recipe.genreOfFood ? (
                <div className="text-sm text-gray-600 mt-1">{recipe.genreOfFood}</div>
              ) : (
                <div className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Missing</span>
                </div>
              )}
            </div>

            {/* Type of Dish */}
            <div>
              <span className="text-sm font-medium text-gray-700">Type of Dish:</span>
              {recipe.typeOfDish.length > 0 ? (
                <div className="text-sm text-gray-600 mt-1">{recipe.typeOfDish.join(', ')}</div>
              ) : (
                <div className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Missing</span>
                </div>
              )}
            </div>

            {/* Method of Cooking */}
            <div>
              <span className="text-sm font-medium text-gray-700">Method of Cooking:</span>
              {recipe.methodOfCooking ? (
                <div className="text-sm text-gray-600 mt-1">{recipe.methodOfCooking}</div>
              ) : (
                <div className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span>
                  <span className="italic">Missing</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Editable view
          <div className="space-y-6">
            {/* Genre of Food - Single Select */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Genre of Food <span className="text-xs font-normal text-gray-500">(Select one)</span>
              </h4>
              <select
                value={recipe.genreOfFood || ''}
                onChange={(e) => onUpdate({ genreOfFood: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a genre...</option>
                {GENRE_OF_FOOD_OPTIONS.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {/* Type of Dish - Multi Select (1-3) with Search */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Type of Dish ({recipe.typeOfDish.length}/3) <span className="text-xs font-normal text-gray-500">(Select 1-3)</span>
              </h4>
              <input
                type="text"
                value={typeOfDishSearch}
                onChange={(e) => setTypeOfDishSearch(e.target.value)}
                placeholder="Search for a dish type..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
              />
              {recipe.typeOfDish.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {recipe.typeOfDish.map((selected) => (
                    <span
                      key={selected}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {selected}
                      <button
                        type="button"
                        onClick={() => onUpdate({ typeOfDish: recipe.typeOfDish.filter((t) => t !== selected) })}
                        className="text-green-600 hover:text-green-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {TYPE_OF_DISH_OPTIONS
                  .filter((dishType) => 
                    dishType.toLowerCase().includes(typeOfDishSearch.toLowerCase()) &&
                    !recipe.typeOfDish.includes(dishType)
                  )
                  .map((dishType) => {
                    const isDisabled = recipe.typeOfDish.length >= 3;
                    return (
                      <button
                        key={dishType}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (recipe.typeOfDish.length < 3) {
                            onUpdate({ typeOfDish: [...recipe.typeOfDish, dishType] });
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
              </div>
            </div>

            {/* Method of Cooking - Single Select */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Method of Cooking</h4>
              <select
                value={recipe.methodOfCooking || ''}
                onChange={(e) => onUpdate({ methodOfCooking: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a cooking method...</option>
                {METHOD_OF_COOKING_OPTIONS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Made Before */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Have you made this recipe before? <span className="text-sm font-normal text-red-600">*</span>
        </h3>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onUpdate({ madeBefore: true })}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              recipe.madeBefore === true
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ madeBefore: false })}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              recipe.madeBefore === false
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Author's Notes - Read-only, extracted by AI */}
      {recipe.recipeData.authorsNotes && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Author's Notes</h3>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-gray-700 whitespace-pre-wrap">{recipe.recipeData.authorsNotes}</p>
          </div>
        </div>
      )}

      {/* User Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Notes</h3>
        <textarea
          value={recipe.userNotes}
          onChange={(e) => onUpdate({ userNotes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Add your personal notes about this recipe..."
          rows={6}
        />
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={onSave}
          disabled={isSaving || recipe.saved}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {recipe.saved ? 'Saved ✓' : isSaving ? 'Saving...' : 'Save This Recipe'}
        </button>
      </div>
    </>
  );
}

