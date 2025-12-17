'use client';

import { useState, useRef } from 'react';
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

interface RecipeData {
  recipe_name: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutrition: Nutrition | null;
}

interface ScanResult {
  success: boolean;
  recipeData: RecipeData;
  filename: string;
  processedAt: string;
  cached: boolean;
  fileHash?: string;
  pagesProcessed?: number;
}

export default function ScanPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setUploadResult(uploadData);

      // Start scanning
      setIsUploading(false);
      setIsScanning(true);

          const scanResponse = await fetch('/api/scan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: uploadData.filename,
              filepath: uploadData.filepath,
              debug: false, // Disabled debug mode to test improved parsing
            }),
          });

      // Read response once
      const contentType = scanResponse.headers.get('content-type') || '';
      const responseText = await scanResponse.text();

      if (!scanResponse.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage = 'Scan failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || 'Scan failed';
        } catch (e) {
          errorMessage = responseText.substring(0, 200) || 'Scan failed';
        }
        throw new Error(errorMessage);
      }

      // Check if response is JSON
      if (!contentType.includes('application/json')) {
        console.error('Non-JSON response:', responseText.substring(0, 200));
        throw new Error('Server returned invalid response. Please check the console for details.');
      }

      // Parse JSON response
      const scanData = JSON.parse(responseText);
      setScanResult(scanData);
      
      // Remove raw data view since we're using Gemini vision now
      setShowRawData(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
      setIsScanning(false);
    }
  };

  const fetchRawData = async () => {
    if (!uploadResult) return;
    
    // If we already have raw data, just show it
    if (rawData) {
      setShowRawData(true);
      return;
    }
    
    try {
      const scanResponse = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: uploadResult.filename,
          filepath: uploadResult.filepath,
          debug: true, // Enable debug mode for raw data
        }),
      });

      if (!scanResponse.ok) {
        const errorData = await scanResponse.json();
        throw new Error(errorData.error || 'Failed to fetch raw data');
      }

      const rawDataResponse = await scanResponse.json();
      setRawData(rawDataResponse);
      setShowRawData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch raw data');
    }
  };

  const handleSaveRecipe = async () => {
    if (!scanResult || !scanResult.recipeData) {
      setError('No recipe data to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const recipeData = scanResult.recipeData;
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: recipeData.recipe_name || 'Untitled Recipe',
          servings: recipeData.servings,
          prep_time_minutes: recipeData.prep_time_minutes,
          cook_time_minutes: recipeData.cook_time_minutes,
          ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
          instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
          nutrition: recipeData.nutrition,
          fileHash: scanResult.fileHash,
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

  const resetForm = () => {
    setUploadResult(null);
    setScanResult(null);
    setError(null);
    setShowRawData(false);
    setRawData(null);
    setSaved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            Upload Recipe
          </h1>
          <p className="text-gray-600 mb-6">
            Upload a recipe document to extract ingredients and cooking steps.
          </p>

          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-600 file:text-white
                  hover:file:bg-green-700
                  disabled:opacity-50"
              />
            </div>

            <div className="text-xs text-gray-500">
              Supported formats: JPEG, PNG, PDF (max 10MB)
            </div>

            {(isUploading || isScanning) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                  {isUploading ? 'Uploading file...' : 'Processing document...'}
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out w-full"></div>
                </div>
                
                {isScanning && (
                  <div className="text-xs text-gray-500">
                    Converting PDF to images and extracting recipe using AI...
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

            {scanResult && (
              <div className="mt-8 space-y-6">
                {/* Parsed recipe view */}
                <>
                    {/* Recipe Header */}
                    {scanResult.recipeData && scanResult.recipeData.recipe_name && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                          {scanResult.recipeData.recipe_name}
                        </h3>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                          {scanResult.recipeData.prep_time_minutes && (
                            <span>Prep: {scanResult.recipeData.prep_time_minutes} min</span>
                          )}
                          {scanResult.recipeData.cook_time_minutes && (
                            <span>Cook: {scanResult.recipeData.cook_time_minutes} min</span>
                          )}
                          {scanResult.recipeData.servings && (
                            <span>Serves: {scanResult.recipeData.servings}</span>
                          )}
                        </div>
                        {scanResult.cached && (
                          <div className="text-xs text-green-600 mt-2">
                            ✓ Loaded from cache
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ingredients */}
                    {scanResult.recipeData && scanResult.recipeData.ingredients && scanResult.recipeData.ingredients.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Ingredients
                        </h3>
                        <ul className="space-y-2">
                          {scanResult.recipeData.ingredients.map((ingredient, index) => (
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
                    )}

                    {/* Instructions */}
                    {scanResult.recipeData && scanResult.recipeData.instructions && scanResult.recipeData.instructions.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Instructions
                        </h3>
                        <ol className="space-y-3">
                          {scanResult.recipeData.instructions.map((instruction, index) => (
                            <li key={index} className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                                {instruction.step_number || index + 1}
                              </span>
                              <span className="text-gray-700">{instruction.text}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Nutrition */}
                    {scanResult.recipeData && scanResult.recipeData.nutrition && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Nutrition
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {scanResult.recipeData.nutrition.calories !== null && (
                            <div>
                              <span className="text-gray-600">Calories:</span>
                              <span className="ml-2 font-medium">{scanResult.recipeData.nutrition.calories}</span>
                            </div>
                          )}
                          {scanResult.recipeData.nutrition.protein_g !== null && (
                            <div>
                              <span className="text-gray-600">Protein:</span>
                              <span className="ml-2 font-medium">{scanResult.recipeData.nutrition.protein_g}g</span>
                            </div>
                          )}
                          {scanResult.recipeData.nutrition.fat_g !== null && (
                            <div>
                              <span className="text-gray-600">Fat:</span>
                              <span className="ml-2 font-medium">{scanResult.recipeData.nutrition.fat_g}g</span>
                            </div>
                          )}
                          {scanResult.recipeData.nutrition.carbs_g !== null && (
                            <div>
                              <span className="text-gray-600">Carbs:</span>
                              <span className="ml-2 font-medium">{scanResult.recipeData.nutrition.carbs_g}g</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>

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
                        disabled={isSaving}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Recipe'}
                      </button>
                      <button
                        onClick={resetForm}
                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Scan Another Recipe
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
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Or add recipe manually
            </h3>
            <p className="text-gray-600 mb-4">
              Can't scan your recipe? Add it manually instead.
            </p>
            <Link
              href="/manual-recipe"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Add Recipe Manually
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}