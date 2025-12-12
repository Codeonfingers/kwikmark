import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Package, MapPin, Phone, Clock, CheckCircle2, 
  Camera, Navigation, X, Upload, Loader2, ArrowLeft 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";
import { useShopperJobs } from "@/hooks/useShopperJobs";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ShopperJobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { myJobs, availableJobs, acceptJob, completeJob, updateJobStatus } = useShopperJobs();
  const { uploadImage, uploading } = useImageUpload();
  
  const [job, setJob] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allJobs = [...myJobs, ...availableJobs];
    const foundJob = allJobs.find((j) => j.id === jobId);
    setJob(foundJob || null);
    setProofUrl(foundJob?.proof_url || null);
    setLoading(false);
  }, [jobId, myJobs, availableJobs]);

  const handleAccept = async () => {
    if (!job) return;
    await acceptJob(job.id);
    toast.success("Job accepted!");
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job) return;

    const { url, error } = await uploadImage(file, "product-images");
    if (url) {
      await supabase
        .from("shopper_jobs")
        .update({ 
          proof_url: url, 
          proof_uploaded_at: new Date().toISOString() 
        })
        .eq("id", job.id);

      setProofUrl(url);
      toast.success("Proof photo uploaded!");
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!job) return;
    await updateJobStatus(job.id, status);
    toast.success(`Status updated to ${status}`);
  };

  const handleComplete = async () => {
    if (!job) return;
    await completeJob(job.id);
    toast.success("Job completed!");
    navigate("/shopper/jobs");
  };

  if (loading) {
    return (
      <DashboardLayout role="shopper" title="Job Details">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout role="shopper" title="Job Details">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate("/shopper/jobs")} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusColor: Record<string, string> = {
    available: "bg-muted",
    accepted: "bg-secondary/20 text-secondary",
    in_progress: "bg-primary/20 text-primary",
    ready_for_delivery: "bg-gold/20 text-gold",
    completed: "bg-success/20 text-success",
  };

  return (
    <DashboardLayout role="shopper" title="Job Details">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/shopper/jobs")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
        </Button>

        {/* Job Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-display font-bold">
                  Order #{job.order?.order_number || "N/A"}
                </h1>
                <p className="text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                </p>
              </div>
              <Badge className={statusColor[job.status] || "bg-muted"}>
                {job.status.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-success">
                  ₵{Number(job.commission_amount || 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Commission</p>
              </div>
              <Button variant="outline" onClick={() => setShowMap(!showMap)}>
                <Navigation className="w-4 h-4 mr-2" />
                {showMap ? "Hide Map" : "View Route"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        {showMap && (
          <Card>
            <CardContent className="p-0">
              <OrderTrackingMap 
                orderStatus={job.status}
                shopperName="Shopper"
              />
            </CardContent>
          </Card>
        )}

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" /> Items to Pick Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.order?.items?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between p-3 bg-muted/50 rounded-xl"
                >
                  <div>
                    <p className="font-medium">
                      {item.quantity}x {item.product_name}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <p className="font-medium">
                    ₵{Number(item.total_price).toFixed(2)}
                  </p>
                </div>
              )) || (
                <p className="text-muted-foreground">No items data</p>
              )}
            </div>

            {job.order?.special_instructions && (
              <div className="mt-4 p-3 bg-secondary/10 rounded-xl">
                <p className="text-sm font-medium">Special Instructions:</p>
                <p className="text-sm text-muted-foreground">
                  {job.order.special_instructions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proof Upload */}
        {["accepted", "in_progress", "ready_for_delivery"].includes(job.status) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" /> Proof of Purchase
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proofUrl ? (
                <div className="space-y-4">
                  <img
                    src={proofUrl}
                    alt="Proof"
                    className="w-full max-h-64 object-cover rounded-xl"
                  />
                  <p className="text-sm text-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Proof uploaded
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a photo of items as proof of purchase
                  </p>
                  <Label
                    htmlFor="proof-upload"
                    className="flex items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary"
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p>Click to upload photo</p>
                      </div>
                    )}
                  </Label>
                  <Input
                    id="proof-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProofUpload}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {job.status === "available" && (
            <Button onClick={handleAccept} className="w-full">
              Accept Job
            </Button>
          )}
          {job.status === "accepted" && (
            <Button onClick={() => handleStatusUpdate("in_progress")} className="w-full">
              Start Shopping
            </Button>
          )}
          {job.status === "in_progress" && proofUrl && (
            <Button onClick={() => handleStatusUpdate("ready_for_delivery")} className="w-full" variant="hero">
              Mark Ready for Delivery
            </Button>
          )}
          {job.status === "ready_for_delivery" && (
            <Button onClick={handleComplete} className="w-full" variant="hero">
              Complete Delivery
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ShopperJobDetail;
