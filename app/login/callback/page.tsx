"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { oktaAuth } from "@/lib/okta-config";

export default function LoginCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse tokens from URL
        await oktaAuth.handleLoginRedirect();

        // Redirect to home page
        router.push("/");
      } catch (err) {
        console.error("Callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Authentication Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
