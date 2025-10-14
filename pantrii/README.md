# Pantrii 🍳

**Your kitchen, organized.** Meal prep, recipes, grocery lists, and kitchen organization in one modern app.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.3-2D3748)](https://prisma.io/)

## ✨ Features

### 🔐 **Authentication System**
- **User Registration & Login** - Secure email/password authentication
- **Protected Routes** - Dashboard and API endpoints require authentication
- **Session Management** - Persistent login sessions with NextAuth.js
- **Password Security** - Bcrypt hashing for secure password storage

### 🧠 **Smart Recipe Parsing**
- **Measurement-Based Detection** - Automatically identifies ingredients by cooking measurements
- **Action-Oriented Instructions** - Recognizes cooking steps by action verbs
- **Flexible Format Support** - Works with various recipe formats and OCR results
- **Google Cloud Integration** - Document AI for PDF text extraction

### 📱 **Modern UI/UX**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode Support** - Beautiful dark/light theme switching
- **Glassmorphism Effects** - Modern, elegant design language
- **Accessibility** - WCAG compliant interface

### 🗄️ **Database & Storage**
- **SQLite Database** - Lightweight, file-based database
- **Prisma ORM** - Type-safe database operations
- **User Data** - Secure user profiles and recipe storage
- **Recipe Management** - Full CRUD operations for recipes

## 🚀 Quick Start

### Prerequisites
- Node.js 20.9.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/avarwilliams/pantrii.git
   cd pantrii
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   GOOGLE_APPLICATION_CREDENTIALS="./keys/your-service-account.json"
   GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   ```

4. **Set up the database**
   ```bash
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### **Frontend**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **NextAuth.js** - Authentication framework

### **Backend**
- **API Routes** - Next.js API endpoints
- **Prisma ORM** - Database management
- **SQLite** - Local database storage
- **Google Cloud APIs** - Document AI and Vision API

### **Database Schema**
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String?
  recipes       Recipe[]
  // ... other fields
}

model Recipe {
  id          String   @id @default(cuid())
  title       String
  ingredients String
  instructions String
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  // ... other fields
}
```

## 🧠 Smart Recipe Parsing

The app uses intelligent parsing to extract ingredients and instructions:

### **Ingredient Detection**
- **Measurement Patterns**: `1/2 cup`, `2 tablespoons`, `500g`, `1 lb`
- **Cooking Terms**: `pinch`, `dash`, `handful`, `diced`, `chopped`
- **Common Ingredients**: `salt`, `pepper`, `flour`, `butter`, `garlic`

### **Instruction Detection**
- **Numbered Steps**: `1. Preheat oven`, `2. Mix ingredients`
- **Action Verbs**: `preheat`, `mix`, `stir`, `bake`, `fry`, `sauté`
- **Cooking Methods**: `roast`, `boil`, `simmer`, `grill`, `broil`

## 📁 Project Structure

```
pantrii/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── recipes/       # Recipe management
│   │   │   └── scan/          # PDF/image scanning
│   │   ├── dashboard/         # Protected dashboard
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   └── scan/             # Recipe scanning page
│   ├── components/            # Reusable components
│   ├── lib/                   # Utility functions
│   └── middleware.ts          # Route protection
├── prisma/                    # Database schema
├── public/                    # Static assets
└── uploads/                   # File uploads
```

## 🔧 Configuration

### **Google Cloud Setup** (Optional)
For PDF scanning functionality:

1. **Create a Google Cloud Project**
2. **Enable Document AI API**
3. **Create a Service Account**
4. **Download JSON credentials**
5. **Set environment variables**

### **Database Configuration**
The app uses SQLite by default. For production, consider PostgreSQL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/pantrii"
```

## 🚀 Deployment

### **Vercel** (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### **Other Platforms**
- **Railway**: Easy PostgreSQL + deployment
- **Render**: Full-stack hosting
- **DigitalOcean**: VPS deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - Amazing React framework
- **Prisma** - Excellent database toolkit
- **Tailwind CSS** - Beautiful utility-first CSS
- **Google Cloud** - Powerful AI services
- **NextAuth.js** - Simple authentication

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/avarwilliams/pantrii/issues)
- **Discussions**: [GitHub Discussions](https://github.com/avarwilliams/pantrii/discussions)
- **Email**: [your-email@example.com](mailto:your-email@example.com)

---

**Made with ❤️ for food lovers everywhere**