import { useState, useEffect } from "react";
import { MapPin, Plus, Edit, Trash2, Loader2, ImagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useImageUpload } from "@/hooks/useImageUpload";
import { toast } from "sonner";

interface Market {
  id: string;
  name: string;
  location: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminMarkets = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const { uploadImage, uploading } = useImageUpload();
  
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    image_url: "",
    is_active: true,
  });

  const fetchMarkets = async () => {
    const { data, error } = await supabase
      .from("markets")
      .select("*")
      .order("name");

    if (!error && data) {
      setMarkets(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      description: "",
      image_url: "",
      is_active: true,
    });
    setEditingMarket(null);
  };

  const openEditModal = (market: Market) => {
    setEditingMarket(market);
    setFormData({
      name: market.name,
      location: market.location,
      description: market.description || "",
      image_url: market.image_url || "",
      is_active: market.is_active ?? true,
    });
    setModalOpen(true);
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
    if (!formData.name || !formData.location) {
      toast.error("Please fill required fields");
      return;
    }

    const marketData = {
      name: formData.name,
      location: formData.location,
      description: formData.description || null,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
    };

    if (editingMarket) {
      const { error } = await supabase
        .from("markets")
        .update(marketData)
        .eq("id", editingMarket.id);

      if (error) {
        toast.error("Failed to update market");
      } else {
        toast.success("Market updated!");
      }
    } else {
      const { error } = await supabase.from("markets").insert(marketData);

      if (error) {
        toast.error("Failed to create market");
      } else {
        toast.success("Market created!");
      }
    }

    setModalOpen(false);
    resetForm();
    fetchMarkets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this market?")) return;

    const { error } = await supabase.from("markets").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete market");
    } else {
      toast.success("Market deleted");
      fetchMarkets();
    }
  };

  const handleToggleActive = async (market: Market) => {
    const { error } = await supabase
      .from("markets")
      .update({ is_active: !market.is_active })
      .eq("id", market.id);

    if (!error) {
      fetchMarkets();
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin" title="Markets">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin" title="Markets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Market Management</h1>
          <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Market
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMarket ? "Edit Market" : "Add New Market"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Market Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Makola Market"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Accra Central"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the market..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Image</Label>
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="Market" className="w-full h-32 object-cover rounded-xl" />
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

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <Button className="w-full" onClick={handleSubmit}>
                  {editingMarket ? "Update Market" : "Create Market"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {markets.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">No markets yet</h3>
            <p className="text-muted-foreground mb-4">Add your first market to get started</p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Market
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market) => (
              <Card key={market.id}>
                <CardContent className="p-0">
                  <div className="h-32 bg-muted rounded-t-xl overflow-hidden">
                    {market.image_url ? (
                      <img src={market.image_url} alt={market.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{market.name}</h3>
                      <Switch
                        checked={market.is_active ?? true}
                        onCheckedChange={() => handleToggleActive(market)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{market.location}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(market)}>
                        <Edit className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(market.id)}>
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

export default AdminMarkets;