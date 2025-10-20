"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome to</h2>
          <h1 className="text-4xl font-bold text-blue-600 mt-2">
            TerryWhite Chemmart Partnership Dashboard
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Manage sports club orders and store assignments
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={login}
            className="w-full flex justify-center items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Sign in with Okta
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Sign in to access the order management dashboard
        </p>
      </div>
    </div>
  );
}
