
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
      'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
    },
  },
});

const plaidClient = new PlaidApi(configuration);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // In a multi-user app, this would be the authenticated user's ID.
    const clientUserId = 'static-user-id-for-dino';

    const linkTokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: clientUserId },
      client_name: "Dino's Spending Tracker",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      transactions: {
        days_requested: 730,
      }
    });

    return new Response(JSON.stringify({ link_token: linkTokenResponse.data.link_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
