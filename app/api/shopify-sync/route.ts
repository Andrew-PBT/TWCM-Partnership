// app/api/shopify-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ShopifySyncService } from "@/lib/shopify-sync";

export async function POST(request: NextRequest) {
  try {
    const { action, options = {} } = await request.json();

    const syncService = new ShopifySyncService();

    console.log(`🚀 Starting Shopify sync: ${action}`);

    switch (action) {
      case "sync_customers": {
        const { limit = 250 } = options;
        const stats = await syncService.syncAllCustomers(limit);

        return NextResponse.json({
          success: true,
          action: "sync_customers",
          stats,
          message: `Successfully processed ${stats.customersProcessed} customers`,
        });
      }

      case "sync_orders": {
        const { daysBack = 365, limit = 250 } = options;
        const stats = await syncService.syncAllOrders(daysBack, limit);

        return NextResponse.json({
          success: true,
          action: "sync_orders",
          stats,
          message: `Successfully processed ${stats.ordersProcessed} orders (${stats.ordersCreated} new)`,
        });
      }

      case "sync_all": {
        const { daysBack = 365, limit = 250 } = options;

        console.log("📥 Step 1: Syncing customers...");
        const customerStats = await syncService.syncAllCustomers(limit);

        console.log("📦 Step 2: Syncing orders...");
        const orderStats = await syncService.syncAllOrders(daysBack, limit);

        return NextResponse.json({
          success: true,
          action: "sync_all",
          stats: {
            customers: customerStats,
            orders: orderStats,
          },
          message: `Sync completed! ${customerStats.customersProcessed} customers, ${orderStats.ordersCreated} new orders`,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'sync_customers', 'sync_orders', or 'sync_all'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ Sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Shopify Data Sync API",
    endpoints: {
      POST: {
        description: "Sync data from Shopify",
        actions: {
          sync_customers: {
            description: "Sync all customers from Shopify",
            options: {
              limit: "Number of customers per page (default: 250)",
            },
          },
          sync_orders: {
            description: "Sync orders from Shopify",
            options: {
              daysBack: "How many days back to sync (default: 365)",
              limit: "Number of orders per page (default: 250)",
            },
          },
          sync_all: {
            description: "Sync both customers and orders",
            options: {
              daysBack: "How many days back to sync orders (default: 365)",
              limit: "Items per page (default: 250)",
            },
          },
        },
      },
    },
    examples: [
      {
        description: "Sync all data (recommended first run)",
        request: {
          action: "sync_all",
          options: { daysBack: 365 },
        },
      },
      {
        description: "Sync only customers",
        request: {
          action: "sync_customers",
        },
      },
      {
        description: "Sync recent orders (last 30 days)",
        request: {
          action: "sync_orders",
          options: { daysBack: 30 },
        },
      },
    ],
  });
}
