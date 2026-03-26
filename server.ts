import express from 'express';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import path from 'path';

// [PHASE 16] STRIPE WEBHOOK INTEGRATION
// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

// The webhook secret to verify the signature
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- API ROUTES ---

  // 1. Stripe Webhook Endpoint
  // Must use raw body parser to verify the Stripe signature
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    (request, response) => {
      const sig = request.headers['stripe-signature'];
      let event;

      try {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(request.body, sig as string, endpointSecret);
      } catch (err: any) {
        console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`[Stripe Webhook] Payment successful for session: ${session.id}`);
          
          // Here you would typically:
          // 1. Extract the user ID from session.client_reference_id or session.metadata
          // 2. Update the user's `is_pro` status in Supabase/Firebase
          // Example: await supabase.from('users').update({ is_pro: true }).eq('id', userId);
          
          break;
          
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`);
          // Revoke Pro status
          break;
          
        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      response.send();
    }
  );

  // 2. Mock Checkout Session Creation (for demo purposes)
  app.post('/api/create-checkout-session', express.json(), async (req, res) => {
    try {
      // In a real app, you would create a real Stripe Checkout Session here
      // const session = await stripe.checkout.sessions.create({ ... });
      
      // Mocking the response for the frontend
      res.json({ id: 'cs_test_mock123456789' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // --- VITE MIDDLEWARE (Frontend) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Stripe] Webhook endpoint ready at /api/webhooks/stripe`);
  });
}

startServer();
