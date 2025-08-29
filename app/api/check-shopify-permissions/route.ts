// app/api/check-shopify-permissions/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Checking Shopify API permissions...");

    const shopName = process.env.SHOPIFY_SHOP_NAME;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-04";

    if (!shopName || !accessToken) {
      return NextResponse.json(
        {
          error: "Missing Shopify configuration",
          shopName: !!shopName,
          accessToken: !!accessToken,
        },
        { status: 500 }
      );
    }

    // Test different endpoints to see what permissions we have
    const tests = [
      {
        name: "Shop Info",
        endpoint: `/shop.json`,
        permission: "read_products (basic)",
      },
      {
        name: "Orders",
        endpoint: `/orders.json?limit=1`,
        permission: "read_orders",
      },
      {
        name: "Customers",
        endpoint: `/customers.json?limit=1`,
        permission: "read_customers",
      },
      {
        name: "Products",
        endpoint: `/products.json?limit=1`,
        permission: "read_products",
      },
      {
        name: "Fulfillments",
        endpoint: `/orders.json?limit=1&fulfillment_status=any`,
        permission: "write_orders (for fulfillments)",
      },
    ];

    const results = [];

    for (const test of tests) {
      try {
        const url = `https://${shopName}.myshopify.com/admin/api/${apiVersion}${test.endpoint}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
        });

        results.push({
          test: test.name,
          endpoint: test.endpoint,
          permission: test.permission,
          status: response.status,
          success: response.ok,
          error: response.ok ? null : `${response.status} ${response.statusText}`,
        });
      } catch (error) {
        results.push({
          test: test.name,
          endpoint: test.endpoint,
          permission: test.permission,
          status: "ERROR",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Summary
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      shopName,
      apiVersion,
      hasAccessToken: !!accessToken,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
      },
      results,
      recommendations:
        failed.length > 0
          ? [
              "Some API endpoints are failing. This usually means:",
              "1. Your access token doesn't have the required permissions",
              "2. You need to update your Shopify app's scopes",
              "3. You may need to reinstall/reauthorize your app",
              "",
              "Required scopes for full functionality:",
              "- read_customers (for customer sync)",
              "- read_orders (for order sync)",
              "- write_orders (for fulfillments)",
              "- read_products (for product data)",
            ]
          : ["✅ All permissions are working correctly!"],
    });
  } catch (error) {
    console.error("❌ Permission check failed:", error);
    return NextResponse.json(
      {
        error: "Permission check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
