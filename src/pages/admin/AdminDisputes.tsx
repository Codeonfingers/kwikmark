import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Eye, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Dispute {
  id: string;
  order_id: string;
  reporter_id: string;
  reported_user_id: string | null;
  status: string;
  category: string;
  description: string;
  resolution: string | null;
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-red-500/20 text-red-700",
  under_review: "bg-yellow-500/20 text-yellow-700",
  resolved: "bg-green-500/20 text-green-700",
  closed: "bg-gray-500/20 text-gray-700",
};

const categoryLabels: Record<string, string> = {
  quality: "Quality Issue",
  missing_items: "Missing Items",
  payment: "Payment Problem",
  delivery: "Delivery Issue",
  other: "Other",
};

export default function AdminDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDisputes();

    const channel = supabase
      .channel("admin-disputes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes" },
        () => fetchDisputes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDisputes = async () => {
    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch disputes");
      return;
    }
    setDisputes(data || []);
    setLoading(false);
  };

  const updateDispute = async () => {
    if (!selectedDispute || !user) return;

    setUpdating(true);
    const updates: Record<string, unknown> = {
      admin_notes: adminNotes || selectedDispute.admin_notes,
    };

    if (newStatus) {
      updates.status = newStatus;
    }

    if (resolution) {
      updates.resolution = resolution;
    }

    if (newStatus === "resolved" || newStatus === "closed") {
      updates.resolved_by = user.id;
    }

    const { error } = await supabase
      .from("disputes")
      .update(updates)
      .eq("id", selectedDispute.id);

    setUpdating(false);

    if (error) {
      toast.error("Failed to update dispute");
      return;
    }

    toast.success("Dispute updated successfully");
    setSelectedDispute(null);
    setAdminNotes("");
    setResolution("");
    setNewStatus("");
    fetchDisputes();
  };

  const openDisputes = disputes.filter((d) => d.status === "open");
  const underReviewDisputes = disputes.filter((d) => d.status === "under_review");
  const resolvedDisputes = disputes.filter((d) => d.status === "resolved" || d.status === "closed");

  if (loading) {
    return (
      <DashboardLayout role="admin" title="Disputes">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const DisputeCard = ({ dispute }: { dispute: Dispute }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge className={statusColors[dispute.status]}>{dispute.status}</Badge>
          <Badge variant="outline">{categoryLabels[dispute.category]}</Badge>
        </div>
        <p className="text-sm font-medium line-clamp-1">{dispute.description}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(dispute.created_at), "PPp")}
        </p>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDispute(dispute);
              setAdminNotes(dispute.admin_notes || "");
              setResolution(dispute.resolution || "");
              setNewStatus(dispute.status);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Dispute Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusColors[dispute.status]}>{dispute.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline">{categoryLabels[dispute.category]}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(dispute.created_at), "PPp")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="text-sm font-mono text-xs">{dispute.order_id}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm p-3 bg-muted rounded-lg">{dispute.description}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Update Status</p>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this dispute..."
                rows={3}
              />
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Resolution</p>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how this dispute was resolved..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                Cancel
              </Button>
              <Button onClick={updateDispute} disabled={updating}>
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <DashboardLayout role="admin" title="Disputes Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Disputes</p>
              <p className="text-2xl font-bold">{disputes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="text-2xl font-bold text-red-600">{openDisputes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Under Review</p>
              <p className="text-2xl font-bold text-yellow-600">{underReviewDisputes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{resolvedDisputes.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Disputes Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              All Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="open">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="open">
                  Open ({openDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="review">
                  Under Review ({underReviewDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({resolvedDisputes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="space-y-4 mt-4">
                {openDisputes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No open disputes</p>
                ) : (
                  openDisputes.map((dispute) => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="review" className="space-y-4 mt-4">
                {underReviewDisputes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No disputes under review</p>
                ) : (
                  underReviewDisputes.map((dispute) => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="resolved" className="space-y-4 mt-4">
                {resolvedDisputes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No resolved disputes</p>
                ) : (
                  resolvedDisputes.map((dispute) => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}