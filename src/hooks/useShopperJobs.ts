import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type ShopperJob = Database["public"]["Tables"]["shopper_jobs"]["Row"];
type Shopper = Database["public"]["Tables"]["shoppers"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

// Filtered job type that hides commission from non-assigned shoppers
export interface SafeJobWithOrder {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  shopper_id: string | null;
  proof_url?: string | null;
  proof_uploaded_at?: string | null;
  // commission_amount is only visible if user is assigned shopper
  commission_amount?: number | null;
  order?: Order;
}

export const useShopperJobs = () => {
  const { user, addRole } = useAuth();
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [availableJobs, setAvailableJobs] = useState<SafeJobWithOrder[]>([]);
  const [myJobs, setMyJobs] = useState<SafeJobWithOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to filter sensitive data from jobs
  const sanitizeJob = (job: ShopperJob & { orders?: any }, isAssigned: boolean): SafeJobWithOrder => {
    const safeJob: SafeJobWithOrder = {
      id: job.id,
      order_id: job.order_id,
      status: job.status,
      created_at: job.created_at,
      accepted_at: job.accepted_at,
      picked_up_at: job.picked_up_at,
      delivered_at: job.delivered_at,
      shopper_id: job.shopper_id,
      proof_url: job.proof_url,
      proof_uploaded_at: job.proof_uploaded_at,
      order: job.orders as Order | undefined,
    };
    
    // Only show commission if user is the assigned shopper
    if (isAssigned) {
      safeJob.commission_amount = job.commission_amount;
    }
    
    return safeJob;
  };

  useEffect(() => {
    if (!user) {
      setShopper(null);
      setAvailableJobs([]);
      setMyJobs([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch shopper profile
      const { data: shopperData } = await supabase
        .from("shoppers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setShopper(shopperData);

      // Fetch available jobs - WITHOUT commission_amount for unassigned jobs
      const { data: availableData } = await supabase
        .from("shopper_jobs")
        .select("id, order_id, status, created_at, accepted_at, picked_up_at, delivered_at, shopper_id, orders(*)")
        .eq("status", "available")
        .is("shopper_id", null);

      setAvailableJobs(
        availableData?.map((j) => sanitizeJob(j as any, false)) || []
      );

      // Fetch my jobs if shopper exists - WITH commission_amount
      if (shopperData) {
        const { data: myJobsData } = await supabase
          .from("shopper_jobs")
          .select("*, orders(*)")
          .eq("shopper_id", shopperData.id);

        setMyJobs(
          myJobsData?.map((j) => sanitizeJob(j as any, true)) || []
        );
      }

      setLoading(false);
    };

    fetchData();

    // Set up real-time subscription for jobs
    const channel = supabase
      .channel("shopper-jobs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopper_jobs",
        },
        (payload) => {
          console.log("[ShopperJobs] Realtime event:", payload.eventType, payload.new);
          
          if (payload.eventType === "INSERT" && (payload.new as ShopperJob).status === "available") {
            // New job available - fetch with order details
            supabase
              .from("shopper_jobs")
              .select("id, order_id, status, created_at, accepted_at, picked_up_at, delivered_at, shopper_id, proof_url, proof_uploaded_at, orders(*)")
              .eq("id", (payload.new as ShopperJob).id)
              .single()
              .then(({ data }) => {
                if (data) {
                  console.log("[ShopperJobs] Adding new available job:", data);
                  setAvailableJobs((prev) => {
                    // Avoid duplicates
                    if (prev.some(j => j.id === data.id)) return prev;
                    return [sanitizeJob(data as any, false), ...prev];
                  });
                }
              });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as ShopperJob;
            
            // If job is no longer available, remove from available list
            if (updated.status !== "available" || updated.shopper_id) {
              setAvailableJobs((prev) => prev.filter((j) => j.id !== updated.id));
            }
            
            // Refetch myJobs to get updated data
            supabase
              .from("shopper_jobs")
              .select("*, orders(*)")
              .eq("id", updated.id)
              .single()
              .then(({ data }) => {
                if (data && data.shopper_id) {
                  // Check if this job belongs to current user by comparing with shopper state
                  setMyJobs((prev) => {
                    const existing = prev.findIndex(j => j.id === data.id);
                    // Only update if job exists in myJobs OR if it was just accepted
                    if (existing >= 0 || (data.shopper_id && updated.status === "accepted")) {
                      const sanitized = sanitizeJob(data as any, true);
                      if (existing >= 0) {
                        const newJobs = [...prev];
                        newJobs[existing] = sanitized;
                        return newJobs;
                      }
                      // Check if this is for current shopper before adding
                      return prev;
                    }
                    return prev;
                  });
                }
              });
          } else if (payload.eventType === "DELETE") {
            setAvailableJobs((prev) => prev.filter((j) => j.id !== (payload.old as ShopperJob).id));
            setMyJobs((prev) => prev.filter((j) => j.id !== (payload.old as ShopperJob).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createShopperProfile = async (marketId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("shoppers")
      .insert({
        user_id: user.id,
        market_id: marketId,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create shopper profile");
      return { error };
    }

    await addRole("shopper");
    setShopper(data);
    toast.success("Shopper profile created!");
    return { data, error: null };
  };

  const acceptJob = async (jobId: string) => {
    if (!shopper) return { error: new Error("No shopper profile") };

    const { error } = await supabase
      .from("shopper_jobs")
      .update({
        shopper_id: shopper.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to accept job");
      return { error };
    }

    // Update order status via edge function
    const job = availableJobs.find((j) => j.id === jobId);
    if (job?.order_id) {
      await supabase.functions.invoke("update-order-status", {
        body: { orderId: job.order_id, newStatus: "picked_up" },
      });
    }

    toast.success("Job accepted!");
    return { error: null };
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    const { error } = await supabase
      .from("shopper_jobs")
      .update({ status })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to update job status");
      return { error };
    }

    toast.success(`Job status updated to ${status}`);
    return { error: null };
  };

  const completeJob = async (jobId: string) => {
    if (!shopper) return { error: new Error("No shopper profile") };

    const { error } = await supabase
      .from("shopper_jobs")
      .update({
        status: "completed",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to complete job");
      return { error };
    }

    await supabase
      .from("shoppers")
      .update({ total_deliveries: (shopper.total_deliveries || 0) + 1 })
      .eq("id", shopper.id);

    toast.success("Job completed!");
    return { error: null };
  };

  return {
    shopper,
    availableJobs,
    myJobs,
    loading,
    createShopperProfile,
    acceptJob,
    updateJobStatus,
    completeJob,
  };
};
