// app/api/test-api-version/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing API version and environment variables...");

    const config = {
      shopName: process.env.SHOPIFY_SHOP_NAME,
      hasAccessToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
      apiVersion: process.env.SHOPIFY_API_VERSION,
      accessTokenLength: process.env.SHOPIFY_ACCESS_TOKEN?.length || 0,
    };

    console.log("📋 Environment variables:", config);

    // Test different API versions including 2025
    const apiVersionsToTest = ["2025-04", "2025-01", "2024-10", "2024-07", "2024-04", "2024-01"];
    const results = [];

    for (const version of apiVersionsToTest) {
      try {
        const testUrl = `https://bbf359-c9.myshopify.com/admin/api/${version}/shop.json`;

        console.log(`🧪 Testing API version ${version}:`, testUrl);

        const response = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
          },
        });

        const responseText = await response.text();

        results.push({
          version,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          bodyLength: responseText.length,
          body: response.ok ? JSON.parse(responseText) : responseText.substring(0, 200),
        });
      } catch (error) {
        results.push({
          version,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      config,
      apiVersionTests: results,
      currentConfig: {
        shopName: process.env.SHOPIFY_SHOP_NAME,
        apiVersion: process.env.SHOPIFY_API_VERSION || "2024-04",
        hasAccessToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });
  } catch (error) {
    console.error("❌ API version test failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        config: {
          shopName: process.env.SHOPIFY_SHOP_NAME,
          apiVersion: process.env.SHOPIFY_API_VERSION,
          hasAccessToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
        },
      },
      { status: 500 }
    );
  }
}
