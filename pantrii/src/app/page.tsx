import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Your Recipe Collection
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Scan, store, and organize your favorite recipes in one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/register" 
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Get Started
            </Link>
            <Link 
              href="/login" 
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-2xl mx-auto">
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <Image src="/feature-recipes.svg" alt="" width={48} height={48} className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Scan Recipes</h3>
            <p className="text-gray-600">Upload PDFs or images to automatically extract recipe details</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <Image src="/feature-recipes.svg" alt="" width={48} height={48} className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Store & Edit</h3>
            <p className="text-gray-600">Save recipes to your collection and edit them anytime</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-green-600 text-white p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="mb-6">Start building your recipe collection today</p>
          <Link 
            href="/register" 
            className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
          >
            Create Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 Pantrii. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
