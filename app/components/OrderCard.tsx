"use client";

import { Order } from "@/types";

interface OrderCardProps {
  order: Order;
  onViewDetails?: (order: Order) => void;
  onAssignStore?: (order: Order) => void;
  onMarkFulfilled?: (order: Order) => void;
}

export default function OrderCard({ order, onViewDetails, onAssignStore, onMarkFulfilled }: OrderCardProps) {
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

  const getStatusText = (status: string): string => {
    switch (status) {
      case "assigned":
        return "Assigned to Store";
      case "ready_to_fulfill":
        return "Ready to Fulfill";
      case "partially_fulfilled":
        return "Partially Fulfilled";
      case "fulfilled":
        return "Fulfilled";
      case "cancelled":
        return "Cancelled";
      case "payment_pending":
        return "Payment Pending";
      case "pending":
        return "Pending Assignment";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: string, currency: string = "USD"): string => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency || "USD",
    }).format(parseFloat(amount));
  };

  const canBeFulfilled = (): boolean => {
    return !!(
      order.assignedStore &&
      order.status !== "fulfilled" &&
      order.status !== "cancelled" &&
      order.financialStatus !== "pending"
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">{order.name || `Order #${order.orderNumber}`}</h3>
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
            {getStatusText(order.status)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalPrice, order.currency)}</p>
          <p className="text-sm text-gray-500">
            {order.totalQuantity} item{order.totalQuantity !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Customer and Club Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Customer</h4>
          <p className="text-sm text-gray-600">{order.customerEmail}</p>
          {order.customer?.firstName && (
            <p className="text-sm text-gray-600">
              {order.customer.firstName} {order.customer.lastName}
            </p>
          )}
          {order.customer?.phone && <p className="text-sm text-gray-600">{order.customer.phone}</p>}
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Assignment</h4>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Club:</span> {order.clubInfo || "Not specified"}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Store:</span> {order.assignedStore || "Unassigned"}
          </p>
        </div>
      </div>

      {/* Products Preview */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Products</h4>
        <div className="space-y-2">
          {order.products?.slice(0, 3).map((product, index) => (
            <div key={product.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                {product.variant_title && product.variant_title !== "Default Title" && (
                  <p className="text-xs text-gray-500">{product.variant_title}</p>
                )}
                {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Qty: {product.quantity}</p>
                <p className="text-sm text-gray-600">{formatCurrency(product.totalPrice, order.currency)}</p>
              </div>
            </div>
          ))}
          {order.products && order.products.length > 3 && (
            <p className="text-sm text-gray-500 text-center">
              +{order.products.length - 3} more item{order.products.length - 3 !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Fulfillment Info */}
      {(order.trackingNumber || order.carrier) && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Fulfillment</h4>
          <div className="text-sm text-gray-600">
            {order.trackingNumber && (
              <p>
                <span className="font-medium">Tracking:</span> {order.trackingNumber}
              </p>
            )}
            {order.carrier && (
              <p>
                <span className="font-medium">Carrier:</span> {order.carrier}
              </p>
            )}
            {order.trackingUrl && (
              <p>
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Track Package
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t pt-3 mt-4">
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <p>
              <span className="font-medium">Created:</span> {formatDate(order.createdAt || order.timestamp)}
            </p>
            <p>
              <span className="font-medium">Shopify ID:</span> {order.orderId}
            </p>
          </div>
          <div>
            <p>
              <span className="font-medium">Updated:</span> {formatDate(order.updatedAt || order.timestamp)}
            </p>
            {order.financialStatus && (
              <p>
                <span className="font-medium">Payment:</span> {order.financialStatus}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t">
        <button
          onClick={() => onViewDetails?.(order)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Details
        </button>
        <div className="flex space-x-2">
          {!order.assignedStore && (
            <button onClick={() => onAssignStore?.(order)} className="btn-primary text-sm">
              Assign Store
            </button>
          )}

          {canBeFulfilled() && (
            <button
              onClick={() => onMarkFulfilled?.(order)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Mark Fulfilled
            </button>
          )}

          {order.orderStatusUrl && (
            <a href={order.orderStatusUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
              View in Shopify
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
