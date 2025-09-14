import { NextRequest, NextResponse } from "next/server";
import { HybridCustomerService } from "@/lib/hybrid-customer-service";

export async function POST(request: NextRequest) {
  try {
    const { limit = 50 } = await request.json().catch(() => ({}));

    console.log(`🔄 Starting background metafields sync (limit: ${limit})...`);

    const customerService = new HybridCustomerService();
    const stats = await customerService.syncAllCustomersMetafields(limit);

    const response = {
      success: true,
      message: "Background sync completed",
      stats: stats,
      timestamp: new Date().toISOString(),
      recommendations: [
        "Run this sync daily to keep customer assignments fresh",
        "Monitor errors to identify customers with invalid metafields",
        "Increase limit if you have many customers to sync",
      ],
    };

    console.log("✅ Background sync completed:", stats);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Background sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Background sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Background Metafields Sync API",
    description: "Refreshes customer metafields and club/store assignments for existing customers",
    usage: {
      method: "POST",
      body: {
        limit: "number (optional, default: 50) - Max customers to sync per run",
      },
    },
    examples: [
      {
        description: "Sync 50 customers (default)",
        request: { limit: 50 },
      },
      {
        description: "Quick sync (10 customers)",
        request: { limit: 10 },
      },
    ],
    scheduling: [
      "Set up a cron job to run this daily",
      "Use a service like Vercel Cron or GitHub Actions",
      "Monitor the stats to ensure sync is working properly",
    ],
  });
}
