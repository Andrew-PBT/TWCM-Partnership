// app/components/SyncDashboard.tsx
"use client";

import { useState } from "react";

interface SyncStats {
  customersProcessed: number;
  customersCreated: number;
  ordersProcessed: number;
  ordersCreated: number;
  ordersSkipped: number;
  errors: string[];
}

interface SyncResponse {
  success: boolean;
  action: string;
  stats: SyncStats | { customers: SyncStats; orders: SyncStats };
  message: string;
}

export default function SyncDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResponse | null>(null);
  const [daysBack, setDaysBack] = useState(365);

  const performSync = async (action: string) => {
    setIsLoading(true);
    setSyncResults(null);

    try {
      const response = await fetch("/api/shopify-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          options: { daysBack },
        }),
      });

      const result: SyncResponse = await response.json();
      setSyncResults(result);

      if (result.success) {
        console.log("✅ Sync completed:", result);
      } else {
        console.error("❌ Sync failed:", result);
      }
    } catch (error) {
      console.error("❌ Sync error:", error);
      setSyncResults({
        success: false,
        action,
        stats: {
          customersProcessed: 0,
          customersCreated: 0,
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersSkipped: 0,
          errors: [`Network error: ${error}`],
        },
        message: "Failed to connect to sync API",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStats = (stats: SyncStats, title: string) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {stats.customersProcessed !== undefined && (
          <>
            <div>
              <span className="text-gray-600">Customers Processed:</span>
              <span className="ml-2 font-medium">{stats.customersProcessed}</span>
            </div>
            <div>
              <span className="text-gray-600">Customers Created:</span>
              <span className="ml-2 font-medium">{stats.customersCreated}</span>
            </div>
          </>
        )}
        {stats.ordersProcessed !== undefined && (
          <>
            <div>
              <span className="text-gray-600">Orders Processed:</span>
              <span className="ml-2 font-medium">{stats.ordersProcessed}</span>
            </div>
            <div>
              <span className="text-gray-600">Orders Created:</span>
              <span className="ml-2 font-medium text-green-600">{stats.ordersCreated}</span>
            </div>
            <div>
              <span className="text-gray-600">Orders Skipped:</span>
              <span className="ml-2 font-medium text-yellow-600">{stats.ordersSkipped}</span>
            </div>
          </>
        )}
        <div>
          <span className="text-gray-600">Errors:</span>
          <span className={`ml-2 font-medium ${stats.errors.length > 0 ? "text-red-600" : "text-green-600"}`}>
            {stats.errors.length}
          </span>
        </div>
      </div>

      {stats.errors.length > 0 && (
        <div className="mt-3">
          <details className="cursor-pointer">
            <summary className="text-red-600 font-medium">View Errors ({stats.errors.length})</summary>
            <div className="mt-2 max-h-40 overflow-y-auto">
              {stats.errors.map((error, index) => (
                <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded mb-1">
                  {error}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Shopify Data Sync</h3>
        <p className="text-sm text-gray-600">
          Pull existing customers and orders from your Shopify store into your database.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Days back to sync orders:</span>
            <input
              type="number"
              value={daysBack}
              onChange={(e) => setDaysBack(parseInt(e.target.value) || 365)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              min="1"
              max="3650"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => performSync("sync_all")}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isLoading ? "Syncing..." : "🔄 Sync All Data"}
          </button>

          <button
            onClick={() => performSync("sync_customers")}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            👥 Sync Customers
          </button>

          <button
            onClick={() => performSync("sync_orders")}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            📦 Sync Orders
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Syncing data from Shopify...</span>
        </div>
      )}

      {/* Results */}
      {syncResults && !isLoading && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-lg ${
              syncResults.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center">
              <span className={`text-lg ${syncResults.success ? "text-green-600" : "text-red-600"}`}>
                {syncResults.success ? "✅" : "❌"}
              </span>
              <span className={`ml-2 font-medium ${syncResults.success ? "text-green-800" : "text-red-800"}`}>
                {syncResults.message}
              </span>
            </div>
          </div>

          {syncResults.success && syncResults.stats && (
            <div className="space-y-4">
              {/* Handle sync_all response (nested stats) */}
              {(syncResults.stats as any).customers && (syncResults.stats as any).orders ? (
                <>
                  {renderStats((syncResults.stats as any).customers, "Customer Sync Results")}
                  {renderStats((syncResults.stats as any).orders, "Order Sync Results")}
                </>
              ) : (
                /* Handle single action response */
                renderStats(
                  syncResults.stats as SyncStats,
                  syncResults.action === "sync_customers"
                    ? "Customer Sync Results"
                    : syncResults.action === "sync_orders"
                    ? "Order Sync Results"
                    : "Sync Results"
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Sync Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>First time?</strong> Use "Sync All Data" to get all your historical data
          </li>
          <li>
            <strong>Regular updates?</strong> Use "Sync Orders" with 7-30 days back
          </li>
          <li>
            <strong>Rate limits:</strong> Shopify allows ~2 requests/second, so large syncs take time
          </li>
          <li>
            <strong>Duplicates:</strong> Existing orders are automatically skipped
          </li>
          <li>
            <strong>Customer data:</strong> Customer info is updated if they already exist
          </li>
        </ul>
      </div>
    </div>
  );
}
