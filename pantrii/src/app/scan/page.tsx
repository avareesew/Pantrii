'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<RecipeData | null>(null);
  const [ingredientTexts, setIngredientTexts] = useState<{ [key: number]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setProgress(0);
    setProgressMessage('Preparing file...');

    try {
      // Simulate upload progress (0-40%)
      const uploadProgressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 35) {
            return prev + Math.random() * 3;
          }
          return prev;
        });
      }, 100);

      const formData = new FormData();
      formData.append('file', file);

      setProgressMessage('Uploading file to server...');
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(uploadProgressInterval);
      setProgress(40);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setUploadResult(uploadData);

      // Start scanning
      setIsUploading(false);
      setIsScanning(true);
      setProgress(45);
      setProgressMessage('Analyzing document with AI...');

      // Simulate scanning progress (45-90%)
      const scanProgressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 85) {
            return prev + Math.random() * 2;
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
          debug: false,
        }),
      });

      clearInterval(scanProgressInterval);
      setProgress(90);
      setProgressMessage('Extracting recipe details...');

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
      
      // Complete progress - ensure it reaches 100% and stays visible
      setProgress(100);
      setProgressMessage('Recipe extracted successfully!');
      
      // Keep progress bar at 100% visible for a full second before showing results
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now show the results and stop the loading states
      setScanResult(scanData);
      setEditForm(scanData.recipeData); // Initialize edit form with scanned data
      setShowRawData(false);
      setIsUploading(false);
      setIsScanning(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProgress(0);
      setProgressMessage('');
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
    // Use edited data if in edit mode, otherwise use original scan result
    const recipeDataToSave = editing && editForm ? editForm : (scanResult?.recipeData);
    
    if (!recipeDataToSave) {
      setError('No recipe data to save');
      return;
    }

    // Prevent duplicate saves
    if (saved || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const recipeData = recipeDataToSave;
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: recipeData.recipe_name || 'Untitled Recipe',
          author: recipeData.author || null,
          description: recipeData.description || null,
          link: recipeData.link || null,
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
        // If recipe already exists, treat it as success (already saved)
        if (response.status === 409) {
          setSaved(true);
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
          return;
        }
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
    if (!editForm) return;
    const newIndex = editForm.ingredients.length;
    setEditForm({
      ...editForm,
      ingredients: [...editForm.ingredients, { quantity: '', unit: '', item: '', notes: '' }],
    });
    // Initialize the text for the new ingredient
    setIngredientTexts({ ...ingredientTexts, [newIndex]: '' });
  };

  const removeIngredient = (index: number) => {
    if (!editForm) return;
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

  const updateIngredient = (index: number, text: string) => {
    // Store the raw text for editing (preserves cursor position)
    setIngredientTexts({ ...ingredientTexts, [index]: text });
  };

  const handleIngredientBlur = (index: number) => {
    // Parse the ingredient when user finishes editing (on blur)
    if (!editForm) return;
    const text = ingredientTexts[index] || formatIngredient(editForm.ingredients[index]);
    const updated = [...editForm.ingredients];
    updated[index] = parseIngredient(text);
    setEditForm({ ...editForm, ingredients: updated });
    // Update the stored text to match the parsed format
    setIngredientTexts({ ...ingredientTexts, [index]: formatIngredient(updated[index]) });
  };

  const addInstruction = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      instructions: [...editForm.instructions, { step_number: editForm.instructions.length + 1, text: '' }],
    });
  };

  const removeInstruction = (index: number) => {
    if (!editForm) return;
    const updated = editForm.instructions.filter((_, i) => i !== index).map((inst, idx) => ({
      ...inst,
      step_number: idx + 1,
    }));
    setEditForm({ ...editForm, instructions: updated });
  };

  const updateInstruction = (index: number, text: string) => {
    if (!editForm) return;
    const updated = [...editForm.instructions];
    updated[index] = { ...updated[index], text };
    setEditForm({ ...editForm, instructions: updated });
  };

  const resetForm = () => {
    setUploadResult(null);
    setScanResult(null);
    setError(null);
    setShowRawData(false);
    setRawData(null);
    setSaved(false);
    setProgress(0);
    setProgressMessage('');
    setEditing(false);
    setEditForm(null);
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
                  {progressMessage || (isUploading ? 'Uploading file...' : 'Processing document...')}
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  ></div>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  {progress < 40 && 'Uploading your file...'}
                  {progress >= 40 && progress < 90 && 'AI is analyzing your recipe document...'}
                  {progress >= 90 && progress < 100 && 'Extracting ingredients and instructions...'}
                  {progress >= 100 && 'Complete!'}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

            {scanResult && editForm && (
              <div className="mt-8 space-y-6">
                {/* Recipe Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.recipe_name}
                        onChange={(e) => setEditForm({ ...editForm, recipe_name: e.target.value })}
                        className="text-2xl font-bold text-gray-900 flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Recipe Name"
                      />
                    ) : (
                      <h3 className="text-2xl font-bold text-gray-900">
                        {editForm.recipe_name}
                      </h3>
                    )}
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {/* Author, Description, Link */}
                  {editing ? (
                    <div className="mb-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                        <input
                          type="text"
                          value={editForm.author || ''}
                          onChange={(e) => setEditForm({ ...editForm, author: e.target.value || null })}
                          placeholder="Recipe author"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value || null })}
                          placeholder="Recipe description"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                        <input
                          type="url"
                          value={editForm.link || ''}
                          onChange={(e) => setEditForm({ ...editForm, link: e.target.value || null })}
                          placeholder="https://example.com/recipe"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  ) : (
                    (editForm.author || editForm.description || editForm.link) && (
                      <div className="mb-4 space-y-2">
                        {editForm.author && (
                          <p className="text-gray-600">
                            <span className="font-medium">Author:</span> {editForm.author}
                          </p>
                        )}
                        {editForm.description && (
                          <p className="text-gray-700">{editForm.description}</p>
                        )}
                        {editForm.link && (
                          <p className="text-gray-600">
                            <span className="font-medium">Source:</span>{' '}
                            <a
                              href={editForm.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 underline"
                            >
                              {editForm.link}
                            </a>
                          </p>
                        )}
                      </div>
                    )
                  )}
                  
                  {/* Prep/Cook/Servings */}
                  {editing ? (
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                        <input
                          type="number"
                          value={editForm.prep_time_minutes || ''}
                          onChange={(e) => setEditForm({ ...editForm, prep_time_minutes: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="Prep time"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (min)</label>
                        <input
                          type="number"
                          value={editForm.cook_time_minutes || ''}
                          onChange={(e) => setEditForm({ ...editForm, cook_time_minutes: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="Cook time"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                        <input
                          type="number"
                          value={editForm.servings || ''}
                          onChange={(e) => setEditForm({ ...editForm, servings: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="Servings"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                      {editForm.prep_time_minutes && (
                        <span>Prep: {editForm.prep_time_minutes} min</span>
                      )}
                      {editForm.cook_time_minutes && (
                        <span>Cook: {editForm.cook_time_minutes} min</span>
                      )}
                      {editForm.servings && (
                        <span>Serves: {editForm.servings}</span>
                      )}
                    </div>
                  )}
                  
                  {scanResult.cached && !editing && (
                    <div className="text-xs text-green-600 mt-2">
                      ✓ Loaded from cache
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                {editForm.ingredients && editForm.ingredients.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
                      {editing && (
                        <button
                          onClick={addIngredient}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          + Add Ingredient
                        </button>
                      )}
                    </div>
                    {editing ? (
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
                    ) : (
                      <ul className="space-y-2">
                        {editForm.ingredients.map((ingredient, index) => (
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
                    )}
                  </div>
                )}

                {/* Instructions */}
                {editForm.instructions && editForm.instructions.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Instructions</h3>
                      {editing && (
                        <button
                          onClick={addInstruction}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          + Add Instruction
                        </button>
                      )}
                    </div>
                    {editing ? (
                      <div className="space-y-3">
                        {editForm.instructions.map((instruction, index) => (
                          <div key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                              {instruction.step_number || index + 1}
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
                              placeholder="Instruction text"
                              rows={1}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden"
                              style={{ minHeight: '2.5rem' }}
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
                    ) : (
                      <ol className="space-y-3">
                        {editForm.instructions.map((instruction, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                              {instruction.step_number || index + 1}
                            </span>
                            <span className="text-gray-700">{instruction.text}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* Nutrition */}
                {(editForm.nutrition || editing) && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Nutrition
                    </h3>
                    {editing ? (
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
                    ) : (
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
                    )}
                  </div>
                )}

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
                      {editing ? (
                        <>
                          <button
                            onClick={handleSaveRecipe}
                            disabled={isSaving}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save Recipe'}
                          </button>
                          <button
                            onClick={() => {
                              setEditing(false);
                              setEditForm(scanResult?.recipeData || null);
                              // Reset ingredient texts to formatted values
                              if (scanResult?.recipeData) {
                                const resetTexts: { [key: number]: string } = {};
                                scanResult.recipeData.ingredients.forEach((ing, idx) => {
                                  resetTexts[idx] = formatIngredient(ing);
                                });
                                setIngredientTexts(resetTexts);
                              }
                            }}
                            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                          >
                            Cancel Edit
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveRecipe}
                            disabled={isSaving || saved}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save Recipe'}
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
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {!uploadResult && !scanResult && (
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
          )}
        </div>
      </main>
    </div>
  );
}