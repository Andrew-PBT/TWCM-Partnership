"use client";

import { useState } from "react";
import { Order, OrderStatus } from "@/types";

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignStore: (order: Order) => void;
  onUpdateStatus: (order: Order, status: OrderStatus) => Promise<void>;
}

type TabId = "overview" | "products" | "customer" | "fulfillment";

interface Tab {
  id: TabId;
  label: string;
}

export default function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onAssignStore,
  onUpdateStatus,
}: OrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  if (!isOpen || !order) return null;

  const formatCurrency = (amount: string, currency: string = "USD"): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "assigned":
        return "bg-green-100 text-green-800 border-green-200";
      case "ready_to_fulfill":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "partially_fulfilled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "fulfilled":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "payment_pending":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "pending":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    { id: "products", label: "Products" },
    { id: "customer", label: "Customer" },
    { id: "fulfillment", label: "Fulfillment" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{order.name || `Order #${order.orderNumber}`}</h2>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className="text-sm text-gray-500">Created {formatDate(order.createdAt || order.timestamp)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold" type="button">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(order.subtotalPrice || order.totalPrice, order.currency)}
                    </span>
                  </div>
                  {order.totalTax && parseFloat(order.totalTax) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(order.totalTax, order.currency)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-lg">{formatCurrency(order.totalPrice, order.currency)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.totalQuantity} item{order.totalQuantity !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Club & Store Assignment */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Assignment</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600">Sports Club:</span>
                    <span className="ml-2 font-medium">{order.clubInfo || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Assigned Store:</span>
                    <span className="ml-2 font-medium">{order.assignedStore || "Unassigned"}</span>
                  </div>
                  {!order.assignedStore && (
                    <button onClick={() => onAssignStore(order)} className="btn-primary w-full mt-3" type="button">
                      Assign to Store
                    </button>
                  )}
                </div>
              </div>

              {/* Payment & Financial */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Payment</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600">Financial Status:</span>
                    <span className="ml-2 font-medium capitalize">{order.financialStatus || "unknown"}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Currency:</span>
                    <span className="ml-2 font-medium">{order.currency}</span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2">{formatDate(order.createdAt || order.timestamp)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Updated:</span>
                    <span className="ml-2">{formatDate(order.updatedAt || order.timestamp)}</span>
                  </div>
                  {order.assignedAt && (
                    <div>
                      <span className="text-gray-600">Assigned:</span>
                      <span className="ml-2">{formatDate(order.assignedAt)}</span>
                    </div>
                  )}
                  {order.fulfilledAt && (
                    <div>
                      <span className="text-gray-600">Fulfilled:</span>
                      <span className="ml-2">{formatDate(order.fulfilledAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Products Ordered</h3>
              <div className="space-y-4">
                {order.products?.map((product, index) => (
                  <div key={product.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        {product.variant_title && product.variant_title !== "Default Title" && (
                          <p className="text-sm text-gray-600">{product.variant_title}</p>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                          {product.sku && (
                            <div>
                              <span className="font-medium">SKU:</span> {product.sku}
                            </div>
                          )}
                          {product.vendor && (
                            <div>
                              <span className="font-medium">Vendor:</span> {product.vendor}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Product ID:</span> {product.productId}
                          </div>
                          <div>
                            <span className="font-medium">Variant ID:</span> {product.variantId}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium">Qty: {product.quantity}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(product.price, order.currency)} each</p>
                        <p className="font-semibold">{formatCurrency(product.totalPrice, order.currency)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "customer" && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{order.customerEmail}</span>
                </div>
                {order.customer?.firstName && (
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">
                      {order.customer.firstName} {order.customer.lastName}
                    </span>
                  </div>
                )}
                {order.customer?.phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{order.customer.phone}</span>
                  </div>
                )}
                {order.customer?.id && (
                  <div>
                    <span className="text-gray-600">Customer ID:</span>
                    <span className="ml-2 text-sm">{order.customer.id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "fulfillment" && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Fulfillment Details</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 font-medium capitalize">{order.fulfillmentStatus || "unfulfilled"}</span>
                </div>

                {order.trackingNumber && (
                  <div>
                    <span className="text-gray-600">Tracking Number:</span>
                    <span className="ml-2 font-medium">{order.trackingNumber}</span>
                  </div>
                )}

                {order.trackingUrl && (
                  <div>
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Track Package
                    </a>
                  </div>
                )}

                {order.carrier && (
                  <div>
                    <span className="text-gray-600">Carrier:</span>
                    <span className="ml-2 font-medium">{order.carrier}</span>
                  </div>
                )}

                {order.status !== "fulfilled" && order.assignedStore && (
                  <div className="pt-4 border-t">
                    <button onClick={() => onUpdateStatus(order, "fulfilled")} className="btn-primary" type="button">
                      Mark as Fulfilled
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Shopify Order ID: {order.orderId}</div>
            <div className="space-x-3">
              {order.orderStatusUrl && (
                <a href={order.orderStatusUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  View in Shopify
                </a>
              )}
              <button onClick={onClose} className="btn-primary" type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
