// app/api/debug-order-lookup/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { orderId } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  try {
    console.log(`🔍 Debug: Looking up order ${orderId}`);

    // Get orders from our internal API
    const baseUrl = new URL(request.url).origin;
    const orderResponse = await fetch(`${baseUrl}/api/orders`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!orderResponse.ok) {
      throw new Error(`Orders API failed: ${orderResponse.status}`);
    }

    const orderData = await orderResponse.json();

    console.log(`📋 Total orders found: ${orderData.orders?.length || 0}`);

    // Log all order IDs for debugging
    const allOrderIds =
      orderData.orders?.map((o: any) => ({
        internalId: o.id,
        shopifyId: o.orderId,
        orderNumber: o.orderNumber,
        name: o.name,
      })) || [];

    console.log(`📋 All order IDs:`, allOrderIds);

    // Try to find the order using different strategies
    const strategies = [
      {
        name: "Exact internal ID match",
        result: orderData.orders?.find((o: any) => o.id === orderId),
      },
      {
        name: "Shopify ID match (string)",
        result: orderData.orders?.find((o: any) => o.orderId?.toString() === orderId),
      },
      {
        name: "Shopify ID match (number)",
        result: orderData.orders?.find((o: any) => o.orderId?.toString() === orderId.split("-")[0]),
      },
      {
        name: "Order number match",
        result: orderData.orders?.find((o: any) => o.orderNumber?.toString() === orderId),
      },
    ];

    const foundStrategies = strategies.filter((s) => s.result);

    return NextResponse.json({
      searchOrderId: orderId,
      totalOrders: orderData.orders?.length || 0,
      allOrderIds,
      strategies,
      foundOrders: foundStrategies,
      success: foundStrategies.length > 0,
    });
  } catch (error) {
    console.error("❌ Debug order lookup error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        orderId,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Debug Order Lookup Endpoint",
    usage: {
      method: "POST",
      body: {
        orderId: "string (required)",
      },
    },
    example: 'POST with { "orderId": "6664509653304-1750066822223" }',
  });
}
