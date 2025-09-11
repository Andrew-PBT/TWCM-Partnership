// app/api/customer-metafields/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { customerId } = await request.json();

    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 });
    }

    const shopName = process.env.SHOPIFY_SHOP_NAME;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-04";

    // Method 1: Get customer with metafields included
    console.log(`🔍 Fetching customer ${customerId} with metafields...`);

    const customerUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/customers/${customerId}.json?fields=id,first_name,last_name,email,phone,metafields`;

    const customerResponse = await fetch(customerUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken || "",
      },
    });

    let customerResult: any = {};
    if (customerResponse.ok) {
      customerResult = await customerResponse.json();
      console.log("Customer with metafields:", JSON.stringify(customerResult, null, 2));
    } else {
      customerResult = {
        error: `Customer API failed: ${customerResponse.status}`,
        details: await customerResponse.text(),
      };
    }

    // Method 2: Get metafields directly via metafields API
    const metafieldsUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/customers/${customerId}/metafields.json`;

    const metafieldsResponse = await fetch(metafieldsUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken || "",
      },
    });

    let metafieldsResult: any = {};
    if (metafieldsResponse.ok) {
      metafieldsResult = await metafieldsResponse.json();
      console.log("Direct metafields API:", JSON.stringify(metafieldsResult, null, 2));
    } else {
      metafieldsResult = {
        error: `Metafields API failed: ${metafieldsResponse.status}`,
        details: await metafieldsResponse.text(),
      };
    }

    // Method 3: Try with specific metafield namespaces
    const commonNamespaces = ["global", "custom", "app", "partner_store", "club_brand"];
    const namespaceResults: any = {};

    for (const namespace of commonNamespaces) {
      try {
        const nsUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/customers/${customerId}/metafields.json?namespace=${namespace}`;
        const nsResponse = await fetch(nsUrl, {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken || "",
          },
        });

        if (nsResponse.ok) {
          const nsData = await nsResponse.json();
          namespaceResults[namespace] = nsData;
        }
      } catch (error) {
        namespaceResults[namespace] = { error: error instanceof Error ? error.message : "Unknown error" };
      }
    }

    return NextResponse.json({
      customerId,
      timestamp: new Date().toISOString(),

      method1_customer_with_metafields: customerResult,
      method2_direct_metafields_api: metafieldsResult,
      method3_namespace_search: namespaceResults,

      summary: {
        customer_api_success: customerResponse.ok,
        metafields_api_success: metafieldsResponse.ok,
        customer_has_metafields: customerResult.customer?.metafields?.length > 0,
        direct_metafields_count: metafieldsResult.metafields?.length || 0,
        namespace_results: Object.keys(namespaceResults).filter(
          (ns) => namespaceResults[ns].metafields && namespaceResults[ns].metafields.length > 0
        ),
      },

      recommendations: [
        "Andrew should have Partner Store: 'Gold Coast Store' and Club brand: 'North Star'",
        "If no metafields appear, check API permissions or metafield configuration",
        "Metafields might be in specific namespaces not being queried",
        "Consider checking Shopify admin for exact metafield namespace/key names",
      ],
    });
  } catch (error) {
    console.error("Error fetching customer metafields:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch customer metafields",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Customer Metafields Test Endpoint",
    usage: {
      method: "POST",
      body: { customerId: "9205582692664" },
      description: "Fetches a customer's metafields using multiple methods",
    },
    example: `curl -X POST http://localhost:3000/api/customer-metafields -H "Content-Type: application/json" -d '{"customerId": "9205582692664"}'`,
  });
}
