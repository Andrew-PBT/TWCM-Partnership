// types/index.ts - Updated without shipping
export interface Product {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  title: string;
  variant_title?: string;
  quantity: number;
  price: string;
  totalPrice: string;
  sku?: string;
  vendor?: string;
  fulfillment_status?: string;
  image?: string | null;
}

export interface Customer {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  acceptsMarketing?: boolean;
}

export interface Store {
  id: string;
  name: string;
  email: string;
}

export type OrderStatus =
  | "pending"
  | "assigned"
  | "ready_to_fulfill"
  | "partially_fulfilled"
  | "fulfilled"
  | "cancelled"
  | "payment_pending";

export interface Order {
  id: string;
  orderId: string;
  orderNumber: string;
  name?: string;

  // Customer info
  customer: Customer;
  customerEmail: string;

  // Order details
  totalPrice: string;
  subtotalPrice?: string;
  totalTax?: string;
  currency: string;

  // Products
  products: Product[];
  lineItemsCount: number;
  totalQuantity: number;

  // Fulfillment
  fulfillmentStatus?: string;
  financialStatus?: string;

  // Club and store assignment
  clubInfo?: string;
  assignedStore?: string;
  assignedStoreId?: string;
  assignedStoreEmail?: string;

  // Status and timestamps
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  timestamp: string;
  assignedAt?: string;
  fulfilledAt?: string;

  // Additional info
  shopifyShop?: string;
  source: string;
  tags?: string;
  note?: string;
  orderStatusUrl?: string;

  // Fulfillment tracking
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;

  // Internal
  internalNotes?: string;
  noteAddedAt?: string;
  statusNote?: string;
  statusUpdatedAt?: string;
}

export interface OrderStats {
  totalOrders: number;
  todayOrders: number;
  assignedOrders: number;
  unassignedOrders: number;
  fulfilledOrders: number;
  pendingOrders: number;
  readyToFulfill: number;
  cancelledOrders: number;
}

export interface OrdersResponse {
  orders: Order[];
  stats: OrderStats;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
}

export interface FulfillmentData {
  notifyCustomer: boolean;
  internalNote?: string;
}

// Shopify webhook types
export interface ShopifyLineItem {
  id: string;
  product_id: string;
  variant_id: string;
  name: string;
  title: string;
  variant_title?: string;
  quantity: number;
  price: string;
  sku?: string;
  vendor?: string;
  fulfillment_status?: string;
  image?: {
    src: string;
  };
}

export interface ShopifyCustomer {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  accepts_marketing?: boolean;
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: string;
}

export interface ShopifyNoteAttribute {
  name: string;
  value: string;
}

export interface ShopifyOrder {
  id: string;
  order_number: string;
  name: string;
  email: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  line_items: ShopifyLineItem[];
  fulfillment_status?: string;
  financial_status: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  customer?: ShopifyCustomer;
  discount_codes?: ShopifyDiscountCode[];
  tags?: string;
  note?: string;
  note_attributes?: ShopifyNoteAttribute[];
  order_status_url?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  message?: string;
  error?: string;
  data?: T;
  timestamp?: string;
}

export interface OrderActionRequest {
  action: "assign_store" | "update_status" | "add_note" | "mark_fulfilled";
  orderId: string;
  data: any;
}
export interface ShopifyMetafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
  description?: string;
}
