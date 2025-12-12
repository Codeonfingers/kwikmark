import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "consumer" | "vendor" | "shopper" | "admin";

interface SignUpOptions {
  fullName: string;
  phone?: string;
  selectedRole?: AppRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoading: boolean;
  signUp: (email: string, password: string, options: SignUpOptions) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  addRole: (role: AppRole) => Promise<{ error: Error | null }>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchRoles = async (userId: string) => {
    setRolesLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (!error && data) {
      setRoles(data.map((r) => r.role as AppRole));
    }
    setRolesLoading(false);
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchRoles(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, options: SignUpOptions) => {
    const redirectUrl = `${window.location.origin}/`;
    
    console.log("[Auth] Signing up with role:", options.selectedRole || "consumer");
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          full_name: options.fullName,
          phone: options.phone,
          selected_role: options.selectedRole || "consumer", // Pass role to trigger
        },
      },
    });
    
    if (!error) {
      console.log("[Auth] Signup successful, role will be assigned by trigger:", options.selectedRole || "consumer");
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const addRole = async (role: AppRole) => {
    if (!user) return { error: new Error("Not authenticated") };
    
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role });
    
    if (!error) {
      setRoles((prev) => [...prev, role]);
    }
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        loading,
        rolesLoading,
        signUp,
        signIn,
        signOut,
        hasRole,
        addRole,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
