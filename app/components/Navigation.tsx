"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const { isAuthenticated, user } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">TerryWhite Chemmart Partnership Dashboard</h1>
            </Link>

            {isAuthenticated && (
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Dashboard
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user?.name || user?.email || "User"}
                </span>
                <Link
                  href="/account"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/account"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Your Account
                </Link>
              </>
            ) : (
              <span className="text-sm text-gray-900">Sports Club Order Management</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
