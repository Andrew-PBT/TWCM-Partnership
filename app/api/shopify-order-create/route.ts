// app/api/shopify-order-create/route.ts - Corrected version
import { NextRequest, NextResponse } from "next/server";
import { ShopifyOrder, Order, Product, Customer, Store } from "@/types";
import { ShopifyService } from "@/lib/shopify";
import { prisma } from "@/lib/db";

async function getAssignedStoreForOrder(order: ShopifyOrder): Promise<Store | undefined> {
  if (!order.customer?.id) return undefined;

  try {
    const shopifyService = new ShopifyService();
    const partnerStoreId = await shopifyService.getPartnerStoreForCustomer(order.customer.id.toString());

    if (partnerStoreId) {
      // Look up store in your database
      const store = await prisma.store.findUnique({
        where: { id: partnerStoreId },
      });
      return store || undefined;
    }

    return undefined;
  } catch (error) {
    console.error("Failed to get assigned store for order:", error);
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  console.log("🔍 INCOMING REQUEST:", {
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
  });

  try {
    const shopifyTopic = request.headers.get("x-shopify-topic");
    const shopifyShop = request.headers.get("x-shopify-shop-domain");
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

    console.log("🔐 SHOPIFY HEADERS:", {
      topic: shopifyTopic,
      shop: shopifyShop,
      hmacPresent: !!hmacHeader,
    });

    const order: ShopifyOrder = await request.json();

    // Get club info from various sources (fallback for existing orders)
    const clubInfo = extractClubInfo(order);

    // Get assigned store via customer metafields (new approach)
    const assignedStore = await getAssignedStoreForOrder(order);

    // Extract products with detailed information
    const products: Product[] =
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

    // Extract customer information (contact person, not the club)
    const customer: Customer = {
      id: order.customer?.id,
      email: order.email,
      firstName: order.customer?.first_name,
      lastName: order.customer?.last_name,
      phone: order.customer?.phone,
      acceptsMarketing: order.customer?.accepts_marketing,
    };

    // Determine order status
    const getOrderStatus = (order: ShopifyOrder, assignedStore?: Store): string => {
      if (order.cancelled_at) return "cancelled";
      if (order.fulfillment_status === "fulfilled") return "fulfilled";
      if (order.fulfillment_status === "partial") return "partially_fulfilled";
      if (order.financial_status === "paid" && !order.fulfillment_status) return "ready_to_fulfill";
      if (order.financial_status === "pending") return "payment_pending";
      if (assignedStore) return "assigned";
      return "pending";
    };

    // Create comprehensive order object for dashboard
    const orderData: Order = {
      id: `${order.id}-${Date.now()}`, // Unique ID for frontend
      orderId: order.id,
      orderNumber: order.order_number,
      name: order.name, // Full order name like #1001

      // Customer info (contact person)
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

      // Club and store assignment
      clubInfo: clubInfo, // Keep this for backward compatibility
      assignedStore: assignedStore?.name,
      assignedStoreId: assignedStore?.id,
      assignedStoreEmail: assignedStore?.email,

      // Status and timestamps
      status: getOrderStatus(order, assignedStore) as any,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      timestamp: new Date().toISOString(),

      // Additional info
      shopifyShop: shopifyShop || undefined,
      source: "shopify",
      tags: order.tags,
      note: order.note,
      orderStatusUrl: order.order_status_url,
    };

    console.log("🆕 ORDER PROCESSED:", {
      orderId: order.id,
      orderNumber: order.order_number,
      customerEmail: order.email,
      customerId: order.customer?.id,
      productsCount: products.length,
      totalQuantity: orderData.totalQuantity,
      clubInfo: clubInfo,
      assignedStore: assignedStore?.name,
      status: orderData.status,
    });

    // Store the order data (send to our orders API)
    try {
      const baseUrl = new URL(request.url).origin;
      await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
    } catch (error) {
      console.error("Failed to store order data:", error);
    }

    // If assigned to a store, you could send notification here
    if (assignedStore) {
      console.log(`📧 TODO: Notify ${assignedStore.name} about new order ${order.order_number}`);
    }

    return NextResponse.json({
      message: "Order received successfully",
      orderId: order.id,
      orderNumber: order.order_number,
      customerEmail: order.email,
      customerId: order.customer?.id,
      productsCount: products.length,
      clubInfo: clubInfo,
      assignedStore: assignedStore?.name,
      status: orderData.status,
      timestamp: orderData.timestamp,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
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

function extractClubInfo(order: ShopifyOrder): string | undefined {
  // Check discount codes
  if (order.discount_codes && order.discount_codes.length > 0) {
    const clubCode = order.discount_codes.find((code) => code.code.startsWith("CLUB_") || code.code.includes("CLUB"));
    if (clubCode) return clubCode.code;
  }

  // Check order tags
  if (order.tags && order.tags.includes("Club:")) {
    const clubTag = order.tags.split(",").find((tag) => tag.trim().startsWith("Club:"));
    return clubTag ? clubTag.replace("Club:", "").trim() : undefined;
  }

  // Check note attributes
  if (order.note_attributes) {
    const clubAttr = order.note_attributes.find((attr) => attr.name.toLowerCase() === "club");
    return clubAttr ? clubAttr.value : undefined;
  }

  return undefined;
}
