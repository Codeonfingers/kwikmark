import { useState, useEffect } from "react";
import { Store, Check, X, Eye, Search, Loader2, BadgeCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  stall_number: string | null;
  description: string | null;
  market_id: string | null;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  total_orders: number;
  created_at: string;
  markets?: { name: string } | null;
}

const AdminVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [actionModal, setActionModal] = useState<{ open: boolean; type: "verify" | "suspend" | "view" }>({
    open: false,
    type: "view",
  });
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*, markets(name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVendors(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleVerify = async () => {
    if (!selectedVendor) return;
    setProcessing(true);

    const { error } = await supabase
      .from("vendors")
      .update({ is_verified: true })
      .eq("id", selectedVendor.id);

    if (error) {
      toast.error("Failed to verify vendor");
    } else {
      toast.success("Vendor verified successfully!");
      fetchVendors();
    }

    setProcessing(false);
    setActionModal({ open: false, type: "view" });
    setSelectedVendor(null);
  };

  const handleSuspend = async () => {
    if (!selectedVendor) return;
    setProcessing(true);

    const { error } = await supabase
      .from("vendors")
      .update({ is_active: !selectedVendor.is_active })
      .eq("id", selectedVendor.id);

    if (error) {
      toast.error("Failed to update vendor status");
    } else {
      toast.success(selectedVendor.is_active ? "Vendor suspended" : "Vendor reactivated");
      fetchVendors();
    }

    setProcessing(false);
    setActionModal({ open: false, type: "view" });
    setSelectedVendor(null);
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.business_name.toLowerCase().includes(search.toLowerCase()) ||
      v.stall_number?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingVendors = filteredVendors.filter((v) => !v.is_verified);
  const verifiedVendors = filteredVendors.filter((v) => v.is_verified);

  if (loading) {
    return (
      <DashboardLayout role="admin" title="Vendors">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Vendors">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Vendor Management</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pendingVendors.length} pending</Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingVendors.length})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedVendors.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingVendors.length === 0 ? (
              <div className="text-center py-12">
                <BadgeCheck className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">No pending vendors</h3>
                <p className="text-muted-foreground">All vendors have been reviewed</p>
              </div>
            ) : (
              pendingVendors.map((vendor) => (
                <Card key={vendor.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                          <Store className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-bold">{vendor.business_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {vendor.stall_number || "No stall"} • {vendor.markets?.name || "No market"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-secondary">Pending</Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setActionModal({ open: true, type: "view" });
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setActionModal({ open: true, type: "verify" });
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" /> Verify
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="verified" className="space-y-4 mt-4">
            {verifiedVendors.map((vendor) => (
              <Card key={vendor.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                        <Store className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <h3 className="font-bold">{vendor.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {vendor.stall_number || "No stall"} • {vendor.markets?.name || "No market"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ⭐ {Number(vendor.rating).toFixed(1)} • {vendor.total_orders} orders
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={vendor.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>
                        {vendor.is_active ? "Active" : "Suspended"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setActionModal({ open: true, type: "suspend" });
                        }}
                      >
                        {vendor.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Action Modal */}
        <Dialog open={actionModal.open} onOpenChange={(open) => setActionModal({ ...actionModal, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionModal.type === "verify" && "Verify Vendor"}
                {actionModal.type === "suspend" && (selectedVendor?.is_active ? "Suspend Vendor" : "Reactivate Vendor")}
                {actionModal.type === "view" && "Vendor Details"}
              </DialogTitle>
            </DialogHeader>

            {selectedVendor && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                  <p><strong>Business:</strong> {selectedVendor.business_name}</p>
                  <p><strong>Stall:</strong> {selectedVendor.stall_number || "N/A"}</p>
                  <p><strong>Market:</strong> {selectedVendor.markets?.name || "N/A"}</p>
                  <p><strong>Joined:</strong> {new Date(selectedVendor.created_at).toLocaleDateString()}</p>
                  {selectedVendor.description && (
                    <p><strong>Description:</strong> {selectedVendor.description}</p>
                  )}
                </div>

                {actionModal.type !== "view" && (
                  <>
                    <div className="space-y-2">
                      <Label>Admin Notes (Optional)</Label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add any notes..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setActionModal({ open: false, type: "view" })}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        variant={actionModal.type === "suspend" && selectedVendor.is_active ? "destructive" : "default"}
                        onClick={actionModal.type === "verify" ? handleVerify : handleSuspend}
                        disabled={processing}
                      >
                        {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {actionModal.type === "verify" && "Verify Vendor"}
                        {actionModal.type === "suspend" && (selectedVendor.is_active ? "Suspend" : "Reactivate")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminVendors;