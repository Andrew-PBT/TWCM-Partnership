"use client";

import { useState } from "react";
import { Order } from "@/types";

interface SimplifiedFulfillmentData {
  notifyCustomer: boolean;
  internalNote?: string;
}

interface FulfillmentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onFulfill: (order: Order, formData: SimplifiedFulfillmentData) => Promise<void>;
}

export default function FulfillmentModal({ order, isOpen, onClose, onFulfill }: FulfillmentModalProps) {
  const [formData, setFormData] = useState<SimplifiedFulfillmentData>({
    notifyCustomer: true,
    internalNote: "",
  });
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onFulfill(order, formData);
      setFormData({
        notifyCustomer: true,
        internalNote: "",
      });
      onClose();
    } catch (error) {
      console.error("Failed to fulfill order:", error);
      alert("Failed to fulfill order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Mark Order as Fulfilled</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold" type="button">
              ×
            </button>
          </div>

          {/* Order Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Order:</span> {order.name || `#${order.orderNumber}`}
            </p>
            <p className="text-sm text-blue-800">
              <span className="font-medium">Customer:</span> {order.customerEmail}
            </p>
            {order.assignedStore && (
              <p className="text-sm text-blue-800">
                <span className="font-medium">Pickup Store:</span> {order.assignedStore}
              </p>
            )}
          </div>

          {/* Pickup Notice */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <span className="text-green-600 text-lg mr-2">📍</span>
              <div>
                <p className="text-sm font-medium text-green-800">Ready for Customer Pickup</p>
                <p className="text-xs text-green-700 mt-1">
                  This order will be marked as fulfilled and ready for collection at{" "}
                  {order.assignedStore || "the assigned store"}.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Internal Note (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Note (Optional)</label>
              <textarea
                name="internalNote"
                value={formData.internalNote}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any internal notes about this fulfillment..."
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="notifyCustomer"
                  checked={formData.notifyCustomer}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Notify customer (pickup ready email)</span>
              </label>
            </div>

            {/* Explanation */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p className="font-medium mb-1">What happens when you mark as fulfilled:</p>
              <ul className="space-y-1">
                <li>• Order status changes to "Fulfilled"</li>
                <li>• Shopify order automatically marked as fulfilled</li>
                {formData.notifyCustomer && <li>• Customer receives pickup notification email</li>}
                <li>• Store can prepare order for collection</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Marking as Fulfilled..." : "Mark as Fulfilled"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
