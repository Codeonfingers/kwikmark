import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SubstitutionRequest {
  id: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  reason: string;
  suggested_item: string | null;
  image_url: string | null;
  status: "pending" | "approved" | "rejected";
  response_note: string | null;
  response_image_url: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  order_item?: {
    product_name: string;
    quantity: number;
    unit_price: number;
  };
}

export const useSubstitutionRequests = (orderId?: string) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SubstitutionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("substitution_requests")
      .select(`
        *,
        order_item:order_items(product_name, quantity, unit_price)
      `)
      .order("created_at", { ascending: false });

    if (orderId) {
      query = query.eq("order_id", orderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching substitution requests:", error);
    } else {
      setRequests((data as unknown as SubstitutionRequest[]) || []);
    }
    setLoading(false);
  }, [user, orderId]);

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("substitution-requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "substitution_requests" },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const createRequest = async (
    orderItemId: string,
    reason: string,
    suggestedItem?: string,
    imageUrl?: string
  ) => {
    if (!user || !orderId) {
      toast.error("Missing required information");
      return { error: new Error("Missing required information") };
    }

    const { data, error } = await supabase
      .from("substitution_requests")
      .insert({
        order_id: orderId,
        order_item_id: orderItemId,
        user_id: user.id,
        reason,
        suggested_item: suggestedItem || null,
        image_url: imageUrl || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create substitution request");
      return { error };
    }

    toast.success("Substitution request submitted!");
    return { data, error: null };
  };

  const respondToRequest = async (
    requestId: string,
    status: "approved" | "rejected",
    responseNote?: string,
    responseImageUrl?: string
  ) => {
    if (!user) {
      toast.error("You must be logged in");
      return { error: new Error("Not authenticated") };
    }

    const { data, error } = await supabase
      .from("substitution_requests")
      .update({
        status,
        response_note: responseNote || null,
        response_image_url: responseImageUrl || null,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      toast.error("Failed to update substitution request");
      return { error };
    }

    toast.success(`Substitution ${status}!`);
    return { data, error: null };
  };

  return {
    requests,
    loading,
    createRequest,
    respondToRequest,
    refetch: fetchRequests,
  };
};
