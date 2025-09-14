// lib/hybrid-customer-service.ts
import { prisma } from "@/lib/db";

interface CustomerMetafields {
  clubBrand?: string;
  partnerStore?: string;
}

interface OrderAssignment {
  clubId?: string;
  clubName?: string;
  assignedStoreId?: string;
  assignedStoreName?: string;
  assignmentSource: "database" | "api" | "none";
}

export class HybridCustomerService {
  private shopName: string;
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.shopName = process.env.SHOPIFY_SHOP_NAME || "";
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN || "";
    this.apiVersion = process.env.SHOPIFY_API_VERSION || "2024-04";
  }

  async getOrderAssignment(customerEmail: string, shopifyCustomerId?: string): Promise<OrderAssignment> {
    // Step 1: Check database first for existing club assignment
    const dbAssignment = await this.getAssignmentFromDatabase(customerEmail);
    if (dbAssignment.assignedStoreId) {
      console.log(`✅ Found assignment in database for ${customerEmail}: ${dbAssignment.assignedStoreName}`);
      return { ...dbAssignment, assignmentSource: "database" };
    }

    // Step 2: If not in database and we have Shopify ID, fetch from API
    if (shopifyCustomerId) {
      console.log(`🔍 No database assignment found, fetching from Shopify API for customer ${shopifyCustomerId}...`);

      try {
        const apiAssignment = await this.getAssignmentFromAPI(shopifyCustomerId, customerEmail);
        if (apiAssignment.assignedStoreId) {
          console.log(`✅ Found assignment via API for ${customerEmail}: ${apiAssignment.assignedStoreName}`);
          return { ...apiAssignment, assignmentSource: "api" };
        }
      } catch (error) {
        console.error(`❌ Failed to fetch assignment from API for ${shopifyCustomerId}:`, error);
      }
    }

    // Step 3: No assignment found
    console.log(`⚠️ No assignment found for ${customerEmail}`);
    return { assignmentSource: "none" };
  }

  private async getAssignmentFromDatabase(customerEmail: string): Promise<Partial<OrderAssignment>> {
    const customer = await prisma.customer.findUnique({
      where: { email: customerEmail },
      include: {
        club: {
          include: {
            partnerStore: true,
          },
        },
      },
    });

    if (!customer?.club?.partnerStore) {
      return {};
    }

    return {
      clubId: customer.club.id,
      clubName: customer.club.name,
      assignedStoreId: customer.club.partnerStore.id,
      assignedStoreName: customer.club.partnerStore.name,
    };
  }

  private async getAssignmentFromAPI(
    shopifyCustomerId: string,
    customerEmail: string
  ): Promise<Partial<OrderAssignment>> {
    // Fetch metafields from Shopify
    const metafields = await this.fetchCustomerMetafields(shopifyCustomerId);

    if (!metafields.clubBrand || !metafields.partnerStore) {
      return {};
    }

    // Create/update database records and return assignment
    const { club, store } = await this.syncMetafieldsToDatabase(shopifyCustomerId, customerEmail, metafields);

    return {
      clubId: club.id,
      clubName: club.name,
      assignedStoreId: store.id,
      assignedStoreName: store.name,
    };
  }

  private async fetchCustomerMetafields(shopifyCustomerId: string): Promise<CustomerMetafields> {
    const metafieldsUrl = `https://${this.shopName}.myshopify.com/admin/api/${this.apiVersion}/customers/${shopifyCustomerId}/metafields.json`;

    const response = await fetch(metafieldsUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Metafields API failed: ${response.status}`);
    }

    const data = await response.json();
    const metafieldsList = data.metafields || [];
    const metafields: CustomerMetafields = {};

    for (const metafield of metafieldsList) {
      if (metafield.namespace === "club" && metafield.key === "brand") {
        metafields.clubBrand = metafield.value;
      }
      if (metafield.namespace === "custom" && metafield.key === "partner_store") {
        metafields.partnerStore = metafield.value;
      }
    }

    return metafields;
  }

  private async syncMetafieldsToDatabase(
    shopifyCustomerId: string,
    customerEmail: string,
    metafields: CustomerMetafields
  ): Promise<{ club: any; store: any; customer: any }> {
    // Find or create store
    const store = await this.findOrCreateStore(metafields.partnerStore!);

    // Find or create club
    const club = await this.findOrCreateClub(metafields.clubBrand!, shopifyCustomerId, customerEmail, store.id);

    // Update customer with club assignment
    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        clubId: club.id,
        shopifyId: shopifyCustomerId,
      },
      create: {
        email: customerEmail,
        shopifyId: shopifyCustomerId,
        clubId: club.id,
      },
    });

    console.log(`📝 Synced to database: ${customerEmail} -> ${club.name} -> ${store.name}`);

    return { club, store, customer };
  }

  private async findOrCreateStore(storeName: string) {
    let store = await prisma.store.findUnique({
      where: { name: storeName },
    });

    if (!store) {
      const email = this.generateStoreEmail(storeName);
      store = await prisma.store.create({
        data: {
          name: storeName,
          email: email,
          active: true,
        },
      });
      console.log(`🏪 Created new store: ${storeName}`);
    }

    return store;
  }

  private async findOrCreateClub(
    clubName: string,
    shopifyCustomerId: string,
    customerEmail: string,
    partnerStoreId: string
  ) {
    let club = await prisma.club.findUnique({
      where: { name: clubName },
    });

    if (!club) {
      club = await prisma.club.create({
        data: {
          name: clubName,
          shopifyCustomerId: shopifyCustomerId,
          email: customerEmail,
          partnerStoreId: partnerStoreId,
        },
      });
      console.log(`🏆 Created new club: ${clubName} -> ${partnerStoreId}`);
    }

    return club;
  }

  private generateStoreEmail(storeName: string): string {
    const slug = storeName
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
    return `${slug}@yourstore.com`;
  }

  // Background sync method for periodic refresh
  async syncAllCustomersMetafields(limit: number = 50): Promise<{
    processed: number;
    updated: number;
    errors: string[];
  }> {
    const stats: {
      processed: number;
      updated: number;
      errors: string[];
    } = {
      processed: 0,
      updated: 0,
      errors: [] as string[],
    };

    try {
      // Get customers with Shopify IDs that might need refresh
      const customersToSync = await prisma.customer.findMany({
        where: {
          shopifyId: { not: null },
          OR: [
            { clubId: null }, // No club assigned yet
            { updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Updated more than 7 days ago
          ],
        },
        take: limit,
      });

      for (const customer of customersToSync) {
        if (!customer.shopifyId) continue;

        try {
          const assignment = await this.getAssignmentFromAPI(customer.shopifyId, customer.email);

          if (assignment.assignedStoreId) {
            stats.updated++;
          }
          stats.processed++;
        } catch (error) {
          const errorMsg = `Customer ${customer.email}: ${error instanceof Error ? error.message : "Unknown error"}`;
          stats.errors.push(errorMsg);
        }
      }

      console.log(`🔄 Background sync completed: ${stats.processed} processed, ${stats.updated} updated`);
    } catch (error) {
      console.error(`❌ Background sync failed:`, error);
      stats.errors.push(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return stats;
  }
}
