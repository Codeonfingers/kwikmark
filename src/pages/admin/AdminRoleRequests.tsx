import { useState } from "react";
import { Shield, Check, X, Clock, User, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRoleRequests } from "@/hooks/useRoleRequests";

const AdminRoleRequests = () => {
  const { allRequests, loading, approveRequest, rejectRequest } = useRoleRequests();
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "approve" | "reject";
    requestId: string;
  }>({ open: false, type: "approve", requestId: "" });
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const pendingRequests = allRequests.filter((r) => r.status === "pending");
  const processedRequests = allRequests.filter((r) => r.status !== "pending");

  const handleAction = async () => {
    setProcessing(true);
    if (actionModal.type === "approve") {
      await approveRequest(actionModal.requestId, adminNotes);
    } else {
      await rejectRequest(actionModal.requestId, adminNotes);
    }
    setProcessing(false);
    setActionModal({ open: false, type: "approve", requestId: "" });
    setAdminNotes("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success/20 text-success";
      case "rejected":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-secondary/20 text-secondary";
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin" title="Role Requests">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Role Requests">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Role Requests</h1>
          {pendingRequests.length > 0 && (
            <Badge variant="secondary">
              {pendingRequests.length} pending
            </Badge>
          )}
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed">
              Processed ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">
                  No pending requests
                </h3>
                <p className="text-muted-foreground">
                  Role requests will appear here
                </p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            User: {request.user_id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(request.submitted_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className="capitalize">
                        {request.requested_role}
                      </Badge>
                    </div>

                    {request.reason && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-muted-foreground">
                          {request.reason}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          setActionModal({
                            open: true,
                            type: "reject",
                            requestId: request.id,
                          })
                        }
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() =>
                          setActionModal({
                            open: true,
                            type: "approve",
                            requestId: request.id,
                          })
                        }
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4 mt-4">
            {processedRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No processed requests
              </div>
            ) : (
              processedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            User: {request.user_id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.requested_role} •{" "}
                            {new Date(request.reviewed_at || "").toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    {request.admin_notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Notes: {request.admin_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Action Modal */}
        <Dialog
          open={actionModal.open}
          onOpenChange={(open) =>
            !open && setActionModal({ ...actionModal, open: false })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionModal.type === "approve" ? "Approve" : "Reject"} Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                  onClick={() => setActionModal({ ...actionModal, open: false })}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  variant={actionModal.type === "reject" ? "destructive" : "default"}
                  onClick={handleAction}
                  disabled={processing}
                >
                  {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {actionModal.type === "approve" ? "Approve" : "Reject"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminRoleRequests;
