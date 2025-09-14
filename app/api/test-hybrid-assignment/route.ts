// app/api/test-hybrid-assignment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HybridCustomerService } from "@/lib/hybrid-customer-service";

export async function POST(request: NextRequest) {
  try {
    const { customerEmail, shopifyCustomerId } = await request.json();

    if (!customerEmail) {
      return NextResponse.json({ error: "customerEmail required" }, { status: 400 });
    }

    console.log(`🧪 Testing hybrid assignment for: ${customerEmail}`);

    const customerService = new HybridCustomerService();

    // Test the hybrid assignment process
    const assignment = await customerService.getOrderAssignment(customerEmail, shopifyCustomerId);

    const result = {
      customerEmail,
      shopifyCustomerId,
      assignment,
      timestamp: new Date().toISOString(),

      explanation: {
        database_first: "Checked database for existing club/store assignment",
        api_fallback: shopifyCustomerId ? "Used Shopify API if not found in database" : "Skipped (no Shopify ID)",
        result: assignment.assignmentSource,
        recommendation:
          assignment.assignmentSource === "none"
            ? "Customer needs metafields: club.brand and custom.partner_store in Shopify"
            : `Order will be automatically assigned to ${assignment.assignedStoreName}`,
      },

      test_scenarios: {
        andrew_scharf: {
          email: "andrew.scharf@pbatechnology.com.au",
          shopifyId: "9205582692664",
          expected: "Should assign to Gold Coast Store via North Star club",
        },
        unknown_customer: {
          email: "test@example.com",
          shopifyId: null,
          expected: "Should return 'none' - no assignment possible",
        },
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test hybrid assignment error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Test Hybrid Assignment System",
    description: "Tests the database-first, API-fallback assignment system",
    usage: {
      method: "POST",
      body: {
        customerEmail: "string (required)",
        shopifyCustomerId: "string (optional)",
      },
    },
    test_examples: [
      {
        description: "Test Andrew (known to have metafields)",
        request: {
          customerEmail: "andrew.scharf@pbatechnology.com.au",
          shopifyCustomerId: "9205582692664",
        },
      },
      {
        description: "Test unknown customer",
        request: {
          customerEmail: "unknown@example.com",
        },
      },
    ],
  });
}
