import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Dispute {
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

type DisputeCategory = "quality" | "missing_items" | "payment" | "delivery" | "other";

export const useDisputes = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setDisputes([]);
      setLoading(false);
      return;
    }

    fetchDisputes();

    const channel = supabase
      .channel("user-disputes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes" },
        () => fetchDisputes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchDisputes = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .or(`reporter_id.eq.${user.id},reported_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching disputes:", error);
      return;
    }

    setDisputes(data || []);
    setLoading(false);
  };

  const createDispute = async (
    orderId: string,
    category: DisputeCategory,
    description: string,
    reportedUserId?: string
  ) => {
    if (!user) {
      toast.error("You must be logged in to create a dispute");
      return { error: new Error("Not authenticated") };
    }

    const { data, error } = await supabase
      .from("disputes")
      .insert({
        order_id: orderId,
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        category,
        description,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create dispute");
      return { error };
    }

    // Update order status to disputed
    await supabase
      .from("orders")
      .update({ status: "disputed" })
      .eq("id", orderId);

    toast.success("Dispute submitted", {
      description: "Our team will review it shortly.",
    });

    return { data, error: null };
  };

  return {
    disputes,
    loading,
    createDispute,
    refetch: fetchDisputes,
  };
};