-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipe_name" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "link" TEXT,
    "servings" INTEGER,
    "prep_time_minutes" INTEGER,
    "cook_time_minutes" INTEGER,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "nutrition" TEXT,
    "nutrition_ai_estimated" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "fileHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Recipe" ("author", "cook_time_minutes", "createdAt", "description", "fileHash", "id", "image", "ingredients", "instructions", "link", "nutrition", "prep_time_minutes", "recipe_name", "servings", "updatedAt", "userId") SELECT "author", "cook_time_minutes", "createdAt", "description", "fileHash", "id", "image", "ingredients", "instructions", "link", "nutrition", "prep_time_minutes", "recipe_name", "servings", "updatedAt", "userId" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE INDEX "Recipe_fileHash_idx" ON "Recipe"("fileHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
