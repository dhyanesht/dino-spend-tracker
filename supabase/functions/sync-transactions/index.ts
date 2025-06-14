
import { createClient } from '@supabase/supabase-js';
import { Configuration, PlaidApi, PlaidEnvironments, Transaction as PlaidTransaction } from 'plaid';

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
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

async function fetchAllTransactions(accessToken: string) {
    let allTransactions: PlaidTransaction[] = [];
    let hasMore = true;
    let cursor: string | undefined = undefined;

    while (hasMore) {
        const response = await plaidClient.transactionsSync({
            access_token: accessToken,
            cursor: cursor,
        });

        allTransactions = allTransactions.concat(response.data.added);
        hasMore = response.data.has_more;
        cursor = response.data.next_cursor;
    }
    
    // Note: For simplicity, we are not handling updated or removed transactions yet.
    // A production implementation should store and update the cursor for each item.
    return allTransactions;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { item_id } = await req.json();

        const { data: plaidItem, error: itemError } = await supabaseClient
            .from('plaid_items')
            .select('access_token')
            .eq('item_id', item_id)
            .single();

        if (itemError || !plaidItem) {
            throw new Error(`Could not find Plaid item with id: ${item_id}`);
        }

        const plaidTransactions = await fetchAllTransactions(plaidItem.access_token);
        
        const transactionsToInsert = plaidTransactions.map(t => ({
            description: t.name,
            amount: Math.abs(t.amount),
            date: t.date,
            category: t.category ? t.category.join(' / ') : 'Uncategorized',
            type: t.amount > 0 ? 'expense' : 'income',
        }));

        if (transactionsToInsert.length > 0) {
            const { error: insertError } = await supabaseClient
                .from('transactions')
                .insert(transactionsToInsert);

            if (insertError) {
                throw insertError;
            }
        }

        return new Response(JSON.stringify({ success: true, new_transactions: transactionsToInsert.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Error syncing transactions:', error);
        return new Response(JSON.stringify({ error: 'Failed to sync transactions' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
