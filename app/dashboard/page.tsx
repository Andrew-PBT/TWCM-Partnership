"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import OrderCard from "../components/OrderCard";
import OrderDetailModal from "../components/OrderDetailModal";
import StoreAssignmentModal from "../components/StoreAssignmentModal";
import FulfillmentModal from "../components/FulfillmentModal";
import SyncDashboard from "../components/SyncDashboard";
import { Order, OrdersResponse, Store, FulfillmentData, OrderStatus } from "@/types";

interface StatusTab {
  id: string;
  label: string;
}

export default function Dashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showSyncDashboard, setShowSyncDashboard] = useState<boolean>(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState<boolean>(false);

  const statusTabs: StatusTab[] = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "assigned", label: "Assigned" },
    { id: "ready_to_fulfill", label: "Ready to Fulfill" },
    { id: "fulfilled", label: "Fulfilled" },
  ];

  useEffect(() => {
    fetchOrderData();
    const interval = setInterval(fetchOrderData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, activeTab, searchTerm]);

  const fetchOrderData = async (): Promise<void> => {
    try {
      const response = await fetch("/api/orders");
      const data: OrdersResponse = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Failed to fetch order data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = (): void => {
    let filtered = orders;

    // Filter by status tab
    if (activeTab !== "all") {
      filtered = filtered.filter((order) => order.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber?.toString().includes(term) ||
          order.customerEmail?.toLowerCase().includes(term) ||
          order.clubInfo?.toLowerCase().includes(term) ||
          order.assignedStore?.toLowerCase().includes(term) ||
          order.products?.some(
            (product) => product.name?.toLowerCase().includes(term) || product.sku?.toLowerCase().includes(term)
          )
      );
    }

    setFilteredOrders(filtered);
  };

  const getTabCount = (tabId: string): number => {
    if (tabId === "all") return orders.length;
    return orders.filter((order) => order.status === tabId).length;
  };

  const handleViewDetails = (order: Order): void => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleAssignStore = (order: Order): void => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleMarkFulfilled = (order: Order): void => {
    setSelectedOrder(order);
    setShowFulfillmentModal(true);
  };

  const handleStoreAssignment = async (order: Order, store: Store): Promise<void> => {
    try {
      const response = await fetch("/api/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_store",
          orderId: order.id,
          data: {
            storeId: store.id,
            storeName: store.name,
            storeEmail: store.email,
          },
        }),
      });

      if (response.ok) {
        await fetchOrderData();
        console.log(`Store ${store.name} assigned to order ${order.orderNumber}`);
      } else {
        throw new Error("Failed to assign store");
      }
    } catch (error) {
      console.error("Error assigning store:", error);
      throw error;
    }
  };

  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus): Promise<void> => {
    try {
      const response = await fetch("/api/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          orderId: order.id,
          data: { status: newStatus },
        }),
      });

      if (response.ok) {
        await fetchOrderData();
        console.log(`Order ${order.orderNumber} status updated to ${newStatus}`);
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update order status");
    }
  };

  const handleFulfillOrder = async (order: Order, formData: FulfillmentData): Promise<void> => {
    try {
      const response = await fetch("/api/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_fulfilled",
          orderId: order.id,
          data: {
            notifyCustomer: formData.notifyCustomer,
            internalNote: formData.internalNote,
          },
        }),
      });

      if (response.ok) {
        await fetchOrderData();
        console.log(`Order ${order.orderNumber} marked as fulfilled`);
      } else {
        throw new Error("Failed to fulfill order");
      }
    } catch (error) {
      console.error("Error fulfilling order:", error);
      throw error;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  const handleTabChange = (tabId: string): void => {
    setActiveTab(tabId);
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Dashboard - Show if no orders or when explicitly requested */}
      {(orders.length === 0 || showSyncDashboard) && <SyncDashboard />}

      {/* Show/Hide Sync Dashboard Toggle */}
      {orders.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowSyncDashboard(!showSyncDashboard)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showSyncDashboard ? "Hide" : "Show"} Shopify Sync
          </button>
        </div>
      )}

      {/* Orders Management */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Orders Management</h2>
            <p className="text-sm text-gray-600">
              {filteredOrders.length} of {orders.length} orders
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search orders, customers, products..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
            <button onClick={fetchOrderData} className="btn-secondary whitespace-nowrap" type="button">
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                type="button"
              >
                {tab.label} ({getTabCount(tab.id)})
              </button>
            ))}
          </nav>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {orders.length === 0 ? (
              <div>
                <p className="text-lg font-medium">No orders yet</p>
                <p className="mt-2">Use the Shopify Sync above to import your existing orders,</p>
                <p className="mt-1 text-sm">or wait for new orders to come through your webhooks.</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">No orders match your filters</p>
                <p className="mt-2">Try adjusting your search term or status filter.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={handleViewDetails}
                onAssignStore={handleAssignStore}
                onMarkFulfilled={handleMarkFulfilled}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onAssignStore={handleAssignStore}
        onUpdateStatus={handleUpdateStatus}
      />

      <StoreAssignmentModal
        order={selectedOrder}
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleStoreAssignment}
      />

      <FulfillmentModal
        order={selectedOrder}
        isOpen={showFulfillmentModal}
        onClose={() => setShowFulfillmentModal(false)}
        onFulfill={handleFulfillOrder}
      />
    </div>
  );
}
