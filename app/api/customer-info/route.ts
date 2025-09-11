// app/api/all-customer-fields/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const shopName = process.env.SHOPIFY_SHOP_NAME;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-04";

    if (!shopName || !accessToken) {
      return NextResponse.json({ error: "Missing Shopify configuration" }, { status: 500 });
    }

    console.log("📋 Fetching complete customer data with all fields...");

    // Get customers with all available fields
    const customersUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/customers.json?limit=2`;

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

    const data = await response.json();
    const customers = data.customers || [];

    if (customers.length === 0) {
      return NextResponse.json({
        message: "No customers found",
        availableFields: [],
        sampleData: null,
      });
    }

    // Get the first customer's complete data structure
    const sampleCustomer = customers[0];

    // All possible customer fields from Shopify API documentation
    const allPossibleFields = {
      // Core Identity
      id: "Shopify customer ID",
      email: "Customer email address",
      first_name: "Customer first name",
      last_name: "Customer last name",
      phone: "Customer phone number (E.164 format)",

      // Account Status
      state: "Account state (disabled/invited/enabled/declined)",
      verified_email: "Whether email address is verified",
      created_at: "When customer account was created",
      updated_at: "When customer was last updated",

      // Order History
      orders_count: "Total number of orders (excludes test/archived)",
      total_spent: "Total amount spent across all orders",
      last_order_id: "ID of customer's most recent order",
      last_order_name: "Name of customer's most recent order (e.g., #1001)",

      // Marketing & Communication
      accepts_marketing: "DEPRECATED - use email_marketing_consent",
      marketing_opt_in_level: "DEPRECATED - use email_marketing_consent",
      email_marketing_consent: {
        state: "Email marketing state (subscribed/not_subscribed/pending/unknown)",
        opt_in_level: "Marketing opt-in level (single_opt_in/confirmed_opt_in/unknown)",
        consent_updated_at: "When email consent was last updated",
      },
      sms_marketing_consent: {
        state: "SMS marketing state",
        opt_in_level: "SMS opt-in level",
        consent_updated_at: "When SMS consent was updated",
        consent_collected_from: "Source of SMS consent",
      },

      // Tax Information
      tax_exempt: "Whether customer is exempt from taxes",
      tax_exemptions: "Specific tax exemptions (Canadian taxes)",

      // Address Information
      default_address: "Customer's default address object",
      addresses: "Array of all customer addresses (up to 10 most recent)",

      // Notes & Organization
      note: "Internal notes about customer",
      tags: "Tags attached to customer (comma-separated, up to 250 tags)",

      // Technical
      currency: "DEPRECATED - Customer's preferred currency",
      multipass_identifier: "Multipass login identifier",
      metafield: "Custom metadata fields",

      // Legacy/Deprecated
      password: "DEPRECATED - Customer password",
      password_confirmation: "DEPRECATED - Password confirmation",
    };

    // Show what fields are actually present in the sample customer
    const presentFields = Object.keys(sampleCustomer);
    const missingFields = Object.keys(allPossibleFields).filter((field) => !presentFields.includes(field));

    // Special handling for nested objects
    const nestedObjectAnalysis: any = {};
    if (sampleCustomer.default_address) {
      nestedObjectAnalysis.default_address = Object.keys(sampleCustomer.default_address);
    }
    if (sampleCustomer.addresses && sampleCustomer.addresses.length > 0) {
      nestedObjectAnalysis.addresses = Object.keys(sampleCustomer.addresses[0]);
    }
    if (sampleCustomer.email_marketing_consent) {
      nestedObjectAnalysis.email_marketing_consent = Object.keys(sampleCustomer.email_marketing_consent);
    }
    if (sampleCustomer.sms_marketing_consent) {
      nestedObjectAnalysis.sms_marketing_consent = Object.keys(sampleCustomer.sms_marketing_consent);
    }

    const result = {
      summary: {
        totalCustomersFound: customers.length,
        fieldsInSampleCustomer: presentFields.length,
        possibleFieldsFromDocs: Object.keys(allPossibleFields).length,
      },

      fieldsPresent: presentFields,
      fieldsMissing: missingFields,

      nestedObjectStructure: nestedObjectAnalysis,

      fieldDescriptions: allPossibleFields,

      sampleCustomerData: sampleCustomer,

      metafieldsInfo: {
        hasMetafields: !!sampleCustomer.metafields,
        metafieldCount: sampleCustomer.metafields ? sampleCustomer.metafields.length : 0,
        metafieldsData: sampleCustomer.metafields || "No metafields found",
      },

      recommendations: [
        "All customer data is available through the customers API",
        "For your use case, focus on: id, email, first_name, last_name, phone",
        "Marketing consent: Use email_marketing_consent instead of deprecated accepts_marketing",
        "Address data: Available in default_address and addresses array",
        "Custom data: Use metafields for additional customer information",
        "Your 2 metafield fields should appear in the metafields array if they exist",
      ],
    };

    // Log complete structure to console
    console.log("=== COMPLETE CUSTOMER FIELD ANALYSIS ===");
    console.log("Present fields:", presentFields);
    console.log("Sample customer:", JSON.stringify(sampleCustomer, null, 2));
    console.log("Metafields:", sampleCustomer.metafields);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error analyzing customer fields:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze customer fields",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
