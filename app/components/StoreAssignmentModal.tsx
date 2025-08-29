"use client";

import { useState } from "react";
import { Order, Store } from "@/types";

interface StoreAssignmentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (order: Order, store: Store) => Promise<void>;
}

const availableStores: Store[] = [
  { id: "store_001", name: "Brisbane CBD Store", email: "brisbane@yourstore.com" },
  { id: "store_002", name: "Gold Coast Store", email: "goldcoast@yourstore.com" },
  { id: "store_003", name: "Sydney Store", email: "sydney@yourstore.com" },
  { id: "store_test", name: "Test Store", email: "test@yourstore.com" },
];

export default function StoreAssignmentModal({ order, isOpen, onClose, onAssign }: StoreAssignmentModalProps) {
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const handleAssign = async (): Promise<void> => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      const store = availableStores.find((s) => s.id === selectedStore);
      if (!store) {
        throw new Error("Store not found");
      }

      await onAssign(order, store);
      setSelectedStore("");
      onClose();
    } catch (error) {
      console.error("Failed to assign store:", error);
      alert("Failed to assign store. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSelectedStore(e.target.value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Store to Order #{order.orderNumber}</h3>

          {order.clubInfo && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Sports Club:</span> {order.clubInfo}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {availableStores.map((store) => (
              <label key={store.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="store"
                  value={store.id}
                  checked={selectedStore === store.id}
                  onChange={handleStoreChange}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">{store.name}</p>
                  <p className="text-sm text-gray-600">{store.email}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={onClose} className="btn-secondary" disabled={loading} type="button">
              Cancel
            </button>
            <button onClick={handleAssign} disabled={!selectedStore || loading} className="btn-primary" type="button">
              {loading ? "Assigning..." : "Assign Store"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
