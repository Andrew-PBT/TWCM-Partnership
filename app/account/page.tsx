"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Account() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Account</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your profile and preferences</p>
          </div>
          <button onClick={logout} className="btn-secondary">
            Sign Out
          </button>
        </div>

        <div className="space-y-6">
          {/* User Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-gray-900">{user?.name || "Not provided"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{user?.email || "Not provided"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Preferred Username</label>
                <p className="mt-1 text-gray-900">{user?.preferred_username || "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="font-medium text-gray-900">Go to Dashboard</div>
            <div className="text-sm text-gray-600">View and manage orders</div>
          </button>
        </div>
      </div>
    </div>
  );
}
