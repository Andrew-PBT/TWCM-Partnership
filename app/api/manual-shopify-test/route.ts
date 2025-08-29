// app/api/manual-shopify-test/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { orderId, method = "note" } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  try {
    console.log(`🧪 Testing manual Shopify update for order: ${orderId}`);

    if (method === "note") {
      // Test 1: Simple note update (should work)
      const noteUpdate = {
        order: {
          id: orderId,
          note: `✅ MANUAL TEST - Fulfilled via TWCM Partnership at ${new Date().toLocaleString()}`,
        },
      };

      const noteUrl = `https://bbf359-c9.myshopify.com/admin/api/2024-04/orders/${orderId}.json`;

      console.log("📝 Testing note update:", { url: noteUrl, data: noteUpdate });

      const noteResponse = await fetch(noteUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
        },
        body: JSON.stringify(noteUpdate),
      });

      const noteResponseText = await noteResponse.text();
      console.log("📡 Note update response:", {
        status: noteResponse.status,
        statusText: noteResponse.statusText,
        body: noteResponseText.substring(0, 500),
      });

      if (noteResponse.ok) {
        return NextResponse.json({
          success: true,
          method: "note",
          message: "Note update successful",
          response: JSON.parse(noteResponseText),
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            method: "note",
            error: `Note update failed: ${noteResponse.status}`,
            response: noteResponseText,
          },
          { status: noteResponse.status }
        );
      }
    } else if (method === "tags") {
      // Test 2: Tags update
      const tagsUpdate = {
        order: {
          id: orderId,
          tags: `manual-test-${Date.now()}, twcm-fulfilled`,
        },
      };

      const tagsUrl = `https://bbf359-c9.myshopify.com/admin/api/2024-04/orders/${orderId}.json`;

      console.log("🏷️ Testing tags update:", { url: tagsUrl, data: tagsUpdate });

      const tagsResponse = await fetch(tagsUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
        },
        body: JSON.stringify(tagsUpdate),
      });

      const tagsResponseText = await tagsResponse.text();
      console.log("📡 Tags update response:", {
        status: tagsResponse.status,
        body: tagsResponseText.substring(0, 500),
      });

      if (tagsResponse.ok) {
        return NextResponse.json({
          success: true,
          method: "tags",
          message: "Tags update successful",
          response: JSON.parse(tagsResponseText),
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            method: "tags",
            error: `Tags update failed: ${tagsResponse.status}`,
            response: tagsResponseText,
          },
          { status: tagsResponse.status }
        );
      }
    } else if (method === "fulfillment_simple") {
      // Test 3: Ultra-simple fulfillment request
      const simpleFulfillment = {
        fulfillment: {},
      };

      const fulfillmentUrl = `https://bbf359-c9.myshopify.com/admin/api/2024-04/orders/${orderId}/fulfillments.json`;

      console.log("📦 Testing ultra-simple fulfillment:", { url: fulfillmentUrl, data: simpleFulfillment });

      const fulfillmentResponse = await fetch(fulfillmentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
        },
        body: JSON.stringify(simpleFulfillment),
      });

      const fulfillmentResponseText = await fulfillmentResponse.text();
      console.log("📡 Simple fulfillment response:", {
        status: fulfillmentResponse.status,
        body: fulfillmentResponseText,
      });

      if (fulfillmentResponse.ok) {
        return NextResponse.json({
          success: true,
          method: "fulfillment_simple",
          message: "Simple fulfillment successful!",
          response: JSON.parse(fulfillmentResponseText),
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            method: "fulfillment_simple",
            error: `Simple fulfillment failed: ${fulfillmentResponse.status}`,
            response: fulfillmentResponseText,
          },
          { status: fulfillmentResponse.status }
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid method" }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ Manual test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Manual Shopify Test Endpoint",
    usage: {
      method: "POST",
      body: {
        orderId: "string (required)",
        method: "note | tags | fulfillment_simple (optional, default: note)",
      },
    },
    examples: [
      'POST with { "orderId": "6664336605496", "method": "note" }',
      'POST with { "orderId": "6664336605496", "method": "tags" }',
      'POST with { "orderId": "6664336605496", "method": "fulfillment_simple" }',
    ],
  });
}
