import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  RefreshCw, CheckCircle2, X, Upload, Loader2, AlertTriangle, Eye 
} from "lucide-react";
import { useSubstitutionRequests, SubstitutionRequest } from "@/hooks/useSubstitutionRequests";
import { useImageUpload } from "@/hooks/useImageUpload";

interface SubstitutionRequestsListProps {
  orderId: string;
  role: "consumer" | "vendor" | "shopper";
}

const SubstitutionRequestsList = ({ orderId, role }: SubstitutionRequestsListProps) => {
  const { requests, loading, respondToRequest } = useSubstitutionRequests(orderId);
  const { uploadImage, uploading } = useImageUpload();
  
  const [respondingTo, setRespondingTo] = useState<SubstitutionRequest | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [responseImageUrl, setResponseImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pendingRequests = requests.filter(r => r.status === "pending");
  const resolvedRequests = requests.filter(r => r.status !== "pending");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadImage(file, "product-images");
    if (url) setResponseImageUrl(url);
  };

  const handleRespond = async (status: "approved" | "rejected") => {
    if (!respondingTo) return;
    setSubmitting(true);
    await respondToRequest(
      respondingTo.id,
      status,
      responseNote || undefined,
      responseImageUrl || undefined
    );
    setSubmitting(false);
    setRespondingTo(null);
    setResponseNote("");
    setResponseImageUrl(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-secondary/20"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-success/20 text-success"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> 
            Substitution Requests ({pendingRequests.length} pending)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`p-3 rounded-xl border ${
                request.status === "pending" 
                  ? "border-secondary bg-secondary/5" 
                  : "border-muted bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-sm">
                    {request.order_item?.quantity}x {request.order_item?.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                {statusBadge(request.status)}
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                <strong>Reason:</strong> {request.reason}
              </p>

              {request.suggested_item && (
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Suggested:</strong> {request.suggested_item}
                </p>
              )}

              {request.image_url && (
                <img 
                  src={request.image_url} 
                  alt="Issue" 
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
              )}

              {request.status !== "pending" && request.response_note && (
                <div className="p-2 bg-muted rounded-lg mt-2">
                  <p className="text-xs font-medium">Response:</p>
                  <p className="text-sm">{request.response_note}</p>
                  {request.response_image_url && (
                    <img 
                      src={request.response_image_url} 
                      alt="Response" 
                      className="w-full h-24 object-cover rounded-lg mt-2"
                    />
                  )}
                </div>
              )}

              {/* Action buttons for vendor/shopper */}
              {request.status === "pending" && (role === "vendor" || role === "shopper") && (
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setRespondingTo(request)}
                  >
                    <Eye className="w-3 h-3 mr-1" /> Respond
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Response Modal */}
      <Dialog open={!!respondingTo} onOpenChange={() => setRespondingTo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Substitution Request</DialogTitle>
          </DialogHeader>

          {respondingTo && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">
                  {respondingTo.order_item?.quantity}x {respondingTo.order_item?.product_name}
                </p>
                <p className="text-sm text-muted-foreground">{respondingTo.reason}</p>
              </div>

              <div className="space-y-2">
                <Label>Your Response (optional)</Label>
                <Textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Explain the substitution or alternative..."
                />
              </div>

              <div className="space-y-2">
                <Label>Photo of Replacement (optional)</Label>
                {responseImageUrl ? (
                  <div className="relative">
                    <img
                      src={responseImageUrl}
                      alt="Replacement"
                      className="w-full h-32 object-cover rounded-xl"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setResponseImageUrl(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Label
                    htmlFor="response-image-upload"
                    className="flex items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Upload replacement photo</p>
                      </div>
                    )}
                  </Label>
                )}
                <Input
                  id="response-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={submitting}
                  onClick={() => handleRespond("rejected")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  disabled={submitting}
                  onClick={() => handleRespond("approved")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubstitutionRequestsList;
