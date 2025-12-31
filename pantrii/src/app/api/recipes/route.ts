import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { isValidGenreOfFood, validateTypeOfDishArray, isValidMethodOfCooking } from "@/lib/recipeTaxonomy"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id;

    const recipes = await prisma.recipe.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })

    // Parse JSON fields for response
    return NextResponse.json(recipes.map(recipe => {
      const nutritionData = recipe.nutrition ? JSON.parse(recipe.nutrition) : null;
      return {
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients),
        instructions: JSON.parse(recipe.instructions),
        nutrition: nutritionData ? {
          calories: nutritionData.calories,
          protein_g: nutritionData.protein_g,
          fat_g: nutritionData.fat_g,
          carbs_g: nutritionData.carbs_g,
        } : null,
        nutrition_ai_estimated: recipe.nutrition_ai_estimated || false,
        nutrition_servings_used: nutritionData?._servings_used || null,
        typeOfDish: recipe.typeOfDish ? JSON.parse(recipe.typeOfDish) : null,
        originalFile: recipe.originalFile || null,
        originalFileName: recipe.originalFileName || null,
        originalFileType: recipe.originalFileType || null,
      };
    }))
  } catch (error) {
    console.error("Error fetching recipes:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id;

    const { 
      recipe_name,
      author,
      description,
      link,
      servings, 
      prep_time_minutes, 
      cook_time_minutes, 
      ingredients, 
      instructions, 
      nutrition,
      fileHash,
      image,
      made_before,
      genreOfFood,
      typeOfDish,
      methodOfCooking,
      userNotes,
      authorsNotes,
      originalFile,
      originalFileName,
      originalFileType
    } = await request.json()

    // Validate required fields
    if (!recipe_name) {
      return NextResponse.json({ error: "recipe_name is required" }, { status: 400 })
    }

    // Ensure ingredients and instructions are arrays
    const ingredientsArray = Array.isArray(ingredients) ? ingredients : []
    const instructionsArray = Array.isArray(instructions) ? instructions : []

    // Extract AI estimation flags from nutrition object if present
    let nutritionToSave = nutrition;
    if (nutrition && typeof nutrition === 'object') {
      nutritionToSave = {
        calories: nutrition.calories,
        protein_g: nutrition.protein_g,
        fat_g: nutrition.fat_g,
        carbs_g: nutrition.carbs_g,
        _ai_estimated: nutrition._ai_estimated || false,
        _servings_used: nutrition._servings_used || null,
      };
    }

    // Check if recipe with same fileHash already exists for this user
    if (fileHash) {
      const existingRecipe = await prisma.recipe.findFirst({
        where: {
          fileHash: fileHash,
          userId: userId,
        }
      })

      if (existingRecipe) {
        return NextResponse.json(
          { error: "This recipe has already been saved" },
          { status: 409 } // Conflict status
        )
      }
    }

    // Extract AI estimation flag from nutrition object
    const nutritionAiEstimated = nutrition && typeof nutrition === 'object' 
      ? (nutrition._ai_estimated || false) 
      : false;

    // Validate and normalize taxonomy fields
    const validatedGenreOfFood = genreOfFood && isValidGenreOfFood(genreOfFood) 
      ? genreOfFood 
      : null;
    const validatedTypeOfDish = Array.isArray(typeOfDish) 
      ? validateTypeOfDishArray(typeOfDish) 
      : null;
    const validatedMethodOfCooking = methodOfCooking && isValidMethodOfCooking(methodOfCooking)
      ? methodOfCooking
      : null;

    const recipe = await prisma.recipe.create({
      data: {
        recipe_name,
        author: author || null,
        description: description || null,
        link: link || null,
        servings: servings || null,
        prep_time_minutes: prep_time_minutes || null,
        cook_time_minutes: cook_time_minutes || null,
        ingredients: JSON.stringify(ingredientsArray),
        instructions: JSON.stringify(instructionsArray),
        nutrition: nutritionToSave ? JSON.stringify(nutritionToSave) : null,
        nutrition_ai_estimated: nutritionAiEstimated,
        made_before: made_before !== undefined ? made_before : false,
        genreOfFood: validatedGenreOfFood,
        typeOfDish: validatedTypeOfDish ? JSON.stringify(validatedTypeOfDish) : null,
        methodOfCooking: validatedMethodOfCooking,
        fileHash: fileHash || null,
        image: image || null,
        userNotes: userNotes || null,
        authorsNotes: authorsNotes || null,
        originalFile: originalFile || null,
        originalFileName: originalFileName || null,
        originalFileType: originalFileType || null,
        userId: userId,
      }
    })

    // Parse JSON fields for response
    const nutritionData = recipe.nutrition ? JSON.parse(recipe.nutrition) : null;
    return NextResponse.json({
      ...recipe,
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
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating recipe:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}







