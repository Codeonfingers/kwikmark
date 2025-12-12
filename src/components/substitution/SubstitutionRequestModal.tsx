import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useSubstitutionRequests } from "@/hooks/useSubstitutionRequests";

interface SubstitutionRequestModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  item: {
    id: string;
    product_name: string;
    quantity: number;
  };
}

const SubstitutionRequestModal = ({
  open,
  onClose,
  orderId,
  item,
}: SubstitutionRequestModalProps) => {
  const [reason, setReason] = useState("");
  const [suggestedItem, setSuggestedItem] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const { uploadImage, uploading } = useImageUpload();
  const { createRequest } = useSubstitutionRequests(orderId);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { url } = await uploadImage(file, "product-images");
    if (url) {
      setImageUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    
    setSubmitting(true);
    const { error } = await createRequest(
      item.id,
      reason,
      suggestedItem || undefined,
      imageUrl || undefined
    );
    setSubmitting(false);

    if (!error) {
      setReason("");
      setSuggestedItem("");
      setImageUrl(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Substitution</DialogTitle>
          <DialogDescription>
            Request a replacement for: <strong>{item.quantity}x {item.product_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Substitution *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Item is damaged, wrong size, missing..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggested">Suggested Replacement (optional)</Label>
            <Input
              id="suggested"
              value={suggestedItem}
              onChange={(e) => setSuggestedItem(e.target.value)}
              placeholder="e.g., Larger size tomatoes"
            />
          </div>

          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            {imageUrl ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Issue"
                  className="w-full h-32 object-cover rounded-xl"
                />
                <Button
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
                htmlFor="image-upload"
                className="flex items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload photo of issue</p>
                  </div>
                )}
              </Label>
            )}
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!reason.trim() || submitting}
              className="flex-1"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Submit Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubstitutionRequestModal;
