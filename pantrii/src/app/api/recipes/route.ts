import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recipes = await prisma.recipe.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    })

    // Parse JSON fields for response
    return NextResponse.json(recipes.map(recipe => ({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
    })))
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { 
      recipe_name, 
      servings, 
      prep_time_minutes, 
      cook_time_minutes, 
      ingredients, 
      instructions, 
      nutrition,
      fileHash 
    } = await request.json()

    // Validate required fields
    if (!recipe_name) {
      return NextResponse.json({ error: "recipe_name is required" }, { status: 400 })
    }

    // Ensure ingredients and instructions are arrays
    const ingredientsArray = Array.isArray(ingredients) ? ingredients : []
    const instructionsArray = Array.isArray(instructions) ? instructions : []

    const recipe = await prisma.recipe.create({
      data: {
        recipe_name,
        servings: servings || null,
        prep_time_minutes: prep_time_minutes || null,
        cook_time_minutes: cook_time_minutes || null,
        ingredients: JSON.stringify(ingredientsArray),
        instructions: JSON.stringify(instructionsArray),
        nutrition: nutrition ? JSON.stringify(nutrition) : null,
        fileHash: fileHash || null,
        userId: session.user.id,
      }
    })

    // Parse JSON fields for response
    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating recipe:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}







