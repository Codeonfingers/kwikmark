import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Store, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Search,
  Filter,
  Loader2,
  MoreVertical,
  Eye,
  Ban,
  Shield,
  UserCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardCard from "@/components/shared/DashboardCard";
import StatusBadge from "@/components/shared/StatusBadge";
import OrderFilters from "@/components/shared/OrderFilters";
import { RoleManagementModal } from "@/components/admin/RoleManagementModal";
import { useAdminData } from "@/hooks/useAdminData";
import { useAdminOrderEvents } from "@/hooks/useOrderEvents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminDashboardNew = () => {
  useAdminOrderEvents(); // Realtime notifications for admin
  
  const {
    vendors, 
    shoppers, 
    orders, 
    markets, 
    loading, 
    updateVendorStatus, 
    updateShopperStatus,
    refetch 
  } = useAdminData();

  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailsModal, setDetailsModal] = useState(false);
  
  // Role management state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  // Fetch users with roles
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");
      
      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || []).filter(r => r.user_id === profile.user_id).map(r => r.role)
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const openRoleManagement = (userId: string, userName?: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName || "");
    setRoleModalOpen(true);
  };

  // Stats
  const pendingVendors = vendors.filter(v => !v.is_verified);
  const pendingShoppers = shoppers.filter(s => !s.is_verified);
  const activeOrders = orders.filter(o => !["completed", "cancelled"].includes(o.status));
  const totalRevenue = orders
    .filter(o => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const handleVerifyVendor = async (vendorId: string, verify: boolean) => {
    await updateVendorStatus(vendorId, { is_verified: verify });
    toast.success(verify ? "Vendor verified" : "Vendor verification removed");
  };

  const handleVerifyShopper = async (shopperId: string, verify: boolean) => {
    await updateShopperStatus(shopperId, { is_verified: verify });
    toast.success(verify ? "Shopper verified" : "Shopper verification removed");
  };

  const handleToggleActive = async (type: "vendor" | "shopper", id: string, active: boolean) => {
    if (type === "vendor") {
      await updateVendorStatus(id, { is_active: active });
    } else {
      await updateShopperStatus(id, { is_available: active });
    }
    toast.success(`${type === "vendor" ? "Vendor" : "Shopper"} ${active ? "activated" : "deactivated"}`);
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.business_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "verified" && v.is_verified) || 
      (statusFilter === "pending" && !v.is_verified);
    return matchesSearch && matchesStatus;
  });

  const filteredShoppers = shoppers.filter(s => {
    const matchesSearch = true; // Would search by name if we had profile data
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "verified" && s.is_verified) || 
      (statusFilter === "pending" && !s.is_verified);
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout role="admin" title="Admin Dashboard">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Pending Vendors"
            value={pendingVendors.length}
            icon={Store}
            variant={pendingVendors.length > 0 ? "secondary" : "default"}
          />
          <DashboardCard
            title="Active Orders"
            value={activeOrders.length}
            icon={ShoppingCart}
            variant="primary"
          />
          <DashboardCard
            title="Total Revenue"
            value={`₵${totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            variant="success"
          />
          <DashboardCard
            title="Total Users"
            value={vendors.length + shoppers.length}
            icon={Users}
            variant="gold"
          />
        </div>

        {/* Alerts */}
        {(pendingVendors.length > 0 || pendingShoppers.length > 0) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-secondary/10 border-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Pending Verifications</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingVendors.length} vendor(s) and {pendingShoppers.length} shopper(s) waiting for approval
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab("vendors")}>
                    Review Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">
              <UserCog className="w-4 h-4 mr-1" /> Users
            </TabsTrigger>
            <TabsTrigger value="vendors">
              Vendors {pendingVendors.length > 0 && <Badge variant="destructive" className="ml-1">{pendingVendors.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="shoppers">Shoppers</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground">No orders yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              ₵{Number(order.total).toFixed(2)}
                            </p>
                          </div>
                          <StatusBadge status={order.status as any} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Markets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Markets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {markets.map((market) => (
                      <div key={market.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{market.name}</p>
                            <p className="text-sm text-muted-foreground">{market.location}</p>
                          </div>
                        </div>
                        <Badge variant={market.is_active ? "default" : "secondary"}>
                          {market.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="text-center p-4">
                <p className="text-muted-foreground text-sm">Total Vendors</p>
                <p className="text-3xl font-display font-bold">{vendors.length}</p>
                <p className="text-xs text-success">{vendors.filter(v => v.is_verified).length} verified</p>
              </Card>
              <Card className="text-center p-4">
                <p className="text-muted-foreground text-sm">Total Shoppers</p>
                <p className="text-3xl font-display font-bold">{shoppers.length}</p>
                <p className="text-xs text-success">{shoppers.filter(s => s.is_verified).length} verified</p>
              </Card>
              <Card className="text-center p-4">
                <p className="text-muted-foreground text-sm">Total Orders</p>
                <p className="text-3xl font-display font-bold">{orders.length}</p>
                <p className="text-xs text-primary">{activeOrders.length} active</p>
              </Card>
              <Card className="text-center p-4">
                <p className="text-muted-foreground text-sm">Markets</p>
                <p className="text-3xl font-display font-bold">{markets.length}</p>
                <p className="text-xs text-success">{markets.filter(m => m.is_active).length} active</p>
              </Card>
            </div>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="font-display text-xl font-bold">Vendor Management</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{vendor.business_name}</p>
                            {vendor.stall_number && (
                              <p className="text-xs text-muted-foreground">Stall: {vendor.stall_number}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{markets.find(m => m.id === vendor.market_id)?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <StatusBadge status={vendor.is_verified ? "verified" : "unverified"} />
                            <StatusBadge status={vendor.is_active ? "active" : "inactive"} />
                          </div>
                        </TableCell>
                        <TableCell>{vendor.rating?.toFixed(1) || "0.0"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedItem(vendor); setDetailsModal(true); }}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerifyVendor(vendor.id, !vendor.is_verified)}>
                                <Shield className="w-4 h-4 mr-2" /> 
                                {vendor.is_verified ? "Remove Verification" : "Verify"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive("vendor", vendor.id, !vendor.is_active)}>
                                {vendor.is_active ? <Ban className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                {vendor.is_active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Shoppers Tab */}
          <TabsContent value="shoppers" className="space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="font-display text-xl font-bold">Shopper Management</h2>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shopper</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deliveries</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShoppers.map((shopper) => (
                      <TableRow key={shopper.id}>
                        <TableCell>
                          <p className="font-medium">Shopper</p>
                          <p className="text-xs text-muted-foreground">{shopper.id.slice(0, 8)}...</p>
                        </TableCell>
                        <TableCell>{markets.find(m => m.id === shopper.market_id)?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <StatusBadge status={shopper.is_verified ? "verified" : "unverified"} />
                            <StatusBadge status={shopper.is_available ? "active" : "inactive"} />
                          </div>
                        </TableCell>
                        <TableCell>{shopper.total_deliveries || 0}</TableCell>
                        <TableCell>{shopper.rating?.toFixed(1) || "0.0"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleVerifyShopper(shopper.id, !shopper.is_verified)}>
                                <Shield className="w-4 h-4 mr-2" /> 
                                {shopper.is_verified ? "Remove Verification" : "Verify"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive("shopper", shopper.id, !shopper.is_available)}>
                                {shopper.is_available ? <Ban className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                {shopper.is_available ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 mt-6">
            <h2 className="font-display text-xl font-bold">All Orders</h2>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">No orders yet</h3>
                <p className="text-muted-foreground">Orders will appear here as customers place them</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <StatusBadge status={order.status as any} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">₵{Number(order.total).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Market</p>
                          <p className="font-medium">{markets.find(m => m.id === order.market_id)?.name || "-"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Users Tab - Role Management */}
          <TabsContent value="users" className="space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="font-display text-xl font-bold">User Role Management</h2>
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{user.user_id?.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.phone ? `***${user.phone.slice(-4)}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.map((role: string) => (
                              <Badge 
                                key={role} 
                                variant={role === "admin" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {role}
                              </Badge>
                            ))}
                            {(!user.roles || user.roles.length === 0) && (
                              <span className="text-muted-foreground text-sm">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.is_verified ? "verified" : "unverified"} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openRoleManagement(user.user_id, user.full_name)}>
                                <Shield className="w-4 h-4 mr-2" /> Manage Roles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedItem(user); setDetailsModal(true); }}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Role Management Modal */}
        <RoleManagementModal
          open={roleModalOpen}
          onOpenChange={setRoleModalOpen}
          targetUserId={selectedUserId}
          targetUserName={selectedUserName}
          onRoleChanged={() => {
            fetchUsers();
            refetch();
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardNew;
