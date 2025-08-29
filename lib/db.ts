// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Database service functions
export class DatabaseService {
  static async createOrder(orderData: any) {
    try {
      // First, ensure customer exists
      const customer = await prisma.customer.upsert({
        where: { email: orderData.customerEmail },
        update: {
          shopifyId: orderData.customer?.id ? orderData.customer.id.toString() : null,
          firstName: orderData.customer?.firstName,
          lastName: orderData.customer?.lastName,
          phone: orderData.customer?.phone,
          acceptsMarketing: orderData.customer?.acceptsMarketing || false,
        },
        create: {
          email: orderData.customerEmail,
          shopifyId: orderData.customer?.id ? orderData.customer.id.toString() : null,
          firstName: orderData.customer?.firstName,
          lastName: orderData.customer?.lastName,
          phone: orderData.customer?.phone,
          acceptsMarketing: orderData.customer?.acceptsMarketing || false,
        },
      });

      // Create order with nested relations
      const order = await prisma.order.create({
        data: {
          orderId: orderData.orderId.toString(),
          orderNumber: orderData.orderNumber.toString(),
          name: orderData.name,
          customerEmail: orderData.customerEmail,
          customerId: orderData.customer?.id ? orderData.customer.id.toString() : null,
          totalPrice: orderData.totalPrice,
          subtotalPrice: orderData.subtotalPrice,
          totalTax: orderData.totalTax,
          currency: orderData.currency,
          lineItemsCount: orderData.lineItemsCount,
          totalQuantity: orderData.totalQuantity,
          fulfillmentStatus: orderData.fulfillmentStatus,
          financialStatus: orderData.financialStatus,
          clubInfo: orderData.clubInfo,
          assignedStore: orderData.assignedStore,
          assignedStoreId: orderData.assignedStoreId,
          assignedStoreEmail: orderData.assignedStoreEmail,
          status: this.mapOrderStatus(orderData.status),
          shopifyCreatedAt: new Date(orderData.createdAt || orderData.timestamp),
          shopifyUpdatedAt: orderData.updatedAt ? new Date(orderData.updatedAt) : null,
          shopifyShop: orderData.shopifyShop,
          source: orderData.source || "shopify",
          tags: orderData.tags,
          note: orderData.note,
          orderStatusUrl: orderData.orderStatusUrl,
          trackingNumber: orderData.trackingNumber,
          trackingUrl: orderData.trackingUrl,
          carrier: orderData.carrier,
          internalNotes: orderData.internalNotes,
          statusNote: orderData.statusNote,
          assignedAt: orderData.assignedAt ? new Date(orderData.assignedAt) : null,
          fulfilledAt: orderData.fulfilledAt ? new Date(orderData.fulfilledAt) : null,

          // Create products
          products: {
            create:
              orderData.products?.map((product: any) => ({
                shopifyId: product.id.toString(),
                productId: product.productId.toString(),
                variantId: product.variantId.toString(),
                name: product.name,
                title: product.title,
                variantTitle: product.variant_title,
                quantity: product.quantity,
                price: product.price,
                totalPrice: product.totalPrice,
                sku: product.sku,
                vendor: product.vendor,
                fulfillmentStatus: product.fulfillment_status,
                image: product.image,
              })) || [],
          },
        },
        include: {
          customer: true,
          products: true,
        },
      });

      console.log(`✅ Order created in database: ${order.orderNumber}`);
      return order;
    } catch (error) {
      console.error("❌ Error creating order in database:", error);
      throw error;
    }
  }

  static async getOrders(
    filters: {
      status?: string;
      store?: string;
      club?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const { status, store, club, search, limit = 50, offset = 0 } = filters;

      const where: any = {};

      // Filter by status
      if (status && status !== "all") {
        where.status = this.mapOrderStatus(status);
      }

      // Filter by store
      if (store) {
        where.assignedStore = {
          contains: store,
          mode: "insensitive",
        };
      }

      // Filter by club
      if (club) {
        where.clubInfo = {
          contains: club,
          mode: "insensitive",
        };
      }

      // Search filter
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: "insensitive" } },
          { customerEmail: { contains: search, mode: "insensitive" } },
          { clubInfo: { contains: search, mode: "insensitive" } },
          { assignedStore: { contains: search, mode: "insensitive" } },
          { products: { some: { name: { contains: search, mode: "insensitive" } } } },
          { products: { some: { sku: { contains: search, mode: "insensitive" } } } },
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            customer: true,
            products: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.order.count({ where }),
      ]);

      return {
        orders: orders.map(this.formatOrderForAPI),
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error("❌ Error fetching orders from database:", error);
      throw error;
    }
  }

  static async getOrderById(id: string) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ id }, { orderId: id }, { orderNumber: id }],
        },
        include: {
          customer: true,
          products: true,
        },
      });

      return order ? this.formatOrderForAPI(order) : null;
    } catch (error) {
      console.error("❌ Error fetching order by ID:", error);
      throw error;
    }
  }

  static async updateOrder(id: string, updates: any) {
    try {
      const order = await prisma.order.update({
        where: { id },
        data: {
          ...updates,
          status: updates.status ? this.mapOrderStatus(updates.status) : undefined,
          assignedAt: updates.assignedAt ? new Date(updates.assignedAt) : undefined,
          fulfilledAt: updates.fulfilledAt ? new Date(updates.fulfilledAt) : undefined,
          statusUpdatedAt: updates.statusUpdatedAt ? new Date(updates.statusUpdatedAt) : undefined,
          noteAddedAt: updates.noteAddedAt ? new Date(updates.noteAddedAt) : undefined,
        },
        include: {
          customer: true,
          products: true,
        },
      });

      console.log(`✅ Order updated in database: ${order.orderNumber}`);
      return this.formatOrderForAPI(order);
    } catch (error) {
      console.error("❌ Error updating order in database:", error);
      throw error;
    }
  }

  static async deleteOrder(id: string) {
    try {
      const order = await prisma.order.delete({
        where: { id },
        include: {
          customer: true,
          products: true,
        },
      });

      console.log(`✅ Order deleted from database: ${order.orderNumber}`);
      return this.formatOrderForAPI(order);
    } catch (error) {
      console.error("❌ Error deleting order from database:", error);
      throw error;
    }
  }

  static async getOrderStats() {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalOrders,
        todayOrders,
        assignedOrders,
        unassignedOrders,
        fulfilledOrders,
        pendingOrders,
        readyToFulfill,
        cancelledOrders,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.order.count({ where: { assignedStoreId: { not: null } } }),
        prisma.order.count({ where: { assignedStoreId: null } }),
        prisma.order.count({ where: { status: "FULFILLED" } }),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "READY_TO_FULFILL" } }),
        prisma.order.count({ where: { status: "CANCELLED" } }),
      ]);

      return {
        totalOrders,
        todayOrders,
        assignedOrders,
        unassignedOrders,
        fulfilledOrders,
        pendingOrders,
        readyToFulfill,
        cancelledOrders,
      };
    } catch (error) {
      console.error("❌ Error fetching order stats:", error);
      throw error;
    }
  }

  static async upsertCustomer(customerData: any) {
    try {
      const customer = await prisma.customer.upsert({
        where: { email: customerData.email },
        update: {
          shopifyId: customerData.shopifyId ? customerData.shopifyId.toString() : null,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
          acceptsMarketing: customerData.acceptsMarketing,
        },
        create: {
          email: customerData.email,
          shopifyId: customerData.shopifyId ? customerData.shopifyId.toString() : null,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
          acceptsMarketing: customerData.acceptsMarketing,
        },
      });

      return customer;
    } catch (error) {
      console.error("❌ Error upserting customer:", error);
      throw error;
    }
  }

  static async seedStores() {
    try {
      const stores = [
        { name: "Brisbane CBD Store", email: "brisbane@yourstore.com" },
        { name: "Gold Coast Store", email: "goldcoast@yourstore.com" },
        { name: "Sydney Store", email: "sydney@yourstore.com" },
        { name: "Test Store", email: "test@yourstore.com" },
      ];

      for (const store of stores) {
        await prisma.store.upsert({
          where: { email: store.email },
          update: store,
          create: store,
        });
      }

      console.log("✅ Stores seeded successfully");
    } catch (error) {
      console.error("❌ Error seeding stores:", error);
      throw error;
    }
  }

  // Helper methods
  private static mapOrderStatus(status: string): any {
    const statusMap: Record<string, string> = {
      pending: "PENDING",
      assigned: "ASSIGNED",
      ready_to_fulfill: "READY_TO_FULFILL",
      partially_fulfilled: "PARTIALLY_FULFILLED",
      fulfilled: "FULFILLED",
      cancelled: "CANCELLED",
      payment_pending: "PAYMENT_PENDING",
    };
    return statusMap[status] || "PENDING";
  }

  private static formatOrderForAPI(order: any) {
    return {
      id: order.id,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      name: order.name,
      customer: {
        id: order.customer?.shopifyId,
        email: order.customer?.email,
        firstName: order.customer?.firstName,
        lastName: order.customer?.lastName,
        phone: order.customer?.phone,
        acceptsMarketing: order.customer?.acceptsMarketing,
      },
      customerEmail: order.customerEmail,
      totalPrice: order.totalPrice,
      subtotalPrice: order.subtotalPrice,
      totalTax: order.totalTax,
      currency: order.currency,
      products:
        order.products?.map((product: any) => ({
          id: product.shopifyId,
          productId: product.productId,
          variantId: product.variantId,
          name: product.name,
          title: product.title,
          variant_title: product.variantTitle,
          quantity: product.quantity,
          price: product.price,
          totalPrice: product.totalPrice,
          sku: product.sku,
          vendor: product.vendor,
          fulfillment_status: product.fulfillmentStatus,
          image: product.image,
        })) || [],
      lineItemsCount: order.lineItemsCount,
      totalQuantity: order.totalQuantity,
      fulfillmentStatus: order.fulfillmentStatus,
      financialStatus: order.financialStatus,
      clubInfo: order.clubInfo,
      assignedStore: order.assignedStore,
      assignedStoreId: order.assignedStoreId,
      assignedStoreEmail: order.assignedStoreEmail,
      status: order.status.toLowerCase(),
      createdAt: order.shopifyCreatedAt.toISOString(),
      updatedAt: order.shopifyUpdatedAt?.toISOString() || order.updatedAt.toISOString(),
      timestamp: order.createdAt.toISOString(),
      assignedAt: order.assignedAt?.toISOString(),
      fulfilledAt: order.fulfilledAt?.toISOString(),
      shopifyShop: order.shopifyShop,
      source: order.source,
      tags: order.tags,
      note: order.note,
      orderStatusUrl: order.orderStatusUrl,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      carrier: order.carrier,
      internalNotes: order.internalNotes,
      noteAddedAt: order.noteAddedAt?.toISOString(),
      statusNote: order.statusNote,
      statusUpdatedAt: order.statusUpdatedAt?.toISOString(),
    };
  }
}
