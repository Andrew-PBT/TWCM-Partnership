// lib/shopify-sync.ts
import { DatabaseService } from "@/lib/db";

interface ShopifyCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  accepts_marketing?: boolean;
  created_at: string;
  updated_at: string;
  orders_count: number;
  total_spent: string;
}

interface ShopifyOrderResponse {
  orders: any[];
}

interface SyncStats {
  customersProcessed: number;
  customersCreated: number;
  customersUpdated: number;
  ordersProcessed: number;
  ordersCreated: number;
  ordersSkipped: number;
  errors: string[];
}

export class ShopifySyncService {
  private shopName: string;
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.shopName = process.env.SHOPIFY_SHOP_NAME || "";
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || "";
    this.apiVersion = process.env.SHOPIFY_API_VERSION || "2024-04";

    if (!this.shopName) {
      throw new Error("SHOPIFY_SHOP_NAME environment variable is required");
    }
    if (!this.accessToken) {
      throw new Error("SHOPIFY_ACCESS_TOKEN environment variable is required");
    }
  }

  private getShopifyUrl(endpoint: string): string {
    return `https://${this.shopName}.myshopify.com/admin/api/${this.apiVersion}${endpoint}`;
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": this.accessToken,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async syncCustomer(shopifyCustomer: ShopifyCustomer): Promise<void> {
    const customerData = {
      email: shopifyCustomer.email,
      shopifyId: shopifyCustomer.id,
      firstName: shopifyCustomer.first_name,
      lastName: shopifyCustomer.last_name,
      phone: shopifyCustomer.phone,
      acceptsMarketing: shopifyCustomer.accepts_marketing || false,
    };

    await DatabaseService.upsertCustomer(customerData);
  }

  private async syncOrder(shopifyOrder: any): Promise<{ created: boolean }> {
    try {
      // Check if order already exists
      const existingOrder = await DatabaseService.getOrderById(shopifyOrder.id.toString());

      if (existingOrder) {
        console.log(`⏭️ Order ${shopifyOrder.order_number} already exists, skipping`);
        return { created: false };
      }

      // Transform Shopify order to our format (similar to webhook processing)
      const clubInfo = this.extractClubInfo(shopifyOrder);
      const assignedStore = clubInfo ? this.lookupStoreForClub(clubInfo) : undefined;

      // Extract products
      const products =
        shopifyOrder.line_items?.map((item: any) => ({
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
        id: shopifyOrder.customer?.id,
        email: shopifyOrder.email,
        firstName: shopifyOrder.customer?.first_name,
        lastName: shopifyOrder.customer?.last_name,
        phone: shopifyOrder.customer?.phone,
        acceptsMarketing: shopifyOrder.customer?.accepts_marketing,
      };

      // Determine status
      const status = this.determineOrderStatus(shopifyOrder, assignedStore);

      const orderData = {
        id: `${shopifyOrder.id}-sync`,
        orderId: shopifyOrder.id,
        orderNumber: shopifyOrder.order_number,
        name: shopifyOrder.name,
        customer: customer,
        customerEmail: shopifyOrder.email,
        totalPrice: shopifyOrder.total_price,
        subtotalPrice: shopifyOrder.subtotal_price,
        totalTax: shopifyOrder.total_tax,
        currency: shopifyOrder.currency,
        products: products,
        lineItemsCount: shopifyOrder.line_items?.length || 0,
        totalQuantity: products.reduce((sum: number, item: any) => sum + item.quantity, 0),
        fulfillmentStatus: shopifyOrder.fulfillment_status,
        financialStatus: shopifyOrder.financial_status,
        clubInfo: clubInfo,
        assignedStore: assignedStore?.name,
        assignedStoreId: assignedStore?.id,
        assignedStoreEmail: assignedStore?.email,
        status: status,
        createdAt: shopifyOrder.created_at,
        updatedAt: shopifyOrder.updated_at,
        timestamp: new Date().toISOString(),
        shopifyShop: this.shopName,
        source: "shopify-sync",
        tags: shopifyOrder.tags,
        note: shopifyOrder.note,
        orderStatusUrl: shopifyOrder.order_status_url,
      };

      await DatabaseService.createOrder(orderData);
      console.log(`✅ Created order ${shopifyOrder.order_number}`);
      return { created: true };
    } catch (error) {
      console.error(`❌ Error syncing order ${shopifyOrder.order_number}:`, error);
      throw error;
    }
  }

  private extractClubInfo(order: any): string | undefined {
    // Check discount codes
    if (order.discount_codes && order.discount_codes.length > 0) {
      const clubCode = order.discount_codes.find(
        (code: any) => code.code.startsWith("CLUB_") || code.code.includes("CLUB")
      );
      if (clubCode) return clubCode.code;
    }

    // Check order tags
    if (order.tags && order.tags.includes("Club:")) {
      const clubTag = order.tags.split(",").find((tag: string) => tag.trim().startsWith("Club:"));
      return clubTag ? clubTag.replace("Club:", "").trim() : undefined;
    }

    // Check note attributes
    if (order.note_attributes) {
      const clubAttr = order.note_attributes.find((attr: any) => attr.name.toLowerCase() === "club");
      return clubAttr ? clubAttr.value : undefined;
    }

    return undefined;
  }

  private lookupStoreForClub(clubName: string): any {
    const clubStoreMapping: any = {
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

    return clubStoreMapping[clubName.toUpperCase()] || undefined;
  }

  private determineOrderStatus(order: any, assignedStore: any): string {
    if (order.cancelled_at) return "cancelled";
    if (order.fulfillment_status === "fulfilled") return "fulfilled";
    if (order.fulfillment_status === "partial") return "partially_fulfilled";
    if (order.financial_status === "paid" && !order.fulfillment_status) return "ready_to_fulfill";
    if (order.financial_status === "pending") return "payment_pending";
    if (assignedStore) return "assigned";
    return "pending";
  }

  async syncAllCustomers(limit: number = 250): Promise<SyncStats> {
    console.log("🔄 Starting customer sync from Shopify...");

    const stats: SyncStats = {
      customersProcessed: 0,
      customersCreated: 0,
      customersUpdated: 0,
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersSkipped: 0,
      errors: [],
    };

    try {
      let pageInfo: string | null = null;
      let hasMore = true;
      let pageCount = 1;

      while (hasMore) {
        console.log(`📄 Fetching customers page ${pageCount}...`);

        // Use cursor-based pagination for API 2025-04
        let url = this.getShopifyUrl(`/customers.json?limit=${limit}`);
        if (pageInfo) {
          url += `&page_info=${pageInfo}`;
        }

        const response = await fetch(url, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Shopify API Error:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText.substring(0, 500),
            url: url,
          });
          throw new Error(
            `Shopify API error: ${response.status} ${response.statusText}\nDetails: ${errorText.substring(0, 200)}`
          );
        }

        const data = await response.json();
        const customers: ShopifyCustomer[] = data.customers || [];

        if (customers.length === 0) {
          hasMore = false;
          break;
        }

        for (const customer of customers) {
          try {
            await this.syncCustomer(customer);
            stats.customersProcessed++;
            stats.customersCreated++;
          } catch (error) {
            const errorMsg = `Customer ${customer.email}: ${error instanceof Error ? error.message : "Unknown error"}`;
            stats.errors.push(errorMsg);
            console.error("❌", errorMsg);
          }
        }

        console.log(`✅ Processed ${customers.length} customers from page ${pageCount}`);

        // Check for next page using Link header
        const linkHeader = response.headers.get("Link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          // Extract page_info from Link header
          const nextMatch = linkHeader.match(/page_info=([^&>]+).*rel="next"/);
          pageInfo = nextMatch ? nextMatch[1] : null;
          hasMore = !!pageInfo;
        } else {
          hasMore = false;
        }

        pageCount++;

        // Shopify rate limiting - wait between requests
        await this.delay(500);
      }

      console.log(`🎉 Customer sync completed! Processed ${stats.customersProcessed} customers`);
      return stats;
    } catch (error) {
      console.error("❌ Customer sync failed:", error);
      stats.errors.push(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return stats;
    }
  }

  async syncAllOrders(daysBack: number = 365, limit: number = 250): Promise<SyncStats> {
    console.log(`🔄 Starting order sync from Shopify (last ${daysBack} days)...`);

    const stats: SyncStats = {
      customersProcessed: 0,
      customersCreated: 0,
      customersUpdated: 0,
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersSkipped: 0,
      errors: [],
    };

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      let pageInfo: string | null = null;
      let hasMore = true;
      let pageCount = 1;

      while (hasMore) {
        console.log(`📄 Fetching orders page ${pageCount}...`);

        // Use cursor-based pagination for API 2025-04
        let url = this.getShopifyUrl(
          `/orders.json?limit=${limit}&status=any&created_at_min=${startDate.toISOString()}`
        );
        if (pageInfo) {
          url += `&page_info=${pageInfo}`;
        }

        const response = await fetch(url, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Shopify API Error:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText.substring(0, 500),
            url: url,
          });
          throw new Error(
            `Shopify API error: ${response.status} ${response.statusText}\nDetails: ${errorText.substring(0, 200)}`
          );
        }

        const data: ShopifyOrderResponse = await response.json();
        const orders = data.orders || [];

        if (orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          try {
            const result = await this.syncOrder(order);
            stats.ordersProcessed++;

            if (result.created) {
              stats.ordersCreated++;
            } else {
              stats.ordersSkipped++;
            }
          } catch (error) {
            const errorMsg = `Order ${order.order_number}: ${error instanceof Error ? error.message : "Unknown error"}`;
            stats.errors.push(errorMsg);
            console.error("❌", errorMsg);
          }
        }

        console.log(`✅ Processed ${orders.length} orders from page ${pageCount}`);

        // Check for next page using Link header
        const linkHeader = response.headers.get("Link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          // Extract page_info from Link header
          const nextMatch = linkHeader.match(/page_info=([^&>]+).*rel="next"/);
          pageInfo = nextMatch ? nextMatch[1] : null;
          hasMore = !!pageInfo;
        } else {
          hasMore = false;
        }

        pageCount++;

        // Shopify rate limiting - wait between requests
        await this.delay(500);
      }

      console.log(
        `🎉 Order sync completed! Processed ${stats.ordersProcessed} orders, created ${stats.ordersCreated} new orders`
      );
      return stats;
    } catch (error) {
      console.error("❌ Order sync failed:", error);
      stats.errors.push(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return stats;
    }
  }
}
