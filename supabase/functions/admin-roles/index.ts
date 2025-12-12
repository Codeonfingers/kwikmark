import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header to verify the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they are admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the calling user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if calling user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      console.error('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, targetUserId, role, reason, mfaVerified } = await req.json();
    
    // Validate required fields
    if (!action || !targetUserId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, targetUserId, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['consumer', 'vendor', 'shopper', 'admin'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For admin role grants, require MFA and reason
    if (action === 'grant' && role === 'admin') {
      if (!mfaVerified) {
        return new Response(
          JSON.stringify({ error: 'MFA verification required for admin role grants', requireMfa: true }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!reason || reason.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Reason required for admin role grants' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get client IP and generate trace ID
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const traceId = crypto.randomUUID();

    let result;

    if (action === 'grant') {
      console.log(`Granting role ${role} to user ${targetUserId} by admin ${user.id}`);
      
      // Call the secure stored procedure
      const { data, error } = await supabaseAdmin.rpc('admin_grant_role', {
        target_user_id: targetUserId,
        target_role: role,
        reason: reason || null,
        ip_addr: ipAddress,
        trace: traceId,
        mfa_verified: mfaVerified || false
      });

      if (error) {
        console.error('Grant role error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = { success: true, action: 'granted', role, targetUserId, traceId };

    } else if (action === 'revoke') {
      console.log(`Revoking role ${role} from user ${targetUserId} by admin ${user.id}`);
      
      // Call the secure stored procedure
      const { data, error } = await supabaseAdmin.rpc('admin_revoke_role', {
        target_user_id: targetUserId,
        target_role: role,
        reason: reason || null,
        ip_addr: ipAddress,
        trace: traceId
      });

      if (error) {
        console.error('Revoke role error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = { success: true, action: 'revoked', role, targetUserId, traceId };

    } else if (action === 'list') {
      // Get user's current roles
      const { data: roles, error } = await supabaseAdmin
        .from('user_roles')
        .select('role, created_at')
        .eq('user_id', targetUserId);

      if (error) {
        console.error('List roles error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = { success: true, roles };

    } else if (action === 'audit') {
      // Get role audit log for a user
      const { data: auditLog, error } = await supabaseAdmin
        .from('role_audit_log')
        .select('*')
        .eq('target_user', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Audit log error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = { success: true, auditLog };

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be one of: grant, revoke, list, audit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Operation successful:', result);
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});