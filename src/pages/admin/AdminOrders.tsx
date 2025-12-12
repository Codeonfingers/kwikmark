import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, Eye, Package } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface OrderWithDetails {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  shopper_fee: number;
  special_instructions: string | null;
  inspection_status: string | null;
  pickup_photo_url: string | null;
  created_at: string;
  consumer_id: string;
  vendor_id: string | null;
  market_id: string | null;
  order_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface Market {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700",
  accepted: "bg-blue-500/20 text-blue-700",
  preparing: "bg-purple-500/20 text-purple-700",
  ready: "bg-cyan-500/20 text-cyan-700",
  picked_up: "bg-indigo-500/20 text-indigo-700",
  inspecting: "bg-orange-500/20 text-orange-700",
  approved: "bg-emerald-500/20 text-emerald-700",
  completed: "bg-green-500/20 text-green-700",
  disputed: "bg-red-500/20 text-red-700",
  cancelled: "bg-gray-500/20 text-gray-700",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchMarkets();

    // Realtime subscription
    const channel = supabase
      .channel("admin-orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch orders");
      return;
    }
    setOrders(data || []);
    setLoading(false);
  };

  const fetchMarkets = async () => {
    const { data } = await supabase.from("markets").select("id, name");
    setMarkets(data || []);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesMarket = marketFilter === "all" || order.market_id === marketFilter;
    return matchesSearch && matchesStatus && matchesMarket;
  });

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order status");
      return;
    }
    toast.success(`Order status updated to ${newStatus}`);
    fetchOrders();
  };

  if (loading) {
    return (
      <DashboardLayout role="admin" title="Orders">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Orders Management">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={marketFilter} onValueChange={setMarketFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {markets.map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter((o) => o.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {orders.filter((o) => ["accepted", "preparing", "ready", "picked_up"].includes(o.status)).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === "completed").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              All Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders found</p>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.order_number}</span>
                        <Badge className={statusColors[order.status] || "bg-gray-500/20"}>
                          {order.status}
                        </Badge>
                        {order.inspection_status && (
                          <Badge variant="outline">{order.inspection_status}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "PPp")}
                      </p>
                      <p className="text-sm">
                        {order.order_items?.length || 0} items • GHS {order.total?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order {order.order_number}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge className={statusColors[order.status]}>
                                  {order.status}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Inspection</p>
                                <Badge variant="outline">
                                  {order.inspection_status || "Pending"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Subtotal</p>
                                <p className="font-medium">GHS {order.subtotal?.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="font-medium">GHS {order.total?.toFixed(2)}</p>
                              </div>
                            </div>

                            {order.special_instructions && (
                              <div>
                                <p className="text-sm text-muted-foreground">Instructions</p>
                                <p className="text-sm">{order.special_instructions}</p>
                              </div>
                            )}

                            {order.pickup_photo_url && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Proof Photo</p>
                                <img
                                  src={order.pickup_photo_url}
                                  alt="Proof"
                                  className="rounded-lg max-h-48 object-cover"
                                />
                              </div>
                            )}

                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Items</p>
                              <div className="space-y-2">
                                {order.order_items?.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between text-sm p-2 bg-muted rounded"
                                  >
                                    <span>
                                      {item.product_name} x{item.quantity}
                                    </span>
                                    <span>GHS {item.total_price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateOrderStatus(order.id, "cancelled")}
                                disabled={order.status === "cancelled" || order.status === "completed"}
                              >
                                Cancel Order
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, "completed")}
                                disabled={order.status === "completed"}
                              >
                                Mark Complete
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}