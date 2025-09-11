// app/api/list-customers/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const shopName = process.env.SHOPIFY_SHOP_NAME;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-04";

    if (!shopName || !accessToken) {
      return NextResponse.json({ error: "Missing Shopify configuration" }, { status: 500 });
    }

    // Get all customers
    const customersUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/customers.json?limit=250`;

    const response = await fetch(customersUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch customers: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data: any = await response.json();
    const customers: any[] = data.customers || [];

    // Format customer list for easy viewing
    const customerList = customers.map((customer: any) => ({
      id: customer.id,
      name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
      email: customer.email,
      phone: customer.phone,
      orders_count: customer.orders_count,
      total_spent: customer.total_spent,
      state: customer.state,
      created_at: customer.created_at,
      has_metafields: customer.metafields && customer.metafields.length > 0,
      metafield_count: customer.metafields ? customer.metafields.length : 0,
    }));

    // Check specifically for "Andrew"
    const andrewCustomers = customers.filter(
      (customer: any) =>
        customer.first_name?.toLowerCase().includes("andrew") ||
        customer.last_name?.toLowerCase().includes("andrew") ||
        customer.email?.toLowerCase().includes("andrew")
    );

    console.log("=== ALL CUSTOMERS ===");
    customerList.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.email})`);
    });

    return NextResponse.json({
      total_customers: customers.length,
      customers: customerList,
      andrew_customers:
        andrewCustomers.length > 0
          ? andrewCustomers.map((c: any) => ({
              id: c.id,
              name: `${c.first_name} ${c.last_name}`,
              email: c.email,
            }))
          : "No customers named Andrew found",
      raw_customers: customers, // Full customer data
    });
  } catch (error) {
    console.error("Error listing customers:", error);
    return NextResponse.json(
      {
        error: "Failed to list customers",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
