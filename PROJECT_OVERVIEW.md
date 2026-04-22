# Pantrii — Project Overview

Pantrii is a personal recipe management web app that uses AI to extract recipes from PDFs and images. Users can scan physical recipe cards, cookbook pages, or any document containing a recipe, and the app will parse it into a structured, editable format that gets saved to their personal collection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Prisma ORM |
| Auth | NextAuth v4 (credentials + JWT) |
| AI | Google Gemini Vision API |
| PDF Processing | pdf-img-convert, pdfjs-dist, pdf-parse |
| Image Processing | sharp, canvas |

---

## Project Structure

```
Pantrii/
└── pantrii/                        # Main Next.js app
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx                  # Landing / home page
    │   │   ├── layout.tsx                # Root layout
    │   │   ├── login/page.tsx            # Login page
    │   │   ├── register/page.tsx         # Registration page
    │   │   ├── dashboard/page.tsx        # Recipe collection (protected)
    │   │   ├── scan/
    │   │   │   ├── page.tsx              # Single recipe scan (protected)
    │   │   │   └── bulk/page.tsx         # Bulk scan (protected)
    │   │   ├── manual-recipe/page.tsx    # Manual recipe entry (protected)
    │   │   ├── recipes/[id]/page.tsx     # Individual recipe detail (protected)
    │   │   └── api/
    │   │       ├── auth/
    │   │       │   ├── [...nextauth]/route.ts   # NextAuth handler
    │   │       │   └── register/route.ts        # User registration
    │   │       ├── recipes/
    │   │       │   ├── route.ts                 # GET list / POST create recipe
    │   │       │   └── [id]/route.ts            # GET / PATCH / DELETE by ID
    │   │       ├── scan/route.ts                # AI scan endpoint
    │   │       ├── upload/route.ts              # File upload endpoint
    │   │       └── models/route.ts              # List available Gemini models
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   └── SessionProvider.tsx
    │   ├── lib/
    │   │   ├── auth.ts                   # NextAuth config
    │   │   ├── geminiVision.ts           # Core AI extraction logic
    │   │   ├── geminiImageExtractor.ts   # Image-specific Gemini helpers
    │   │   ├── imageExtractor.ts         # General image extraction
    │   │   ├── pdfConverter.ts           # PDF → image conversion
    │   │   ├── recipeCache.ts            # File hash-based caching
    │   │   ├── recipeTaxonomy.ts         # Controlled vocabulary enums
    │   │   ├── fileHash.ts               # MD5/SHA hashing util
    │   │   └── listGeminiModels.ts       # Gemini model listing util
    │   ├── middleware.ts                 # Route protection
    │   └── globals.css
    ├── prisma/
    │   ├── schema.prisma                 # DB schema
    │   └── dev.db                        # SQLite database file
    ├── uploads/                          # Temp file uploads
    ├── keys/                             # Google Cloud service account key (gitignored)
    ├── .env                              # Environment variables
    ├── .env.local                        # Local overrides
    ├── next.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## Database Schema (Prisma + SQLite)

### `User`
Standard user model. Password is hashed with bcryptjs. Ties into NextAuth's Account, Session, and VerificationToken models.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| email | String | Unique |
| password | String? | Hashed |
| name | String? | Display name |
| image | String? | Avatar |
| createdAt / updatedAt | DateTime | Auto-managed |

### `Recipe`
The core data model. JSON fields (ingredients, instructions, nutrition, typeOfDish) are stored as serialized strings and parsed on the API layer.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| recipe_name | String | Required |
| author | String? | |
| description | String? | |
| link | String? | Source URL |
| servings | Int? | |
| prep_time_minutes | Int? | |
| cook_time_minutes | Int? | |
| ingredients | String | JSON array of `{ quantity, unit, ingredient, notes }` |
| instructions | String | JSON array of `{ step_number, instruction }` |
| nutrition | String? | JSON object (calories, protein, fat, carbs, etc.) |
| nutrition_ai_estimated | Boolean | True if nutrition was AI-generated |
| made_before | Boolean | User flag |
| genreOfFood | String? | Enum — see taxonomy |
| typeOfDish | String? | JSON array, up to 3 values — see taxonomy |
| methodOfCooking | String? | Enum — see taxonomy |
| image | String? | Base64 photo |
| originalFile | String? | Base64 of source document |
| originalFileName | String? | |
| originalFileType | String? | |
| fileHash | String? | Indexed — used for deduplication/caching |
| userNotes | String? | |
| authorsNotes | String? | |
| userId | String | Foreign key to User |

---

## Authentication

- NextAuth v4 with a **credentials provider** (email + password).
- Sessions are JWT-based.
- Route protection is enforced in `src/middleware.ts` — unauthenticated users are redirected to `/login`.
- Protected routes: `/dashboard`, `/scan`, `/scan/bulk`, `/manual-recipe`, `/recipes/[id]`.
- Password hashing: `bcryptjs`.

---

## AI Recipe Extraction

The heart of the app. When a user uploads a PDF or image on the `/scan` page:

1. The file is sent to `/api/scan`.
2. A SHA-based **file hash** is computed. If this hash matches a cached result in the database, the cached recipe is returned immediately (no re-processing).
3. PDFs are converted to images (one image per page) using `pdf-img-convert`.
4. Images are sent to the **Gemini Vision API** (`gemini-2.5-flash-preview` with fallback to `gemini-2.5-flash`) with a structured prompt.
5. Gemini returns a JSON recipe object.
6. The result is validated and normalized (`validateAndNormalizeRecipe`):
   - Taxonomy fields are validated against controlled enums.
   - ALL-CAPS text is title-cased.
   - Retry logic triggers if instructions are missing.
7. If nutrition data is incomplete, a second Gemini call estimates missing values from the ingredient list.
8. The extracted recipe (plus base64-encoded original file) is returned to the client.
9. The user reviews and edits the prefilled form, then saves to the database.

### Key file: `src/lib/geminiVision.ts`
Contains `extractRecipeFromImage()`, `estimateNutritionFromIngredients()`, and `validateAndNormalizeRecipe()`.

---

## Recipe Taxonomy

Taxonomy values are controlled enums defined in `src/lib/recipeTaxonomy.ts`. They are validated on both extraction and save.

| Field | Type | Examples |
|---|---|---|
| `genreOfFood` | Single value | Italian, Mexican, Japanese, American, Indian... (38 options) |
| `typeOfDish` | Array, max 3 | Soup, Salad, Pasta, Dessert, Appetizer... (48 options) |
| `methodOfCooking` | Single value | Baked, Stovetop, Grilled, Slow Cooker... (9 options) |

---

## Environment Variables

Create a `.env` file in the `pantrii/` directory with the following:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="a-long-random-secret-string"

# Gemini AI (required for scanning)
GOOGLE_AI_API_KEY="your-gemini-api-key"

# Google Cloud (optional — only needed if using Document AI / Vision API)
GOOGLE_APPLICATION_CREDENTIALS="./keys/your-service-account.json"
GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"
```

`GOOGLE_AI_API_KEY` is the only AI credential required for the core scan feature. Get it from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## Running Locally

```bash
# From the pantrii/ directory
npm install

# Set up the database
npx prisma generate
npx prisma db push

# Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Key Behaviors & Gotchas

- **File storage**: Original source files (PDFs/images) are stored as **base64 strings directly in SQLite**. This works fine for a personal/small-scale app but would not scale well.
- **Caching**: The scan endpoint checks `fileHash` before calling Gemini. Re-uploading the same file will return the cached result instantly.
- **JSON fields**: `ingredients`, `instructions`, `nutrition`, and `typeOfDish` are stored as JSON-serialized strings in SQLite (Prisma does not support native JSON on SQLite). The API layer parses them on read and serializes them on write.
- **PDF handling**: PDFs are converted to page images before being sent to Gemini. Multi-page PDFs send all pages. The canvas and pdfjs-dist packages are externalized from Webpack to avoid SSR issues (`next.config.ts`).
- **Nutrition estimation**: If a scanned recipe is missing nutrition data, a second Gemini call estimates it from the ingredient list. The `nutrition_ai_estimated` flag is set to `true` in that case.
- **Model fallback**: The scan route tries `gemini-2.5-flash-preview` first, falling back to `gemini-2.5-flash` if the model is unavailable.
- **No file upload persistence between restarts**: Files saved to the `uploads/` directory are ephemeral — they are not committed and are not cleaned up automatically.

---

## Pages at a Glance

| Route | Description | Auth Required |
|---|---|---|
| `/` | Landing page | No |
| `/login` | Login form | No |
| `/register` | Sign up form | No |
| `/dashboard` | View all saved recipes | Yes |
| `/scan` | Upload a PDF/image and extract a recipe | Yes |
| `/scan/bulk` | Scan multiple recipes at once | Yes |
| `/manual-recipe` | Manually enter a recipe | Yes |
| `/recipes/[id]` | View a single saved recipe | Yes |
