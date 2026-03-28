/**
 * Webhook Stripe: provisiona igreja (RPC platform_stripe_provision_church com service_role)
 * e opcionalmente associa utilizador admin via metadata supabase_user_id.
 *
 * Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * Auto na Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Metadata esperada em checkout.session.completed:
 * - church_name (obrigatório)
 * - ministry_name (opcional; usa church_name se vazio)
 * - invite_code (opcional)
 * - supabase_user_id (opcional; UUID do auth.users para role admin + church_id)
 */
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'STRIPE_WEBHOOK_SECRET not set' }), { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'missing stripe-signature' }), { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe signature verification failed', err);
    return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase env missing' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const md = session.metadata ?? {};
        const churchName = (md.church_name ?? md.churchName ?? '').trim();
        const ministryName = (md.ministry_name ?? md.ministryName ?? churchName).trim();
        if (!churchName) {
          console.warn('checkout.session.completed: missing church_name in metadata');
          break;
        }
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer && typeof session.customer !== 'string'
              ? session.customer.id
              : null;
        const subRaw = session.subscription;
        const subId =
          typeof subRaw === 'string' ? subRaw : subRaw && typeof subRaw !== 'string' ? subRaw.id : null;

        const inviteRaw = md.invite_code ?? md.inviteCode;
        const inviteCode = inviteRaw != null && String(inviteRaw).trim() !== '' ? String(inviteRaw).trim() : null;

        const { data, error } = await supabase.rpc('platform_stripe_provision_church', {
          p_church_name: churchName,
          p_ministry_name: ministryName || churchName,
          p_customer_id: customerId,
          p_subscription_id: subId,
          p_invite_code: inviteCode,
        });

        if (error) {
          console.error('platform_stripe_provision_church', error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const result = data as { success?: boolean; church_id?: string; error?: string };
        if (!result?.success) {
          console.error('provision failed', result);
          return new Response(JSON.stringify({ error: result?.error ?? 'provision_failed' }), { status: 400 });
        }

        const uidRaw = md.supabase_user_id ?? md.supabaseUserId;
        const uid = uidRaw != null ? String(uidRaw).trim() : '';
        if (uid && result.church_id) {
          const { error: upErr } = await supabase
            .from('users')
            .update({ church_id: result.church_id, role: 'admin' })
            .eq('id', uid);
          if (upErr) console.error('users update after provision', upErr);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.id) {
          await supabase.from('churches').update({ status: 'suspended' }).eq('stripe_subscription_id', sub.id);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
