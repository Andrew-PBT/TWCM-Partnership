import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

interface ShopifyFulfilledOrder {
  id: string;
  order_number: string;
  fulfillment_status?: string;
  financial_status?: string;
  updated_at: string;
  [key: string]: any; // Allow for additional Shopify fields
}

interface FulfillmentResponse {
  message: string;
  orderId: string;
  status?: string;
  timestamp: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const order: ShopifyFulfilledOrder = await request.json();

    console.log("✅ ORDER FULFILLED:", {
      orderId: order.id,
      orderNumber: order.order_number,
      fulfillmentStatus: order.fulfillment_status,
      timestamp: new Date().toISOString(),
    });

    // Optional: Update the order in your local storage
    // You could add logic here to sync the fulfillment status
    // with your internal order management system

    return NextResponse.json({
      message: "Fulfillment update received",
      orderId: order.id,
      status: order.fulfillment_status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Order fulfillment webhook error:", error);
    return NextResponse.json(
      {
        error: "Error processing fulfillment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Topic, X-Shopify-Shop-Domain",
    },
  });
}
