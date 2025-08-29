// app/api/order-actions/route.ts - Updated with database integration
import { NextRequest, NextResponse } from "next/server";
import { ShopifyService } from "@/lib/shopify";
import { DatabaseService } from "@/lib/db";

interface OrderActionRequest {
  action: "assign_store" | "update_status" | "add_note" | "mark_fulfilled";
  orderId: string;
  data: any;
}

interface AssignStoreData {
  storeId: string;
  storeName: string;
  storeEmail?: string;
}

interface UpdateStatusData {
  status: string;
  note?: string;
}

interface AddNoteData {
  note: string;
}

interface MarkFulfilledData {
  notifyCustomer?: boolean;
  internalNote?: string;
}

export async function POST(request: NextRequest) {
  const { action, orderId, data }: OrderActionRequest = await request.json();

  switch (action) {
    case "assign_store":
      return handleAssignStore(orderId, data as AssignStoreData);
    case "update_status":
      return handleUpdateStatus(orderId, data as UpdateStatusData);
    case "add_note":
      return handleAddNote(orderId, data as AddNoteData);
    case "mark_fulfilled":
      return handleMarkFulfilled(orderId, data as MarkFulfilledData);
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

async function handleAssignStore(orderId: string, data: AssignStoreData): Promise<NextResponse> {
  const { storeId, storeName, storeEmail } = data;

  try {
    const order = await DatabaseService.getOrderById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedOrder = await DatabaseService.updateOrder(order.id, {
      assignedStore: storeName,
      assignedStoreId: storeId,
      assignedStoreEmail: storeEmail,
      status: "assigned",
      assignedAt: new Date().toISOString(),
    });

    console.log(`🏪 Store assigned: ${storeName} to order ${order.orderNumber}`);

    return NextResponse.json({
      message: "Store assigned successfully",
      orderId,
      assignedStore: storeName,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error assigning store:", error);
    return NextResponse.json({ error: "Failed to assign store" }, { status: 500 });
  }
}

async function handleUpdateStatus(orderId: string, data: UpdateStatusData): Promise<NextResponse> {
  const { status, note } = data;

  try {
    const order = await DatabaseService.getOrderById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData: any = {
      status,
      statusUpdatedAt: new Date().toISOString(),
    };

    if (note) {
      updateData.statusNote = note;
    }

    const updatedOrder = await DatabaseService.updateOrder(order.id, updateData);

    console.log(`📊 Status updated: ${status} for order ${order.orderNumber}`);

    return NextResponse.json({
      message: "Status updated successfully",
      orderId,
      status,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

async function handleAddNote(orderId: string, data: AddNoteData): Promise<NextResponse> {
  const { note } = data;

  try {
    const order = await DatabaseService.getOrderById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedOrder = await DatabaseService.updateOrder(order.id, {
      internalNotes: note,
      noteAddedAt: new Date().toISOString(),
    });

    console.log(`📝 Note added to order ${order.orderNumber}`);

    return NextResponse.json({
      message: "Note added successfully",
      orderId,
      note,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}

async function handleMarkFulfilled(orderId: string, data: MarkFulfilledData): Promise<NextResponse> {
  const { notifyCustomer, internalNote } = data;

  try {
    console.log(`🔍 Processing fulfillment for internal order ID: ${orderId}`);

    const order = await DatabaseService.getOrderById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    console.log(`✅ Found order: Internal ID ${order.id}, Shopify ID: ${order.orderId}`);

    if (!order.orderId) {
      throw new Error(
        `Order missing Shopify order ID. Internal ID: ${orderId}, Order data: ${JSON.stringify(order, null, 2)}`
      );
    }

    const shopifyOrderId = order.orderId.toString();

    console.log(`🔍 Found order mapping - Internal ID: ${orderId}, Shopify ID: ${shopifyOrderId}`);

    // Update internal order first
    const updateData: any = {
      status: "fulfilled",
      fulfillmentStatus: "fulfilled",
      fulfilledAt: new Date().toISOString(),
    };

    if (internalNote) {
      updateData.internalNotes = internalNote;
      updateData.noteAddedAt = new Date().toISOString();
    }

    // Update internal order
    const updatedOrder = await DatabaseService.updateOrder(order.id, updateData);

    // Always update Shopify when marking as fulfilled
    let shopifyFulfillment = null;
    try {
      console.log(`📦 Creating Shopify fulfillment for order: ${shopifyOrderId}`);

      const shopifyService = new ShopifyService();

      // Create fulfillment without tracking info (pickup orders)
      shopifyFulfillment = await shopifyService.createFulfillment(shopifyOrderId, {
        notifyCustomer: notifyCustomer ?? true,
        // No tracking info needed for pickup orders
      });

      console.log(`✅ Order fulfilled in Shopify: ${shopifyOrderId}`);
    } catch (shopifyError) {
      console.error("❌ Shopify fulfillment failed:", shopifyError);

      return NextResponse.json(
        {
          message: "Order marked as fulfilled internally, but Shopify fulfillment failed",
          orderId,
          shopifyOrderId,
          shopifyError: shopifyError instanceof Error ? shopifyError.message : "Unknown Shopify error",
          internalSuccess: true,
          shopifySuccess: false,
          order: updatedOrder,
        },
        { status: 207 }
      );
    }

    console.log(`✅ Order fulfilled successfully: ${orderId}`);

    return NextResponse.json({
      message: "Order marked as fulfilled and ready for pickup (updated in Shopify)",
      orderId,
      shopifyOrderId,
      fulfillmentType: "pickup",
      assignedStore: order.assignedStore,
      shopifyFulfillment: shopifyFulfillment?.fulfillment || null,
      internalSuccess: true,
      shopifySuccess: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Error marking fulfilled:", error);
    return NextResponse.json(
      {
        error: "Failed to mark as fulfilled",
        details: error instanceof Error ? error.message : "Unknown error",
        orderId,
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
