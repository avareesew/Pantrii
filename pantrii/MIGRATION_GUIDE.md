# Migration Guide: New Recipe Schema & Gemini Vision Integration

This guide will help you migrate from the old recipe structure to the new structured schema with Gemini 1.5 Flash vision capabilities.

## Overview of Changes

1. **New Database Schema**: Recipes now use structured ingredients and instructions arrays
2. **Gemini 1.5 Flash Integration**: Uses vision API for better recipe extraction
3. **PDF to Image Conversion**: PDFs are converted to high-resolution images
4. **Caching System**: Recipes are cached based on file hash to save API costs

## Step 1: Update Database Schema

Run the Prisma migration to update your database:

```bash
cd pantrii
npx prisma migrate dev --name update_recipe_schema
```

This will:
- Rename `title` to `recipe_name`
- Rename `prepTime` to `prep_time_minutes`
- Rename `cookTime` to `cook_time_minutes`
- Change `ingredients` and `instructions` to store JSON arrays
- Add `nutrition` field for structured nutrition data
- Add `fileHash` field for caching

## Step 2: Set Up Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Create an API key (no payment required for basic usage)
5. Add to your `.env.local` file:

```env
GOOGLE_AI_API_KEY=your-api-key-here
```

## Step 3: Install Dependencies

The following packages have been added:
- `pdf-img-convert` - For converting PDF pages to images
- `crypto` - Built-in Node.js module for file hashing

These should already be installed, but if not:

```bash
npm install pdf-img-convert
```

## Step 4: Data Migration (Optional)

If you have existing recipes in the old format, you'll need to migrate them. The new API endpoints handle both formats during the transition, but you may want to migrate existing data.

**Note**: Existing recipes will need to be re-scanned or manually updated to use the new structured format.

## New Recipe Schema

### Ingredients Structure
```json
{
  "quantity": "2",
  "unit": "cups",
  "item": "flour",
  "notes": "all-purpose"
}
```

### Instructions Structure
```json
{
  "step_number": 1,
  "text": "Preheat oven to 350°F"
}
```

### Nutrition Structure
```json
{
  "calories": 250,
  "protein_g": 10,
  "fat_g": 5,
  "carbs_g": 40
}
```

## How It Works Now

1. **Upload**: User uploads PDF or image file
2. **Hash**: File is hashed for caching
3. **Check Cache**: If file was processed before, return cached result
4. **Convert**: PDF pages converted to high-resolution PNG images
5. **Extract**: Gemini 1.5 Flash analyzes image and extracts structured recipe data
6. **Cache**: Recipe is saved to database with file hash
7. **Display**: Structured recipe data is displayed to user

## Benefits

- **Better Accuracy**: Vision API understands layout and context better
- **Structured Data**: Ingredients and instructions are properly parsed into structured objects
- **Cost Savings**: Caching prevents re-processing the same files
- **Nutrition Support**: Can extract nutrition information when available
- **Multi-page PDFs**: Can process multi-page recipe documents

## Troubleshooting

### "GOOGLE_AI_API_KEY not set" error
- Make sure you've added the API key to `.env.local`
- Restart your development server after adding the key

### PDF conversion fails
- Make sure `pdf-img-convert` is installed
- Check that the PDF file is not corrupted or password-protected

### Caching not working
- Check that the database migration ran successfully
- Verify that `fileHash` field exists in the Recipe model

## API Changes

### GET /api/recipes
Returns recipes with parsed JSON fields:
- `ingredients`: Array of Ingredient objects
- `instructions`: Array of Instruction objects
- `nutrition`: Nutrition object or null

### POST /api/recipes
Accepts new schema format:
```json
{
  "recipe_name": "Chocolate Cake",
  "servings": 8,
  "prep_time_minutes": 15,
  "cook_time_minutes": 30,
  "ingredients": [...],
  "instructions": [...],
  "nutrition": {...}
}
```

### POST /api/scan
Now uses Gemini 1.5 Flash vision API:
- Converts PDFs to images automatically
- Returns structured recipe data matching the schema
- Implements caching based on file hash

## Next Steps

1. Test the new scan functionality with a sample recipe
2. Verify that recipes are being cached correctly
3. Update any custom code that uses the old recipe structure
4. Consider migrating existing recipes to the new format

