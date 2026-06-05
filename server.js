const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Debug - log what env vars are available
console.log('ENV CHECK - STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('ENV CHECK - Key starts with:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) : 'MISSING');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  'Standard-monthly': { amount: 4700,   name: 'Standard Monthly' },
  'Standard-annual':  { amount: 47000,  name: 'Standard Annual'  },
  'Pro-monthly':      { amount: 9700,   name: 'Pro Monthly'      },
  'Pro-annual':       { amount: 97000,  name: 'Pro Annual'       },
  'Elite-monthly':    { amount: 19700,  name: 'Elite Monthly'    },
  'Elite-annual':     { amount: 197000, name: 'Elite Annual'     },
};

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { planKey, email, name } = req.body;
    const plan = PLANS[planKey] || PLANS['Pro-monthly'];
    const customer = await stripe.customers.create({ email, name });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: 'usd',
      customer: customer.id,
      metadata: { planKey, planName: plan.name, email, name },
      receipt_email: email,
      description: 'CreditFix - ' + plan.name + ' - Carbonated Wealth LLC',
    });
    res.json({ clientSecret: paymentIntent.client_secret, customerId: customer.id });
  } catch (err) {
    console.error('Payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    res.json({ success: intent.status === 'succeeded', status: intent.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.json({
  status: 'CreditFix server running',
  version: '1.0',
  stripe_key_loaded: !!process.env.STRIPE_SECRET_KEY
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('CreditFix server running on port ' + PORT));
