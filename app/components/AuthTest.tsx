"use client";

import { useAuth } from "@/lib/auth-context";

export default function AuthTest() {
  const { isAuthenticated, loading, user, login, logout } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 border rounded">
        <h3>Not authenticated</h3>
        <button onClick={login} className="btn-primary mt-2">
          Sign In with Okta
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded">
      <h3>Authenticated!</h3>
      <p>Welcome, {user?.name || user?.email}</p>
      <button onClick={logout} className="btn-secondary mt-2">
        Sign Out
      </button>
      <details className="mt-4">
        <summary>User Info</summary>
        <pre className="bg-gray-100 p-2 mt-2 text-xs">{JSON.stringify(user, null, 2)}</pre>
      </details>
    </div>
  );
}
