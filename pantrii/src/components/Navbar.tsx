"use client"

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo-pantrii.svg" alt="Pantrii" width={120} height={28} />
          </Link>
          
          <div className="flex items-center gap-4">
            {session ? (
              <Link 
                href="/dashboard" 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register" 
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}




