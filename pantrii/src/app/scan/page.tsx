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

interface ScanResult {
  success: boolean;
  recipeData: RecipeData;
  filename: string;
  processedAt: string;
  cached: boolean;
  fileHash?: string;
  pagesProcessed?: number;
  originalFile?: string; // Base64 data URI
  originalFileName?: string;
  originalFileType?: string;
}

export default function ScanPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [recipePhoto, setRecipePhoto] = useState<string | null>(null);
  const [madeBefore, setMadeBefore] = useState<boolean | null>(null);
  const [genreOfFood, setGenreOfFood] = useState<string | null>(null);
  const [typeOfDish, setTypeOfDish] = useState<string[]>([]);
  const [typeOfDishSearch, setTypeOfDishSearch] = useState<string>('');
  const [methodOfCooking, setMethodOfCooking] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState<string>('');
  const [originalFile, setOriginalFile] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [originalFileType, setOriginalFileType] = useState<string>('');
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Editable form state
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
  
  // Track which sections are being edited
  const [editingSections, setEditingSections] = useState({
    basic: false,
    ingredients: false,
    instructions: false,
    nutrition: false,
    taxonomy: false,
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress (0-30%)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 25) {
            return prev + 2;
          }
          return prev;
        });
      }, 100);

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(30);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setUploadResult(uploadData);
      // Store original file from upload
      if (uploadData.base64) {
        setOriginalFile(uploadData.base64);
        setOriginalFileName(uploadData.originalName || uploadData.filename);
        setOriginalFileType(uploadData.type || '');
      }

      // Start scanning
      setIsUploading(false);
      setIsScanning(true);
      setUploadProgress(30);

      // Simulate scanning progress (30-95%)
      // AI processing - faster progress to match actual processing time
      const scanProgressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 95) {
            // Much faster increment - about 1.2% per update, updates every 200ms
            // This means it takes about 11 seconds to go from 30% to 95%
            // which better matches typical AI processing times
            return Math.min(prev + 1.2, 95);
          }
          return prev;
        });
      }, 200);

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

      // Clear interval and set to 95% before processing response
      clearInterval(scanProgressInterval);
      setUploadProgress(95);

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
      
      // Complete progress
      setUploadProgress(100);
      
      // Update original file from scan response (important for cached recipes)
      if (scanData.originalFile) {
        setOriginalFile(scanData.originalFile);
        setOriginalFileName(scanData.originalFileName || uploadData.originalName || uploadData.filename);
        setOriginalFileType(scanData.originalFileType || uploadData.type || '');
      } else if (uploadData.base64) {
        // Fallback to upload data if scan doesn't provide it
        setOriginalFile(uploadData.base64);
        setOriginalFileName(uploadData.originalName || uploadData.filename);
        setOriginalFileType(uploadData.type || '');
      }
      
      // Initialize taxonomy fields and editable form from scan result if available
      if (scanData.recipeData) {
        // Initialize editable form
        setEditForm({
          recipe_name: scanData.recipeData.recipe_name || '',
          author: scanData.recipeData.author || '',
          description: scanData.recipeData.description || '',
          link: scanData.recipeData.link || '',
          servings: scanData.recipeData.servings?.toString() || '',
          prep_time_minutes: scanData.recipeData.prep_time_minutes?.toString() || '',
          cook_time_minutes: scanData.recipeData.cook_time_minutes?.toString() || '',
          ingredients: Array.isArray(scanData.recipeData.ingredients) ? scanData.recipeData.ingredients : [],
          instructions: Array.isArray(scanData.recipeData.instructions) ? scanData.recipeData.instructions : [],
          nutrition: scanData.recipeData.nutrition || null,
        });
        
        // Initialize taxonomy fields
        if (scanData.recipeData.genreOfFood && isValidGenreOfFood(scanData.recipeData.genreOfFood)) {
          setGenreOfFood(scanData.recipeData.genreOfFood);
        }
        if (Array.isArray(scanData.recipeData.typeOfDish) && scanData.recipeData.typeOfDish.length > 0) {
          const validated = validateTypeOfDishArray(scanData.recipeData.typeOfDish);
          if (validated.length > 0) {
            setTypeOfDish(validated);
          }
        }
        if (scanData.recipeData.methodOfCooking && isValidMethodOfCooking(scanData.recipeData.methodOfCooking)) {
          setMethodOfCooking(scanData.recipeData.methodOfCooking);
        }
      }
      
      // Debug: Log AI estimation flags
      if (scanData.recipeData?.nutrition_ai_estimated) {
        console.log('Scan result AI flags:', {
          ai_estimated: scanData.recipeData.nutrition_ai_estimated,
          servings_used: scanData.recipeData.nutrition_servings_used
        });
      }
      setScanResult(scanData);
      setIsScanning(false);
      
      // Remove raw data view since we're using Gemini vision now
      setShowRawData(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUploadProgress(0);
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
    if (!scanResult || !scanResult.recipeData) {
      setError('No recipe data to save');
      return;
    }

    if (!editForm.recipe_name.trim()) {
      setError('Recipe name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    // Validate taxonomy fields
    const validatedGenreOfFood = genreOfFood && isValidGenreOfFood(genreOfFood) ? genreOfFood : null;
    const validatedTypeOfDish = typeOfDish.length > 0 ? validateTypeOfDishArray(typeOfDish) : null;
    const validatedMethodOfCooking = methodOfCooking && isValidMethodOfCooking(methodOfCooking) ? methodOfCooking : null;

    try {
      const recipeData = scanResult.recipeData;
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: editForm.recipe_name.trim() || 'Untitled Recipe',
          author: editForm.author.trim() || null,
          description: editForm.description.trim() || null,
          link: editForm.link.trim() || null,
          servings: editForm.servings ? parseInt(editForm.servings) : null,
          prep_time_minutes: editForm.prep_time_minutes ? parseInt(editForm.prep_time_minutes) : null,
          cook_time_minutes: editForm.cook_time_minutes ? parseInt(editForm.cook_time_minutes) : null,
          ingredients: editForm.ingredients,
          instructions: editForm.instructions,
          nutrition: editForm.nutrition ? {
            ...editForm.nutrition,
            _ai_estimated: recipeData.nutrition_ai_estimated || false,
            _servings_used: recipeData.nutrition_servings_used || null,
          } : null,
          fileHash: scanResult.fileHash,
          image: recipePhoto || null,
          made_before: madeBefore,
          genreOfFood: validatedGenreOfFood,
          typeOfDish: validatedTypeOfDish,
          methodOfCooking: validatedMethodOfCooking,
          userNotes: userNotes.trim() || null,
          authorsNotes: scanResult.recipeData.authorsNotes || null,
          originalFile: originalFile || null,
          originalFileName: originalFileName || null,
          originalFileType: originalFileType || null,
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

  const toggleSectionEdit = (section: keyof typeof editingSections) => {
    setEditingSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const cancelSectionEdit = (section: keyof typeof editingSections) => {
    // Reset form data for this section from scan result
    if (scanResult?.recipeData) {
      const data = scanResult.recipeData;
      if (section === 'basic') {
        setEditForm(prev => ({
          ...prev,
          recipe_name: data.recipe_name || '',
          author: data.author || '',
          description: data.description || '',
          link: data.link || '',
          servings: data.servings?.toString() || '',
          prep_time_minutes: data.prep_time_minutes?.toString() || '',
          cook_time_minutes: data.cook_time_minutes?.toString() || '',
        }));
      } else if (section === 'ingredients') {
        setEditForm(prev => ({
          ...prev,
          ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        }));
      } else if (section === 'instructions') {
        setEditForm(prev => ({
          ...prev,
          instructions: Array.isArray(data.instructions) ? data.instructions : [],
        }));
      } else if (section === 'nutrition') {
        setEditForm(prev => ({
          ...prev,
          nutrition: data.nutrition || null,
        }));
      } else if (section === 'taxonomy') {
        // Reset taxonomy fields from scan result
        if (data.genreOfFood && isValidGenreOfFood(data.genreOfFood)) {
          setGenreOfFood(data.genreOfFood);
        } else {
          setGenreOfFood(null);
        }
        if (Array.isArray(data.typeOfDish) && data.typeOfDish.length > 0) {
          const validated = validateTypeOfDishArray(data.typeOfDish);
          setTypeOfDish(validated.length > 0 ? validated : []);
        } else {
          setTypeOfDish([]);
        }
        if (data.methodOfCooking && isValidMethodOfCooking(data.methodOfCooking)) {
          setMethodOfCooking(data.methodOfCooking);
        } else {
          setMethodOfCooking(null);
        }
        // Note: madeBefore doesn't come from scan, so we don't reset it
      }
    }
    toggleSectionEdit(section);
  };

  const resetForm = () => {
    setUploadResult(null);
    setScanResult(null);
    setError(null);
    setShowRawData(false);
    setRawData(null);
    setSaved(false);
    setRecipePhoto(null);
    setMadeBefore(null);
    setGenreOfFood(null);
    setTypeOfDish([]);
    setTypeOfDishSearch('');
    setMethodOfCooking(null);
    setUserNotes('');
    setOriginalFile(null);
    setOriginalFileName('');
    setOriginalFileType('');
    setShowComparison(false);
    setEditForm({
      recipe_name: '',
      author: '',
      description: '',
      link: '',
      servings: '',
      prep_time_minutes: '',
      cook_time_minutes: '',
      ingredients: [],
      instructions: [],
      nutrition: null,
    });
    setEditingSections({
      basic: false,
      ingredients: false,
      instructions: false,
      nutrition: false,
      taxonomy: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
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

      <main className={`${showComparison && originalFile ? 'max-w-7xl' : 'max-w-2xl'} mx-auto px-4 py-12 transition-all duration-300`}>
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

            <Link
              href="/scan/bulk"
              className="inline-flex items-center text-sm text-green-800 hover:text-green-900 font-medium"
            >
              Want to upload multiple recipes at once? Click here! →
            </Link>

            {(isUploading || isScanning) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                  {isUploading ? 'Uploading file...' : 'Processing document...'}
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {Math.round(uploadProgress)}%
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
              <div className="mt-8">
                {/* Comparison mode toggle button */}
                {originalFile && !showComparison && (
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
                <div className={showComparison && originalFile ? "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6" : ""}>
                  {/* Left side: Sticky original file display (only in comparison mode) */}
                  {showComparison && originalFile && (
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
                          {originalFileType?.includes('pdf') ? (
                            <iframe
                              src={originalFile}
                              className="w-full h-[calc(100vh-200px)] border border-gray-300 rounded-lg"
                              title="Original PDF"
                            />
                          ) : (
                            <img
                              src={originalFile}
                              alt="Original recipe document"
                              className="w-full h-auto border border-gray-300 rounded-lg object-contain max-h-[calc(100vh-200px)]"
                            />
                          )}
                          {originalFileName && (
                            <p className="text-sm text-gray-500 text-center">
                              {originalFileName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recipe details - Always shown */}
                  <div className="space-y-6">
                    {/* Recipe Photo Upload - Only show after scan is complete */}
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
                  
                {/* Parsed recipe view - Read-only by default, editable on click */}
                <>
                    {/* Recipe Header - Basic Info */}
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
                            <h2 className="text-2xl font-bold text-gray-900">{editForm.recipe_name || 'Untitled Recipe'}</h2>
                          </div>
                          
                          {editForm.author ? (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Author:</span> {editForm.author}
                            </div>
                          ) : (
                            <div className="text-sm text-amber-600 flex items-center gap-1">
                              <span>⚠️</span>
                              <span className="italic">Author: Missing</span>
                            </div>
                          )}

                          {editForm.description ? (
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Description:</span> {editForm.description}
                            </div>
                          ) : (
                            <div className="text-sm text-amber-600 flex items-center gap-1">
                              <span>⚠️</span>
                              <span className="italic">Description: Missing</span>
                            </div>
                          )}

                          {scanResult.recipeData.authorsNotes && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <div className="text-sm font-medium text-gray-900 mb-2">Author's Notes</div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{scanResult.recipeData.authorsNotes}</p>
                            </div>
                          )}

                          {editForm.link ? (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Source:</span>{' '}
                              <a href={editForm.link} target="_blank" rel="noopener noreferrer" className="text-green-800 hover:text-green-900 hover:underline">
                                {editForm.link}
                              </a>
                            </div>
                          ) : (
                            <div className="text-sm text-amber-600 flex items-center gap-1">
                              <span>⚠️</span>
                              <span className="italic">Source Link: Missing</span>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            {editForm.prep_time_minutes && <span>Prep: {editForm.prep_time_minutes} min</span>}
                            {editForm.cook_time_minutes && <span>Cook: {editForm.cook_time_minutes} min</span>}
                            {editForm.servings && <span>Serves: {editForm.servings}</span>}
                          </div>
                        </div>
                      ) : (
                        // Editable view
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
                  )}
                  
                      {scanResult.cached && (
                    <div className="text-xs text-green-600 mt-2">
                      ✓ Loaded from cache
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Ingredients
                        </h3>
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
                          onClick={addIngredient}
                              className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                        >
                              + Add
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
                          {editForm.ingredients.length > 0 ? (
                            editForm.ingredients.map((ingredient, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">•</span>
                            <span className="text-gray-700">
                              {ingredient.quantity && `${ingredient.quantity} `}
                              {ingredient.unit && `${ingredient.unit} `}
                              {ingredient.item}
                              {ingredient.notes && ` (${ingredient.notes})`}
                            </span>
                          </li>
                            ))
                          ) : (
                            <li className="text-sm text-gray-500 italic">No ingredients</li>
                          )}
                      </ul>
                      ) : (
                        // Editable view
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
                            <p className="text-sm text-gray-500 italic">No ingredients added yet. Click "Add" to get started.</p>
                    )}
                  </div>
                )}
                    </div>

                {/* Instructions */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Instructions
                        </h3>
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
                          onClick={addInstruction}
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
                          {editForm.instructions.length > 0 ? (
                            editForm.instructions.map((instruction, index) => (
                              <li key={index} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                                  {instruction.step_number || index + 1}
                                </span>
                                <span className="text-gray-700">{instruction.text}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-gray-500 italic">No instructions</li>
                          )}
                        </ol>
                      ) : (
                        // Editable view
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
                )}
                    </div>

                {/* Nutrition */}
                    {editForm.nutrition && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                      Nutrition
                    </h3>
                          <div className="flex items-center gap-2">
                            {scanResult.recipeData.nutrition_ai_estimated && (
                              <span className="text-xs text-gray-500 italic">
                                AI-estimated
                              </span>
                            )}
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
                        </div>
                        {scanResult.recipeData.nutrition_ai_estimated && scanResult.recipeData.nutrition_servings_used && (
                          <p className="text-xs text-gray-500 mb-3">
                            Values are per serving. Calculated using {scanResult.recipeData.nutrition_servings_used} {scanResult.recipeData.nutrition_servings_used === 1 ? 'serving' : 'servings'}.
                            {editForm.servings && String(editForm.servings).includes('-') && (
                              <span> (Recipe indicates {editForm.servings} servings)</span>
                            )}
                          </p>
                        )}
                        {!scanResult.recipeData.nutrition_ai_estimated && editForm.servings && (
                          <p className="text-xs text-gray-500 mb-3">
                            Values are per serving
                          </p>
                        )}
                        
                        {!editingSections.nutrition ? (
                          // Read-only view
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {editForm.nutrition.calories !== null && (
                              <div>
                                <span className="text-gray-600">Calories:</span>
                                <span className="ml-2 font-medium">{editForm.nutrition.calories}</span>
                              </div>
                            )}
                            {editForm.nutrition.protein_g !== null && (
                              <div>
                                <span className="text-gray-600">Protein:</span>
                                <span className="ml-2 font-medium">{editForm.nutrition.protein_g}g</span>
                              </div>
                            )}
                            {editForm.nutrition.fat_g !== null && (
                              <div>
                                <span className="text-gray-600">Fat:</span>
                                <span className="ml-2 font-medium">{editForm.nutrition.fat_g}g</span>
                              </div>
                            )}
                            {editForm.nutrition.carbs_g !== null && (
                              <div>
                                <span className="text-gray-600">Carbs:</span>
                                <span className="ml-2 font-medium">{editForm.nutrition.carbs_g}g</span>
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
                                value={editForm.nutrition.calories ?? ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              nutrition: {
                                    ...editForm.nutrition!,
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
                                value={editForm.nutrition.protein_g ?? ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              nutrition: {
                                    ...editForm.nutrition!,
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
                                value={editForm.nutrition.fat_g ?? ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              nutrition: {
                                    ...editForm.nutrition!,
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
                                value={editForm.nutrition.carbs_g ?? ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              nutrition: {
                                    ...editForm.nutrition!,
                                    carbs_g: e.target.value ? parseFloat(e.target.value) : null,
                              },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Carbs"
                          />
                        </div>
                      </div>
                        )}
                      </div>
                    )}

                    {/* Taxonomy Fields */}
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
                            {genreOfFood ? (
                              <div className="text-sm text-gray-600 mt-1">{genreOfFood}</div>
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
                            {typeOfDish.length > 0 ? (
                              <div className="text-sm text-gray-600 mt-1">{typeOfDish.join(', ')}</div>
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
                            {methodOfCooking ? (
                              <div className="text-sm text-gray-600 mt-1">{methodOfCooking}</div>
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
                )}
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
                    </>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
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