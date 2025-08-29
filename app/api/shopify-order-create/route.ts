// app/api/shopify-order-create/route.ts - Updated without shipping
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ShopifyOrder, Order, Product, Customer, Store } from "@/types";

interface ClubStoreMapping {
  [key: string]: Store;
}

const clubStoreMapping: ClubStoreMapping = {
  CLUB_BRISBANE_TIGERS: {
    id: "store_001",
    name: "Brisbane CBD Store",
    email: "brisbane@yourstore.com",
  },
  CLUB_GOLD_COAST_EAGLES: {
    id: "store_002",
    name: "Gold Coast Store",
    email: "goldcoast@yourstore.com",
  },
  CLUB_SYDNEY_SHARKS: {
    id: "store_003",
    name: "Sydney Store",
    email: "sydney@yourstore.com",
  },
  CLUB_TEST_CLUB: {
    id: "store_test",
    name: "Test Store",
    email: "test@yourstore.com",
  },
};

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
    const clubInfo = extractClubInfo(order);
    const assignedStore = clubInfo ? lookupStoreForClub(clubInfo) : undefined;

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

    // Extract customer information
    const customer: Customer = {
      id: order.customer?.id,
      email: order.email,
      firstName: order.customer?.first_name,
      lastName: order.customer?.last_name,
      phone: order.customer?.phone,
      acceptsMarketing: order.customer?.accepts_marketing,
    };

    // Determine order status
    const getOrderStatus = (order: ShopifyOrder): string => {
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

      // Club and store assignment
      clubInfo: clubInfo,
      assignedStore: assignedStore?.name,
      assignedStoreId: assignedStore?.id,
      assignedStoreEmail: assignedStore?.email,

      // Status and timestamps
      status: getOrderStatus(order) as any,
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

function lookupStoreForClub(clubName: string): Store | undefined {
  return clubStoreMapping[clubName.toUpperCase()] || undefined;
}
