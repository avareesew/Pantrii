import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { isValidGenreOfFood, validateTypeOfDishArray, isValidMethodOfCooking } from "@/lib/recipeTaxonomy"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id;

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: userId,
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

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
      nutrition_ai_estimated: recipe.nutrition_ai_estimated || false,
      nutrition_servings_used: nutritionData?._servings_used || null,
      typeOfDish: recipe.typeOfDish ? JSON.parse(recipe.typeOfDish) : null,
      methodOfCooking: recipe.methodOfCooking || null,
      userNotes: recipe.userNotes || null,
      authorsNotes: recipe.authorsNotes || null,
      originalFile: recipe.originalFile || null,
      originalFileName: recipe.originalFileName || null,
      originalFileType: recipe.originalFileType || null,
    })
  } catch (error) {
    console.error("Error fetching recipe:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id;

    // Verify recipe belongs to user
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: userId,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

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

    // Extract AI estimation flags from nutrition object if present
    let nutritionToSave = nutrition;
    const nutritionAiEstimated = nutrition && typeof nutrition === 'object' 
      ? (nutrition._ai_estimated || false) 
      : false;
    
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

    // Ensure ingredients and instructions are arrays
    const ingredientsArray = Array.isArray(ingredients) ? ingredients : []
    const instructionsArray = Array.isArray(instructions) ? instructions : []

    // Validate and normalize taxonomy fields
    const validatedGenreOfFood = genreOfFood !== undefined 
      ? (genreOfFood && isValidGenreOfFood(genreOfFood) ? genreOfFood : null)
      : undefined;
    const validatedTypeOfDish = typeOfDish !== undefined
      ? (Array.isArray(typeOfDish) ? validateTypeOfDishArray(typeOfDish) : null)
      : undefined;
    const validatedMethodOfCooking = methodOfCooking !== undefined
      ? (methodOfCooking && isValidMethodOfCooking(methodOfCooking) ? methodOfCooking : null)
      : undefined;

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        recipe_name: recipe_name || undefined,
        author: author !== undefined ? (author || null) : undefined,
        description: description !== undefined ? (description || null) : undefined,
        link: link !== undefined ? (link || null) : undefined,
        servings: servings !== undefined ? servings : undefined,
        prep_time_minutes: prep_time_minutes !== undefined ? prep_time_minutes : undefined,
        cook_time_minutes: cook_time_minutes !== undefined ? cook_time_minutes : undefined,
        ingredients: ingredientsArray.length > 0 ? JSON.stringify(ingredientsArray) : undefined,
        instructions: instructionsArray.length > 0 ? JSON.stringify(instructionsArray) : undefined,
        nutrition: nutritionToSave ? JSON.stringify(nutritionToSave) : undefined,
        nutrition_ai_estimated: nutritionAiEstimated !== undefined ? nutritionAiEstimated : undefined,
        made_before: made_before !== undefined ? made_before : undefined,
        genreOfFood: validatedGenreOfFood !== undefined ? validatedGenreOfFood : undefined,
        typeOfDish: validatedTypeOfDish !== undefined ? (validatedTypeOfDish ? JSON.stringify(validatedTypeOfDish) : null) : undefined,
        methodOfCooking: validatedMethodOfCooking !== undefined ? validatedMethodOfCooking : undefined,
        image: image !== undefined ? (image || null) : undefined,
        userNotes: userNotes !== undefined ? (userNotes || null) : undefined,
        authorsNotes: authorsNotes !== undefined ? (authorsNotes || null) : undefined,
        originalFile: originalFile !== undefined ? (originalFile || null) : undefined,
        originalFileName: originalFileName !== undefined ? (originalFileName || null) : undefined,
        originalFileType: originalFileType !== undefined ? (originalFileType || null) : undefined,
      },
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
      nutrition_ai_estimated: recipe.nutrition_ai_estimated || false,
      nutrition_servings_used: nutritionData?._servings_used || null,
      typeOfDish: recipe.typeOfDish ? JSON.parse(recipe.typeOfDish) : null,
      methodOfCooking: recipe.methodOfCooking || null,
      userNotes: recipe.userNotes || null,
      authorsNotes: recipe.authorsNotes || null,
    }, { status: 200 })
  } catch (error) {
    console.error("Error updating recipe:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id;

    // Verify recipe belongs to user
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: userId,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    await prisma.recipe.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting recipe:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

