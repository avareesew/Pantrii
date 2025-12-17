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
      nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
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
        fileHash,
        userId,
      },
    });
  } catch (error) {
    console.error('Error saving cached recipe:', error);
    throw error;
  }
}

