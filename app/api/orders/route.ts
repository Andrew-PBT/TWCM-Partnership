// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/db";
import { Order, OrdersResponse } from "@/types";
import { EnhancedDatabaseService } from "@/lib/enhanced-db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const store = searchParams.get("store");
    const club = searchParams.get("club");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const filters = {
      status: status || undefined,
      store: store || undefined,
      club: club || undefined,
      search: search || undefined,
      limit,
      offset,
    };

    const { orders, total, hasMore } = await DatabaseService.getOrders(filters);
    const stats = await DatabaseService.getOrderStats();

    const response: OrdersResponse = {
      orders: orders as Order[],
      stats: stats,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// In your existing app/api/orders/route.ts, replace the POST method:

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // Add timestamp if not present
    if (!orderData.timestamp) {
      orderData.timestamp = new Date().toISOString();
    }

    // Use the enhanced database service instead of the basic one
    const order = await EnhancedDatabaseService.createOrderWithClubAssignment(orderData);

    console.log(`📝 Order added to database with assignment:`, {
      orderNumber: order.orderNumber,
      customer: order.customerEmail,
      club: order.club?.name || "No club",
      assignedStore: order.assignedStore?.name || "No store",
      status: order.status,
    });

    return NextResponse.json(
      {
        message: "Order created successfully with club assignment",
        order: order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return NextResponse.json(
      {
        error: "Failed to create order",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const updates = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Find the order first
    const existingOrder = await DatabaseService.getOrderById(orderId);

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update the order
    const updatedOrder = await DatabaseService.updateOrder(existingOrder.id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✏️ Order updated in database: ${updatedOrder.orderNumber}`);

    return NextResponse.json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Error updating order:", error);
    return NextResponse.json(
      {
        error: "Failed to update order",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Find the order first
    const existingOrder = await DatabaseService.getOrderById(orderId);

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Delete the order
    const deletedOrder = await DatabaseService.deleteOrder(existingOrder.id);

    console.log(`🗑️ Order deleted from database: ${deletedOrder.orderNumber}`);

    return NextResponse.json({
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    return NextResponse.json(
      {
        error: "Failed to delete order",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
