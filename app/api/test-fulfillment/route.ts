// app/api/test-fulfillment/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { orderId, trackingNumber, carrier } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  try {
    // Test with the absolute minimal fulfillment request
    const minimalFulfillmentRequest = {
      fulfillment: {
        notify_customer: false, // Disable notifications to avoid issues
        // No tracking info to keep it simple
      },
    };

    const url = `https://bbf359-c9.myshopify.com/admin/api/2024-04/orders/${orderId}/fulfillments.json`;

    console.log("🧪 Testing minimal fulfillment request:", {
      url,
      orderId,
      data: minimalFulfillmentRequest,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
      },
      body: JSON.stringify(minimalFulfillmentRequest),
    });

    const responseText = await response.text();
    console.log("📡 Response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      responseData = { rawResponse: responseText };
    }

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "Minimal fulfillment successful!",
        fulfillment: responseData,
      });
    } else {
      // If minimal fails, try with fulfillment orders API
      console.log("ℹ️ Minimal fulfillment failed, trying fulfillment orders...");

      try {
        // Get fulfillment orders first
        const fulfillmentOrdersUrl = `https://bbf359-c9.myshopify.com/admin/api/2024-04/orders/${orderId}/fulfillment_orders.json`;
        const foResponse = await fetch(fulfillmentOrdersUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
          },
        });

        if (foResponse.ok) {
          const foData = await foResponse.json();
          const fulfillmentOrder = foData.fulfillment_orders?.[0];

          if (fulfillmentOrder) {
            console.log("📦 Found fulfillment order:", fulfillmentOrder.id);

            // Try fulfillment orders API
            const foFulfillmentUrl = `https://bbf359-c9.myshopify.com/admin/api/2024-04/fulfillment_orders/${fulfillmentOrder.id}/fulfillments.json`;
            const foFulfillmentRequest = {
              fulfillment: {
                notify_customer: false,
                line_items: fulfillmentOrder.line_items.map((item: any) => ({
                  id: item.id,
                  quantity: item.quantity,
                })),
              },
            };

            const foFulfillmentResponse = await fetch(foFulfillmentUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
              },
              body: JSON.stringify(foFulfillmentRequest),
            });

            const foResponseText = await foFulfillmentResponse.text();
            console.log("📡 Fulfillment Orders API Response:", {
              status: foFulfillmentResponse.status,
              body: foResponseText,
            });

            if (foFulfillmentResponse.ok) {
              const foResponseData = JSON.parse(foResponseText);
              return NextResponse.json({
                success: true,
                message: "Fulfillment Orders API successful!",
                method: "fulfillment_orders",
                fulfillment: foResponseData,
              });
            }
          }
        }
      } catch (foError) {
        console.log("❌ Fulfillment Orders API also failed:", foError);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Both fulfillment methods failed",
          legacyAPI: {
            status: response.status,
            statusText: response.statusText,
            response: responseData,
          },
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("❌ Test fulfillment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
