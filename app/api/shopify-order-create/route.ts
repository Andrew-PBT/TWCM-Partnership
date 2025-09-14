import { NextRequest, NextResponse } from "next/server";
import { HybridCustomerService } from "../../../lib/hybrid-customer-service";
import { ShopifyOrder, Order } from "../../../types";

export async function POST(request: NextRequest) {
  console.log("📦 CLEAN ORDER WEBHOOK - Processing with metafields-only assignment...");

  try {
    const order: ShopifyOrder = await request.json();
    const customerService = new HybridCustomerService();

    // Get assignment using hybrid approach (database first, API fallback)
    const assignment = await customerService.getOrderAssignment(order.email, order.customer?.id?.toString());

    console.log(`📋 Assignment result for ${order.email}:`, {
      source: assignment.assignmentSource,
      club: assignment.clubName,
      store: assignment.assignedStoreName,
    });

    // Extract products
    const products =
      order.line_items?.map((item) => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        name: item.name,
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        price: item.price,
        totalPrice: (parseFloat(item.price) * item.quantity).toFixed(2),
        sku: item.sku,
        vendor: item.vendor,
        fulfillment_status: item.fulfillment_status,
        image: item.image?.src || null,
      })) || [];

    // Extract customer info
    const customer = {
      id: order.customer?.id,
      email: order.email,
      firstName: order.customer?.first_name,
      lastName: order.customer?.last_name,
      phone: order.customer?.phone,
      acceptsMarketing: order.customer?.accepts_marketing,
    };

    // Determine order status
    const getOrderStatus = (order: ShopifyOrder, hasAssignment: boolean): string => {
      if (order.cancelled_at) return "cancelled";
      if (order.fulfillment_status === "fulfilled") return "fulfilled";
      if (order.fulfillment_status === "partial") return "partially_fulfilled";
      if (order.financial_status === "paid" && !order.fulfillment_status) return "ready_to_fulfill";
      if (order.financial_status === "pending") return "payment_pending";
      if (hasAssignment) return "assigned";
      return "pending";
    };

    // Create clean order object
    const orderData: Order = {
      id: `${order.id}-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.order_number,
      name: order.name,

      // Customer info
      customer: customer,
      customerEmail: order.email,

      // Order details
      totalPrice: order.total_price,
      subtotalPrice: order.subtotal_price,
      totalTax: order.total_tax,
      currency: order.currency,

      // Products
      products: products,
      lineItemsCount: order.line_items?.length || 0,
      totalQuantity: products.reduce((sum, item) => sum + item.quantity, 0),

      // Fulfillment
      fulfillmentStatus: order.fulfillment_status,
      financialStatus: order.financial_status,

      // Club and store assignment (metafields-based only)
      clubInfo: assignment.clubName,
      assignedStore: assignment.assignedStoreName,
      assignedStoreId: assignment.assignedStoreId,
      assignedStoreEmail: undefined, // Will be populated by DatabaseService

      // Status and timestamps
      status: getOrderStatus(order, !!assignment.assignedStoreId) as any,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      timestamp: new Date().toISOString(),

      // Additional info
      shopifyShop: request.headers.get("x-shopify-shop-domain") || undefined,
      source: "shopify-metafields",
      tags: order.tags,
      note: order.note,
      orderStatusUrl: order.order_status_url,
    };

    console.log("🆕 CLEAN ORDER PROCESSED:", {
      orderId: order.id,
      orderNumber: order.order_number,
      customerEmail: order.email,
      assignmentSource: assignment.assignmentSource,
      clubInfo: orderData.clubInfo || "No club assigned",
      assignedStore: orderData.assignedStore || "No store assigned",
      status: orderData.status,
    });

    // Store in database
    try {
      const baseUrl = new URL(request.url).origin;
      await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
    } catch (dbError) {
      console.error("Failed to store order in database:", dbError);
    }

    // Notification for assignments
    if (assignment.assignedStoreName) {
      console.log(`📧 TODO: Notify ${assignment.assignedStoreName} about new order ${order.order_number}`);
    } else {
      console.log(`⚠️ Order ${order.order_number} requires manual assignment - no club/store found for ${order.email}`);
    }

    return NextResponse.json({
      message: "Order processed with metafields-only assignment",
      orderId: order.id,
      orderNumber: order.order_number,
      customerEmail: order.email,
      assignment: {
        source: assignment.assignmentSource,
        club: assignment.clubName,
        store: assignment.assignedStoreName,
        requiresManualAssignment: !assignment.assignedStoreId,
      },
      status: orderData.status,
      timestamp: orderData.timestamp,
    });
  } catch (error) {
    console.error("❌ Clean webhook error:", error);
    return NextResponse.json(
      {
        error: "Error processing order",
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
