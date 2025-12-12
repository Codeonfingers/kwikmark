import { useState, useEffect } from "react";
import { Users, Check, X, Eye, Search, Loader2, BadgeCheck, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

interface Shopper {
  id: string;
  user_id: string;
  market_id: string | null;
  is_verified: boolean;
  is_available: boolean;
  rating: number;
  total_deliveries: number;
  commission_rate: number;
  created_at: string;
  markets?: { name: string } | null;
}

const AdminShoppers = () => {
  const [shoppers, setShoppers] = useState<Shopper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedShopper, setSelectedShopper] = useState<Shopper | null>(null);
  const [actionModal, setActionModal] = useState<{ open: boolean; type: "verify" | "suspend" | "view" }>({
    open: false,
    type: "view",
  });
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchShoppers = async () => {
    const { data, error } = await supabase
      .from("shoppers")
      .select("*, markets(name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setShoppers(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShoppers();
  }, []);

  const handleVerify = async () => {
    if (!selectedShopper) return;
    setProcessing(true);

    const { error } = await supabase
      .from("shoppers")
      .update({ is_verified: true })
      .eq("id", selectedShopper.id);

    if (error) {
      toast.error("Failed to verify shopper");
    } else {
      toast.success("Shopper verified successfully!");
      fetchShoppers();
    }

    setProcessing(false);
    setActionModal({ open: false, type: "view" });
    setSelectedShopper(null);
  };

  const handleSuspend = async () => {
    if (!selectedShopper) return;
    setProcessing(true);

    const { error } = await supabase
      .from("shoppers")
      .update({ is_available: !selectedShopper.is_available })
      .eq("id", selectedShopper.id);

    if (error) {
      toast.error("Failed to update shopper status");
    } else {
      toast.success(selectedShopper.is_available ? "Shopper suspended" : "Shopper reactivated");
      fetchShoppers();
    }

    setProcessing(false);
    setActionModal({ open: false, type: "view" });
    setSelectedShopper(null);
  };

  const filteredShoppers = shoppers.filter(
    (s) => s.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const pendingShoppers = filteredShoppers.filter((s) => !s.is_verified);
  const verifiedShoppers = filteredShoppers.filter((s) => s.is_verified);

  if (loading) {
    return (
      <DashboardLayout role="admin" title="Shoppers">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Shoppers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Shopper Management</h1>
          <Badge variant="secondary">{pendingShoppers.length} pending</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shoppers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingShoppers.length})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedShoppers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingShoppers.length === 0 ? (
              <div className="text-center py-12">
                <BadgeCheck className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">No pending shoppers</h3>
                <p className="text-muted-foreground">All shoppers have been reviewed</p>
              </div>
            ) : (
              pendingShoppers.map((shopper) => (
                <Card key={shopper.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-earth/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-earth" />
                        </div>
                        <div>
                          <h3 className="font-bold">Shopper #{shopper.id.slice(0, 8)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {shopper.markets?.name || "No market assigned"}
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
                          setSelectedShopper(shopper);
                          setActionModal({ open: true, type: "view" });
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedShopper(shopper);
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
            {verifiedShoppers.map((shopper) => (
              <Card key={shopper.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <h3 className="font-bold">Shopper #{shopper.id.slice(0, 8)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {shopper.markets?.name || "No market"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-gold text-gold" />
                            {Number(shopper.rating).toFixed(1)}
                          </span>
                          <span>•</span>
                          <span>{shopper.total_deliveries} deliveries</span>
                          <span>•</span>
                          <span>{shopper.commission_rate}% rate</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={shopper.is_available ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>
                        {shopper.is_available ? "Active" : "Suspended"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedShopper(shopper);
                          setActionModal({ open: true, type: "suspend" });
                        }}
                      >
                        {shopper.is_available ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
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
                {actionModal.type === "verify" && "Verify Shopper"}
                {actionModal.type === "suspend" && (selectedShopper?.is_available ? "Suspend Shopper" : "Reactivate Shopper")}
                {actionModal.type === "view" && "Shopper Details"}
              </DialogTitle>
            </DialogHeader>

            {selectedShopper && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                  <p><strong>ID:</strong> {selectedShopper.id.slice(0, 8)}...</p>
                  <p><strong>Market:</strong> {selectedShopper.markets?.name || "N/A"}</p>
                  <p><strong>Rating:</strong> {Number(selectedShopper.rating).toFixed(1)} ⭐</p>
                  <p><strong>Deliveries:</strong> {selectedShopper.total_deliveries}</p>
                  <p><strong>Commission:</strong> {selectedShopper.commission_rate}%</p>
                  <p><strong>Joined:</strong> {new Date(selectedShopper.created_at).toLocaleDateString()}</p>
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
                        variant={actionModal.type === "suspend" && selectedShopper.is_available ? "destructive" : "default"}
                        onClick={actionModal.type === "verify" ? handleVerify : handleSuspend}
                        disabled={processing}
                      >
                        {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {actionModal.type === "verify" && "Verify Shopper"}
                        {actionModal.type === "suspend" && (selectedShopper.is_available ? "Suspend" : "Reactivate")}
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

export default AdminShoppers;