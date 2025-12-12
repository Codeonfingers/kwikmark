import { useState } from "react";
import { Package, Plus, Edit, Trash2, ImagePlus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProducts } from "@/hooks/useProducts";
import { useVendor } from "@/hooks/useVendor";
import { useImageUpload } from "@/hooks/useImageUpload";
import { toast } from "sonner";

const VendorCatalog = () => {
  const { vendor } = useVendor();
  const { products, categories, createProduct, updateProduct, deleteProduct, refetch } = useProducts(vendor?.id);
  const { uploadImage, uploading } = useImageUpload();

  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    unit: "piece",
    description: "",
    category_id: "",
    image_url: "",
    stock_quantity: "100",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      unit: "piece",
      description: "",
      category_id: "",
      image_url: "",
      stock_quantity: "100",
    });
    setEditingProduct(null);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: String(product.price),
      unit: product.unit || "piece",
      description: product.description || "",
      category_id: product.category_id || "",
      image_url: product.image_url || "",
      stock_quantity: String(product.stock_quantity || 100),
    });
    setProductModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadImage(file, "product-images");
    if (url) {
      setFormData({ ...formData, image_url: url });
    }
  };

  const handleSubmit = async () => {
    if (!vendor || !formData.name || !formData.price) {
      toast.error("Please fill required fields");
      return;
    }

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      unit: formData.unit,
      description: formData.description || null,
      category_id: formData.category_id || null,
      image_url: formData.image_url || null,
      stock_quantity: parseInt(formData.stock_quantity) || 100,
      vendor_id: vendor.id,
      is_available: true,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
      toast.success("Product updated!");
    } else {
      await createProduct(productData);
      toast.success("Product added!");
    }

    setProductModal(false);
    resetForm();
    refetch();
  };

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProduct(productId);
      toast.success("Product deleted");
      refetch();
    }
  };

  const handleAvailabilityToggle = async (productId: string, available: boolean) => {
    await updateProduct(productId, { is_available: available });
    toast.success(available ? "Product is now available" : "Product marked as unavailable");
    refetch();
  };

  return (
    <DashboardLayout role="vendor" title="Catalog">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Your Catalog</h1>
          <Dialog open={productModal} onOpenChange={(open) => { setProductModal(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Fresh Tomatoes"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (₵) *</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="piece">Piece</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="bunch">Bunch</SelectItem>
                        <SelectItem value="bowl">Bowl</SelectItem>
                        <SelectItem value="bag">Bag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Product Image</Label>
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="Product" className="w-full h-32 object-cover rounded-xl" />
                  ) : (
                    <label className="flex items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <div className="text-center">
                          <ImagePlus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Upload image</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>

                <Button className="w-full" onClick={handleSubmit}>
                  {editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">Add products to your catalog to start selling</p>
            <Button onClick={() => setProductModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Product
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{product.name}</h3>
                      <p className="text-lg font-display font-bold text-primary">
                        ₵{Number(product.price).toFixed(2)} / {product.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {product.stock_quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.is_available ?? true}
                        onCheckedChange={(checked) => handleAvailabilityToggle(product.id, checked)}
                      />
                      <span className="text-sm">
                        {product.is_available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(product)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VendorCatalog;
