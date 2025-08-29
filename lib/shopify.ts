// lib/shopify.ts - Final working version
interface ShopifyFulfillmentRequest {
  fulfillment: {
    location_id?: number;
    tracking_number?: string;
    tracking_urls?: string[];
    tracking_company?: string;
    notify_customer?: boolean;
    line_items?: Array<{
      id: string;
      quantity: number;
    }>;
    line_items_by_fulfillment_order?: Array<{
      fulfillment_order_id: string;
      fulfillment_order_line_items: Array<{
        id: string;
        quantity: number;
      }>;
    }>;
    tracking_info?: {
      number: string;
      company: string;
      url?: string;
    };
  };
}

interface ShopifyConfig {
  shopName: string;
  accessToken: string;
  apiVersion: string;
}

export class ShopifyService {
  private config: ShopifyConfig;

  constructor() {
    this.config = {
      shopName: process.env.SHOPIFY_SHOP_NAME || "",
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN || "",
      apiVersion: process.env.SHOPIFY_API_VERSION || "2025-04",
    };

    console.log("🔧 ShopifyService initialized:", {
      shopName: this.config.shopName,
      hasAccessToken: !!this.config.accessToken,
      apiVersion: this.config.apiVersion,
      accessTokenPrefix: this.config.accessToken ? this.config.accessToken.substring(0, 10) + "..." : "NOT_SET",
    });

    if (!this.config.shopName) {
      throw new Error("SHOPIFY_SHOP_NAME environment variable is required");
    }
    if (!this.config.accessToken) {
      throw new Error("SHOPIFY_ACCESS_TOKEN environment variable is required");
    }
  }

  private getShopifyUrl(endpoint: string): string {
    return `https://${this.config.shopName}.myshopify.com/admin/api/${this.config.apiVersion}${endpoint}`;
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": this.config.accessToken,
    };
  }

  async createFulfillment(
    orderId: string,
    fulfillmentData: {
      trackingNumber?: string;
      trackingUrl?: string;
      carrier?: string;
      notifyCustomer?: boolean;
      lineItems?: Array<{ id: string; quantity: number }>;
    }
  ) {
    try {
      console.log("📋 Starting fulfillment creation for order:", orderId);

      // Get the order to validate state
      const order = await this.getOrder(orderId);

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (order.fulfillment_status === "fulfilled") {
        throw new Error(`Order ${orderId} is already fulfilled`);
      }

      if (order.cancelled_at) {
        throw new Error(`Order ${orderId} is cancelled and cannot be fulfilled`);
      }

      if (order.financial_status !== "paid") {
        throw new Error(`Order ${orderId} must be paid before fulfillment (current status: ${order.financial_status})`);
      }

      console.log("📋 Order details:", {
        id: order.id,
        name: order.name,
        fulfillment_status: order.fulfillment_status,
        financial_status: order.financial_status,
        line_items_count: order.line_items?.length,
      });

      // Use modern fulfillment orders API (recommended approach)
      console.log("🔍 Attempting modern fulfillment orders API...");
      try {
        return await this.createFulfillmentViaFulfillmentOrders(orderId, fulfillmentData);
      } catch (fulfillmentOrderError) {
        console.log("⚠️ Fulfillment Orders API failed, falling back to legacy...");
        console.log(
          "Error:",
          fulfillmentOrderError instanceof Error ? fulfillmentOrderError.message : fulfillmentOrderError
        );

        // Fallback to legacy API
        return await this.createLegacyFulfillment(orderId, fulfillmentData, order);
      }
    } catch (error) {
      console.error("❌ Error creating Shopify fulfillment:", error);
      throw error;
    }
  }

  private async createFulfillmentViaFulfillmentOrders(
    orderId: string,
    fulfillmentData: {
      trackingNumber?: string;
      trackingUrl?: string;
      carrier?: string;
      notifyCustomer?: boolean;
    }
  ): Promise<any> {
    // Step 1: Get fulfillment orders for this order
    const fulfillmentOrdersUrl = this.getShopifyUrl(`/orders/${orderId}/fulfillment_orders.json`);

    console.log("🔍 Getting fulfillment orders:", fulfillmentOrdersUrl);

    const fulfillmentOrdersResponse = await fetch(fulfillmentOrdersUrl, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!fulfillmentOrdersResponse.ok) {
      const errorText = await fulfillmentOrdersResponse.text();
      throw new Error(`Failed to get fulfillment orders: ${fulfillmentOrdersResponse.status} - ${errorText}`);
    }

    const fulfillmentOrdersData = await fulfillmentOrdersResponse.json();
    const fulfillmentOrders = fulfillmentOrdersData.fulfillment_orders;

    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
      throw new Error("No fulfillment orders found for this order");
    }

    const fulfillmentOrder = fulfillmentOrders[0];

    console.log("📦 Using fulfillment order:", {
      id: fulfillmentOrder.id,
      status: fulfillmentOrder.status,
      request_status: fulfillmentOrder.request_status,
      line_items_count: fulfillmentOrder.line_items?.length,
      supported_actions: fulfillmentOrder.supported_actions,
    });

    // Check if fulfillment order supports creating fulfillments
    if (!fulfillmentOrder.supported_actions?.includes("create_fulfillment")) {
      throw new Error("Fulfillment order does not support create_fulfillment action");
    }

    // Step 2: Create fulfillment using the modern format
    const fulfillmentRequest: ShopifyFulfillmentRequest = {
      fulfillment: {
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id: fulfillmentOrder.id,
            fulfillment_order_line_items: fulfillmentOrder.line_items.map((item: any) => ({
              id: item.id,
              quantity: item.quantity,
            })),
          },
        ],
        notify_customer: fulfillmentData.notifyCustomer ?? true,
      },
    };

    // Add tracking information if provided
    if (fulfillmentData.trackingNumber) {
      fulfillmentRequest.fulfillment.tracking_info = {
        number: fulfillmentData.trackingNumber,
        company: fulfillmentData.carrier || "Other",
      };

      if (fulfillmentData.trackingUrl) {
        fulfillmentRequest.fulfillment.tracking_info.url = fulfillmentData.trackingUrl;
      }
    }

    // Use the modern fulfillments endpoint
    const fulfillmentUrl = this.getShopifyUrl("/fulfillments.json");

    console.log("🚀 Creating fulfillment via fulfillment orders API:", {
      fulfillmentOrderId: fulfillmentOrder.id,
    });

    const response = await fetch(fulfillmentUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(fulfillmentRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      console.error("❌ Fulfillment Orders API failed:", {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      });

      throw new Error(`Fulfillment Orders API failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log("✅ Fulfillment created via fulfillment orders API:", responseData);
    return responseData;
  }

  private async createLegacyFulfillment(
    orderId: string,
    fulfillmentData: {
      trackingNumber?: string;
      trackingUrl?: string;
      carrier?: string;
      notifyCustomer?: boolean;
    },
    order: any
  ): Promise<any> {
    console.log("🚀 Creating fulfillment via legacy API");

    // Get location for legacy API (required for some configurations)
    let locationId: number | undefined;

    try {
      const locationsUrl = this.getShopifyUrl("/locations.json");
      const locationsResponse = await fetch(locationsUrl, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const activeLocation = locationsData.locations?.find((loc: any) => loc.active);
        if (activeLocation) {
          locationId = activeLocation.id;
          console.log("📍 Using location:", { id: locationId, name: activeLocation.name });
        }
      }
    } catch (locationError) {
      console.log("⚠️ Could not fetch locations for legacy API");
    }

    const legacyFulfillmentRequest: ShopifyFulfillmentRequest = {
      fulfillment: {
        notify_customer: fulfillmentData.notifyCustomer ?? true,
        line_items: order.line_items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      },
    };

    // Add location if available
    if (locationId) {
      legacyFulfillmentRequest.fulfillment.location_id = locationId;
    }

    // Add tracking information
    if (fulfillmentData.trackingNumber) {
      legacyFulfillmentRequest.fulfillment.tracking_number = fulfillmentData.trackingNumber;
    }

    if (fulfillmentData.trackingUrl) {
      legacyFulfillmentRequest.fulfillment.tracking_urls = [fulfillmentData.trackingUrl];
    }

    if (fulfillmentData.carrier) {
      legacyFulfillmentRequest.fulfillment.tracking_company = fulfillmentData.carrier;
    }

    const legacyUrl = this.getShopifyUrl(`/orders/${orderId}/fulfillments.json`);

    console.log("🚀 Sending legacy fulfillment request");

    const legacyResponse = await fetch(legacyUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(legacyFulfillmentRequest),
    });

    if (!legacyResponse.ok) {
      const errorText = await legacyResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      console.error("❌ Legacy fulfillment API failed:", {
        status: legacyResponse.status,
        statusText: legacyResponse.statusText,
        data: errorData,
      });

      throw new Error(`Legacy fulfillment API failed: ${legacyResponse.status} - ${errorText}`);
    }

    const legacyResponseData = await legacyResponse.json();
    console.log("✅ Fulfillment created via legacy API:", legacyResponseData);
    return legacyResponseData;
  }

  async getOrder(orderId: string) {
    try {
      const url = this.getShopifyUrl(`/orders/${orderId}.json`);

      console.log("🔍 Getting order from Shopify:", orderId);

      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }
        throw new Error(`Failed to get order from Shopify: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error("❌ Error getting order from Shopify:", error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const url = this.getShopifyUrl("/shop.json");
      console.log("🧪 Testing Shopify connection:", { url, shopName: this.config.shopName });

      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }
        throw new Error(`Connection test failed: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log("✅ Shopify connection successful:", data.shop?.name);
      return data.shop;
    } catch (error) {
      console.error("❌ Shopify connection test failed:", error);
      throw error;
    }
  }
}
