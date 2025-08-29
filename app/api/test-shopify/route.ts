// app/api/test-shopify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ShopifyService } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const shopifyService = new ShopifyService();

    console.log("🧪 Testing Shopify connection...");

    // Test basic connection
    const shop = await shopifyService.testConnection();

    return NextResponse.json({
      success: true,
      message: "Shopify connection successful",
      shop: {
        name: shop.name,
        domain: shop.domain,
        email: shop.email,
      },
      config: {
        shopName: process.env.SHOPIFY_SHOP_NAME,
        hasAccessToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
        apiVersion: process.env.SHOPIFY_API_VERSION,
      },
    });
  } catch (error) {
    console.error("❌ Shopify test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        config: {
          shopName: process.env.SHOPIFY_SHOP_NAME,
          hasAccessToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
          apiVersion: process.env.SHOPIFY_API_VERSION,
          accessTokenPreview: process.env.SHOPIFY_ACCESS_TOKEN
            ? process.env.SHOPIFY_ACCESS_TOKEN.substring(0, 10) + "..."
            : "NOT_SET",
        },
      },
      { status: 500 }
    );
  }
}
