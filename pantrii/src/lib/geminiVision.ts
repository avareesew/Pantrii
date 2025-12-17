/**
 * Extract recipe data from images using Gemini 1.5 Flash with vision capabilities
 */

interface RecipeSchema {
  recipe_name: string;
  author: string | null;
  description: string | null;
  link: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  ingredients: Array<{
    quantity: string;
    unit: string;
    item: string;
    notes: string;
  }>;
  instructions: Array<{
    step_number: number;
    text: string;
  }>;
  nutrition: {
    calories: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carbs_g: number | null;
  } | null;
}

/**
 * Convert image buffer to base64 for Gemini API
 */
function imageToBase64(buffer: Buffer, mimeType: string): string {
  return buffer.toString('base64');
}

/**
 * Extract recipe from image or PDF using Gemini 2.5 Flash
 * Supports: images (PNG, JPEG) and PDFs directly
 */
export async function extractRecipeFromImage(
  fileBuffer: Buffer,
  mimeType: string = 'image/png'
): Promise<RecipeSchema> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }

  const base64File = fileBuffer.toString('base64');

  const schemaPrompt = `Extract the recipe details from this ${mimeType.includes('pdf') ? 'PDF document' : 'image'}. Follow this JSON schema exactly. If a field is missing or cannot be determined, return null for that field.

Required JSON Schema:
{
  "recipe_name": "string",
  "author": "string" or null,
  "description": "string" or null,
  "link": "string" or null,
  "servings": integer or null,
  "prep_time_minutes": integer or null,
  "cook_time_minutes": integer or null,
  "ingredients": [
    {
      "quantity": "string",
      "unit": "string",
      "item": "string",
      "notes": "string"
    }
  ],
  "instructions": [
    {
      "step_number": integer,
      "text": "string"
    }
  ],
  "nutrition": {
    "calories": integer or null,
    "protein_g": integer or null,
    "fat_g": integer or null,
    "carbs_g": integer or null
  } or null
}

CRITICAL INSTRUCTIONS:
- Extract ALL ingredients with their quantities, units, and items. Each ingredient must have at least "item" field.
- Extract ALL instructions/directions/steps from the recipe. Instructions are REQUIRED - look for numbered steps, "Instructions:", "Directions:", "Method:", or any cooking steps.
- Each instruction must have a "step_number" (1, 2, 3, etc.) and "text" (the actual instruction text).
- If you see cooking steps, directions, or instructions in the image, you MUST include them in the instructions array.
- Extract the author name if present (e.g., "By John Smith", "Recipe by...", "Author:...").
- Extract the description if present (usually a brief introduction or summary of the recipe).
- Extract the recipe link/URL if present (e.g., "Source: https://...", "From: www.example.com").
- If nutrition information is not available, set nutrition to null
- Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations
- Start your response with { and end with }
- If a field cannot be determined, use null (not empty string or 0)
- Do not include any text before or after the JSON object
- The instructions array is REQUIRED - if no instructions are found, return an empty array []`;

  try {
    // Use gemini-2.5-flash (recommended for speed/free tier, matches Python SDK)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: schemaPrompt,
                },
                {
                  inline_data: {
                    mime_type: mimeType, // Can be image/png, image/jpeg, or application/pdf
                    data: base64File,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      
      // Handle quota/rate limit errors
      if (response.status === 429) {
        let errorMessage = 'API quota exceeded. ';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage += errorData.error.message;
          }
          if (errorData.error?.details?.[0]?.retryDelay) {
            errorMessage += ` Please retry after ${errorData.error.details[0].retryDelay}.`;
          }
        } catch (e) {
          errorMessage += 'Please wait a moment and try again.';
        }
        throw new Error(errorMessage);
      }
      
      // Handle 404 (model not found)
      if (response.status === 404) {
        throw new Error(
          `Model not found. The model name might be incorrect. ` +
          `Please check available models or try a different model name. ` +
          `Error: ${errorText.substring(0, 200)}`
        );
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error('Invalid Gemini API response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from Gemini API');
    }
    
    const extractedText = data.candidates[0].content.parts[0].text;

    // Parse the JSON response
    let recipeData: RecipeSchema;
    try {
      // Remove any markdown code blocks if present
      const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recipeData = JSON.parse(cleanedText);
      
      // Debug: Log if instructions are missing
      if (!recipeData.instructions || recipeData.instructions.length === 0) {
        console.warn('⚠️ No instructions found in extracted recipe data. Full response:', JSON.stringify(recipeData, null, 2));
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response. Raw text:', extractedText.substring(0, 500));
      throw new Error('Failed to parse recipe data from API response');
    }

    // Validate and normalize the response
    return validateAndNormalizeRecipe(recipeData);
  } catch (error) {
    console.error('Error extracting recipe from image:', error);
    throw error;
  }
}

/**
 * Convert text to title case if it's in all caps or mostly uppercase
 */
function toTitleCase(text: string): string {
  if (!text) return text;
  
  // Check if text is all uppercase or mostly uppercase (more than 50% uppercase letters)
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return text;
  
  const uppercaseCount = letters.split('').filter(c => c === c.toUpperCase()).length;
  const isMostlyUppercase = uppercaseCount / letters.length > 0.5;
  
  // Only convert if it's mostly uppercase
  if (!isMostlyUppercase) return text;
  
  // Convert to title case: first letter of each word capitalized, rest lowercase
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Validate and normalize recipe data to match schema
 */
function validateAndNormalizeRecipe(data: any): RecipeSchema {
  const rawRecipeName = data.recipe_name || 'Untitled Recipe';
  const rawAuthor = data.author ? String(data.author).trim() : null;
  return {
    recipe_name: toTitleCase(rawRecipeName),
    author: rawAuthor ? toTitleCase(rawAuthor) : null,
    description: data.description ? String(data.description).trim() : null,
    link: data.link ? String(data.link).trim() : null,
    servings: typeof data.servings === 'number' ? data.servings : null,
    prep_time_minutes: typeof data.prep_time_minutes === 'number' ? data.prep_time_minutes : null,
    cook_time_minutes: typeof data.cook_time_minutes === 'number' ? data.cook_time_minutes : null,
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.map((ing: any) => ({
          quantity: String(ing.quantity || ''),
          unit: String(ing.unit || ''),
          item: String(ing.item || ''),
          notes: String(ing.notes || ''),
        }))
      : [],
    instructions: Array.isArray(data.instructions)
      ? data.instructions
          .map((inst: any, index: number) => ({
            step_number: typeof inst.step_number === 'number' ? inst.step_number : index + 1,
            text: String(inst.text || inst || ''), // Handle both object and string formats
          }))
          .filter((inst: any) => inst.text && inst.text.trim().length > 0) // Only keep non-empty instructions
      : [],
    nutrition: data.nutrition
      ? {
          calories: typeof data.nutrition.calories === 'number' ? data.nutrition.calories : null,
          protein_g: typeof data.nutrition.protein_g === 'number' ? data.nutrition.protein_g : null,
          fat_g: typeof data.nutrition.fat_g === 'number' ? data.nutrition.fat_g : null,
          carbs_g: typeof data.nutrition.carbs_g === 'number' ? data.nutrition.carbs_g : null,
        }
      : null,
  };
}

