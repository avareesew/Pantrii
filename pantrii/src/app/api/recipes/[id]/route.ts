import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    // Parse JSON fields for response
    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify recipe belongs to user
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    const { 
      recipe_name, 
      servings, 
      prep_time_minutes, 
      cook_time_minutes, 
      ingredients, 
      instructions, 
      nutrition 
    } = await request.json()

    // Ensure ingredients and instructions are arrays
    const ingredientsArray = Array.isArray(ingredients) ? ingredients : []
    const instructionsArray = Array.isArray(instructions) ? instructions : []

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        recipe_name: recipe_name || undefined,
        servings: servings !== undefined ? servings : undefined,
        prep_time_minutes: prep_time_minutes !== undefined ? prep_time_minutes : undefined,
        cook_time_minutes: cook_time_minutes !== undefined ? cook_time_minutes : undefined,
        ingredients: ingredientsArray.length > 0 ? JSON.stringify(ingredientsArray) : undefined,
        instructions: instructionsArray.length > 0 ? JSON.stringify(instructionsArray) : undefined,
        nutrition: nutrition ? JSON.stringify(nutrition) : undefined,
      },
    })

    // Parse JSON fields for response
    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) : null,
    })
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify recipe belongs to user
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: session.user.id,
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

