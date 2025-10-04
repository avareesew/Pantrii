'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface RecipeData {
  title: string;
  prepTime: string | null;
  cookTime: string | null;
  serves: string | null;
  ingredients: string[];
  instructions: string[];
  nutrition: Record<string, string>;
  confidence: number;
}

interface ScanResult {
  extractedText: string;
  recipeData: RecipeData;
  filename: string;
  processedAt: string;
  wordCount: number;
  characterCount: number;
}

export default function ScanPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Upload file
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
      setIsScanning(true);
      const scanResponse = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: uploadData.filename,
          filepath: uploadData.filepath,
        }),
      });

      if (!scanResponse.ok) {
        const errorData = await scanResponse.json();
        throw new Error(errorData.error || 'Scan failed');
      }

      const scanData = await scanResponse.json();
      setScanResult(scanData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
      setIsScanning(false);
    }
  };

  const resetForm = () => {
    setUploadResult(null);
    setScanResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[--color-cream] dark:bg-black">
      {/* Header */}
      <header className="border-b border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo-pantrii.svg" alt="Pantrii" width={120} height={28} />
              <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                Recipe Scanner
              </h1>
            </div>
            <a 
              href="/" 
              className="text-sm text-stone-600 dark:text-neutral-300 hover:text-stone-900 dark:hover:text-white"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Upload Section */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-4">
            Upload Recipe
          </h2>
          <p className="text-stone-600 dark:text-neutral-300 mb-6">
            Upload a recipe document to extract ingredients, cooking steps, and nutrition information.
          </p>

          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                disabled={isUploading || isScanning}
                className="block w-full text-sm text-stone-500 dark:text-neutral-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-pantrii-600 file:text-white
                  hover:file:bg-pantrii-700
                  disabled:opacity-50"
              />
            </div>

            <div className="text-xs text-stone-500 dark:text-neutral-400">
              Supported formats: JPEG, PNG, PDF (max 10MB)
            </div>

            {(isUploading || isScanning) && (
              <div className="flex items-center gap-2 text-sm text-pantrii-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-pantrii-600 border-t-transparent"></div>
                {isUploading ? 'Uploading...' : 'Scanning document...'}
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Upload Successful
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              File: {uploadResult.originalName} ({Math.round(uploadResult.size / 1024)}KB)
            </p>
          </div>
        )}

        {/* Scan Results */}
        {scanResult && (
          <div className="mt-8 space-y-6">
            {/* Extracted Text - Show this prominently */}
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">
                ✅ Extracted Text ({scanResult.characterCount} characters)
              </h3>
              <div className="bg-stone-50 dark:bg-stone-900/20 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-stone-700 dark:text-neutral-300 whitespace-pre-wrap font-mono">
                  {scanResult.extractedText}
                </pre>
              </div>
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>🎉 Success!</strong> Text extracted using Google Cloud Document AI (for PDFs) or Vision API (for images). 
                  The complete text is shown above - no truncation!
                </p>
              </div>
            </div>

            {/* Structured Data - Only show if we have parsed data */}
            {scanResult.recipeData && scanResult.recipeData.title && (
              <>
                {/* Recipe Header */}
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">
                    {scanResult.recipeData.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-stone-600 dark:text-neutral-300 mb-4">
                    {scanResult.recipeData.prepTime && (
                      <span>Prep: {scanResult.recipeData.prepTime}</span>
                    )}
                    {scanResult.recipeData.cookTime && (
                      <span>Cook: {scanResult.recipeData.cookTime}</span>
                    )}
                    {scanResult.recipeData.serves && (
                      <span>Serves: {scanResult.recipeData.serves}</span>
                    )}
                    <span>Confidence: {Math.round(scanResult.recipeData.confidence * 100)}%</span>
                  </div>
                </div>

                {/* Ingredients */}
                {scanResult.recipeData.ingredients && scanResult.recipeData.ingredients.length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">
                      Ingredients
                    </h3>
                    <ul className="space-y-2">
                      {scanResult.recipeData.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-pantrii-600 mt-1">•</span>
                          <span className="text-stone-700 dark:text-neutral-300">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {scanResult.recipeData.instructions && scanResult.recipeData.instructions.length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">
                      Instructions
                    </h3>
                    <ol className="space-y-3">
                      {scanResult.recipeData.instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-pantrii-600 text-white text-sm rounded-full flex items-center justify-center font-semibold">
                            {index + 1}
                          </span>
                          <span className="text-stone-700 dark:text-neutral-300">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Nutrition */}
                {scanResult.recipeData.nutrition && Object.keys(scanResult.recipeData.nutrition).length > 0 && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-4">
                      Nutrition (per serving)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(scanResult.recipeData.nutrition).map(([key, value]) => (
                        <div key={key} className="text-center p-3 bg-stone-50 dark:bg-stone-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-pantrii-600">{value}</div>
                          <div className="text-sm text-stone-600 dark:text-neutral-400 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-pantrii-600 text-white rounded-lg hover:bg-pantrii-700 transition-colors"
              >
                Scan Another Document
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(scanResult.extractedText);
                  alert('Text copied to clipboard!');
                }}
                className="px-6 py-2 border border-stone-300 dark:border-white/20 text-stone-700 dark:text-neutral-300 rounded-lg hover:bg-stone-50 dark:hover:bg-white/5 transition-colors"
              >
                Copy Text
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
