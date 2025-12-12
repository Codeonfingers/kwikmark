import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Upload, Loader2, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const disputeSchema = z.object({
  orderId: z.string().uuid("Please select a valid order"),
  category: z.enum(["quality", "missing_items", "payment", "delivery", "other"]),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
});

const categoryOptions = [
  { value: "quality", label: "Quality Issue", description: "Items were damaged or not fresh" },
  { value: "missing_items", label: "Missing Items", description: "Some items were not delivered" },
  { value: "payment", label: "Payment Problem", description: "Issue with payment or overcharge" },
  { value: "delivery", label: "Delivery Issue", description: "Delayed or wrong delivery" },
  { value: "other", label: "Other", description: "Any other issue" },
];

const ConsumerDisputes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { orders } = useOrders();
  const { uploadImage, uploading } = useImageUpload();

  const [formData, setFormData] = useState({
    orderId: searchParams.get("orderId") || "",
    category: "",
    description: "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter to show only completed or disputed orders
  const eligibleOrders = orders.filter(o => 
    ["completed", "disputed", "picked_up", "inspecting", "approved"].includes(o.status)
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { url, error } = await uploadImage(file, "product-images");
    if (url) {
      setImageUrl(url);
      toast.success("Image uploaded");
    } else if (error) {
      toast.error("Failed to upload image");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form
    const result = disputeSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    const { error } = await supabase.from("disputes").insert({
      order_id: formData.orderId,
      reporter_id: user.id,
      category: formData.category,
      description: formData.description,
      status: "open",
    });

    if (error) {
      toast.error("Failed to submit dispute");
      setSubmitting(false);
      return;
    }

    // Update order status to disputed
    await supabase
      .from("orders")
      .update({ status: "disputed" })
      .eq("id", formData.orderId);

    toast.success("Dispute submitted successfully", {
      description: "Our team will review it shortly.",
    });

    setSubmitting(false);
    navigate("/consumer/my-orders");
  };

  return (
    <DashboardLayout role="consumer" title="Report a Problem">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Report a Problem
            </CardTitle>
            <CardDescription>
              Let us know about any issues with your order. We'll review and respond within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order Selection */}
              <div className="space-y-2">
                <Label htmlFor="order">Select Order *</Label>
                <Select
                  value={formData.orderId}
                  onValueChange={(value) => setFormData({ ...formData, orderId: value })}
                >
                  <SelectTrigger className={errors.orderId ? "border-destructive" : ""}>
                    <SelectValue placeholder="Choose the order with the issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleOrders.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No orders available for dispute
                      </div>
                    ) : (
                      eligibleOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} - ₵{Number(order.total).toFixed(2)} ({order.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.orderId && (
                  <p className="text-sm text-destructive">{errors.orderId}</p>
                )}
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Issue Type *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-4 border rounded-xl text-left transition-all ${
                        formData.category === cat.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:border-muted-foreground/50"
                      }`}
                    >
                      <p className="font-medium">{cat.label}</p>
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe the issue in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className={errors.description ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description.length}/1000 characters
                </p>
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Attach Photo (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Upload a photo showing the issue (damaged items, wrong items, etc.)
                </p>
                {imageUrl ? (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Dispute evidence"
                      className="w-full max-h-48 object-cover rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setImageUrl(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Label
                    htmlFor="dispute-image"
                    className="flex items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm">Click to upload photo</p>
                      </div>
                    )}
                  </Label>
                )}
                <Input
                  id="dispute-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !formData.orderId || !formData.category || !formData.description}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Dispute
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ConsumerDisputes;