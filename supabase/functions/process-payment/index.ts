import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId, amount, momoPhone, momoNetwork } = await req.json();

    // Validate required fields
    if (!orderId || !amount || !momoPhone || !momoNetwork) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate phone number format (Ghanaian)
    const phoneRegex = /^0[2-5][0-9]{8}$/;
    if (!phoneRegex.test(momoPhone)) {
      return new Response(JSON.stringify({ error: 'Invalid Ghanaian phone number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate network
    const validNetworks = ['mtn', 'vodafone', 'airteltigo'];
    if (!validNetworks.includes(momoNetwork)) {
      return new Response(JSON.stringify({ error: 'Invalid mobile money network' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify order exists and belongs to user
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('consumer_id', user.id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify amount matches order total
    if (Math.abs(order.total - amount) > 0.01) {
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing pending/processing payment for this order
    const { data: existingPayment } = await supabaseClient
      .from('payments')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'processing'])
      .single();

    if (existingPayment) {
      return new Response(JSON.stringify({ 
        error: 'A payment is already pending for this order',
        payment_id: existingPayment.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a reference for tracking (NOT a transaction ID - that comes from the payment provider)
    const paymentReference = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create payment record with PENDING status
    // SECURITY: Payment remains pending until verified by admin or payment provider webhook
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: user.id,
        amount,
        payment_method: 'momo',
        momo_phone: momoPhone,
        momo_network: momoNetwork,
        status: 'pending', // CRITICAL: Never auto-complete payments
        external_reference: paymentReference,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      return new Response(JSON.stringify({ error: 'Failed to create payment record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update order to show payment is pending (but NOT completed)
    await supabaseClient
      .from('orders')
      .update({ status: 'pending' }) // Order stays pending until payment is verified
      .eq('id', orderId);

    console.log(`Payment initiated for order ${orderId}, reference: ${paymentReference}`);

    // TODO: In production, integrate with actual MoMo API here:
    // 1. Call MTN/Vodafone/AirtelTigo API to initiate payment request
    // 2. Store their transaction reference in transaction_id field
    // 3. Set up webhook endpoint to receive payment confirmation
    // 4. Only mark as 'completed' when webhook confirms payment success

    return new Response(JSON.stringify({ 
      success: true, 
      payment: { 
        id: payment.id, 
        status: 'pending',
        reference: paymentReference
      },
      message: 'Payment request submitted. Please complete the payment on your phone and wait for confirmation. An admin will verify your payment.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
