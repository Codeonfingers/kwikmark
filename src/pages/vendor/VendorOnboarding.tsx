import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, MapPin, Plus, Trash2, Loader2, ImagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMarkets } from "@/hooks/useMarkets";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InitialProduct {
  name: string;
  price: string;
  unit: string;
}

const VendorOnboarding = () => {
  const { user, addRole } = useAuth();
  const { markets } = useMarkets();
  const { uploadImage, uploading } = useImageUpload();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [vendorData, setVendorData] = useState({
    businessName: "",
    marketId: "",
    stallNumber: "",
    description: "",
    photoUrl: "",
  });

  const [products, setProducts] = useState<InitialProduct[]>([
    { name: "", price: "", unit: "piece" },
  ]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadImage(file, "product-images");
    if (url) {
      setVendorData({ ...vendorData, photoUrl: url });
    }
  };

  const addProduct = () => {
    setProducts([...products, { name: "", price: "", unit: "piece" }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof InitialProduct, value: string) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!vendorData.businessName || !vendorData.marketId) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);

    try {
      // Create vendor profile
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .insert({
          user_id: user.id,
          business_name: vendorData.businessName,
          market_id: vendorData.marketId,
          stall_number: vendorData.stallNumber || null,
          description: vendorData.description || null,
          is_verified: false,
        })
        .select()
        .single();

      if (vendorError) throw vendorError;

      // Add vendor role
      await addRole("vendor");

      // Create initial products
      const validProducts = products.filter((p) => p.name && p.price);
      if (validProducts.length > 0 && vendor) {
        const productInserts = validProducts.map((p) => ({
          vendor_id: vendor.id,
          name: p.name,
          price: parseFloat(p.price),
          unit: p.unit,
          is_available: true,
          stock_quantity: 100,
        }));

        await supabase.from("products").insert(productInserts);
      }

      toast.success("Vendor profile created! Awaiting verification.");
      navigate("/vendor/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create vendor profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="vendor" title="Vendor Onboarding">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome to KwikMarket
          </h1>
          <p className="text-muted-foreground">
            Set up your vendor profile to start receiving orders
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            2
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" /> Business Details
              </CardTitle>
              <CardDescription>
                Tell us about your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input
                  value={vendorData.businessName}
                  onChange={(e) =>
                    setVendorData({ ...vendorData, businessName: e.target.value })
                  }
                  placeholder="e.g., Mama Ama's Fresh Produce"
                />
              </div>

              <div className="space-y-2">
                <Label>Select Market *</Label>
                <Select
                  value={vendorData.marketId}
                  onValueChange={(value) =>
                    setVendorData({ ...vendorData, marketId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your market" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        {market.name} - {market.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stall Number</Label>
                <Input
                  value={vendorData.stallNumber}
                  onChange={(e) =>
                    setVendorData({ ...vendorData, stallNumber: e.target.value })
                  }
                  placeholder="e.g., A-15"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={vendorData.description}
                  onChange={(e) =>
                    setVendorData({ ...vendorData, description: e.target.value })
                  }
                  placeholder="Tell customers about your business..."
                />
              </div>

              <div className="space-y-2">
                <Label>Business Photo (Optional)</Label>
                {vendorData.photoUrl ? (
                  <img
                    src={vendorData.photoUrl}
                    alt="Business"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                ) : (
                  <label className="flex items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <div className="text-center">
                        <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload photo
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!vendorData.businessName || !vendorData.marketId}
              >
                Next: Add Products
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" /> Initial Products
              </CardTitle>
              <CardDescription>
                Add some products to your catalog (you can add more later)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.map((product, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Product Name</Label>
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(index, "name", e.target.value)}
                      placeholder="e.g., Tomatoes"
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>Price (₵)</Label>
                    <Input
                      type="number"
                      value={product.price}
                      onChange={(e) => updateProduct(index, "price", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={product.unit}
                      onValueChange={(value) => updateProduct(index, "unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="piece">Piece</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="bunch">Bunch</SelectItem>
                        <SelectItem value="bowl">Bowl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {products.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProduct(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="outline" className="w-full" onClick={addProduct}>
                <Plus className="w-4 h-4 mr-2" /> Add Another Product
              </Button>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VendorOnboarding;
