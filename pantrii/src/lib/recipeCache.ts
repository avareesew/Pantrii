import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CachedRecipe {
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
  nutrition_ai_estimated?: boolean;
  nutrition_servings_used?: number | null;
  genreOfFood?: string | null;
  typeOfDish?: string[] | null;
  methodOfCooking?: string | null;
  authorsNotes?: string | null;
}

/**
 * Check if a recipe with this file hash already exists in cache
 */
export async function getCachedRecipe(fileHash: string): Promise<CachedRecipe | null> {
  try {
    const recipe = await prisma.recipe.findFirst({
      where: { fileHash },
    });

    if (!recipe) {
      return null;
    }

    const nutritionData = recipe.nutrition ? JSON.parse(recipe.nutrition) : null;
    const typeOfDishArray = recipe.typeOfDish ? JSON.parse(recipe.typeOfDish) : null;
    return {
      recipe_name: recipe.recipe_name,
      author: recipe.author,
      description: recipe.description,
      link: recipe.link,
      servings: recipe.servings,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      nutrition: nutritionData ? {
        calories: nutritionData.calories,
        protein_g: nutritionData.protein_g,
        fat_g: nutritionData.fat_g,
        carbs_g: nutritionData.carbs_g,
      } : null,
      nutrition_ai_estimated: nutritionData?._ai_estimated || false,
      nutrition_servings_used: nutritionData?._servings_used || null,
      genreOfFood: recipe.genreOfFood || null,
      typeOfDish: typeOfDishArray || null,
      methodOfCooking: recipe.methodOfCooking || null,
      authorsNotes: recipe.authorsNotes || null,
    };
  } catch (error) {
    console.error('Error getting cached recipe:', error);
    return null;
  }
}

/**
 * Save a recipe to cache
 */
export async function saveCachedRecipe(
  fileHash: string,
  recipe: CachedRecipe,
  userId: string
): Promise<void> {
  try {
    await prisma.recipe.create({
      data: {
        recipe_name: recipe.recipe_name,
        author: recipe.author,
        description: recipe.description,
        link: recipe.link,
        servings: recipe.servings,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        ingredients: JSON.stringify(recipe.ingredients),
        instructions: JSON.stringify(recipe.instructions),
        nutrition: recipe.nutrition ? JSON.stringify(recipe.nutrition) : null,
        genreOfFood: recipe.genreOfFood || null,
        typeOfDish: recipe.typeOfDish ? JSON.stringify(recipe.typeOfDish) : null,
        methodOfCooking: recipe.methodOfCooking || null,
        authorsNotes: recipe.authorsNotes || null,
        fileHash,
        userId,
      },
    });
  } catch (error) {
    console.error('Error saving cached recipe:', error);
    throw error;
  }
}

