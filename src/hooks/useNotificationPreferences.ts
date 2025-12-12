import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { usePushNotifications } from "./usePushNotifications";

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { requestPermission, permission, isSupported } = usePushNotifications();
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("email_notifications, push_notifications")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setEmailNotifications(data.email_notifications ?? true);
        setPushNotifications(data.push_notifications ?? true);
      }
      setLoading(false);
    };

    fetchPreferences();
  }, [user]);

  const updatePreferences = async (
    email: boolean,
    push: boolean
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("profiles")
      .update({
        email_notifications: email,
        push_notifications: push,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update notification preferences");
      return { error };
    }

    setEmailNotifications(email);
    setPushNotifications(push);
    toast.success("Notification preferences updated");
    return { error: null };
  };

  const enablePushNotifications = async () => {
    if (!isSupported) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }

    const granted = await requestPermission();
    if (granted) {
      await updatePreferences(emailNotifications, true);
      return true;
    }
    return false;
  };

  return {
    emailNotifications,
    pushNotifications,
    pushPermission: permission,
    pushSupported: isSupported,
    loading,
    updatePreferences,
    enablePushNotifications,
  };
};
