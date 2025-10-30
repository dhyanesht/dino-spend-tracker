import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user already has groups
    const { data: existingGroups } = await supabase
      .from('category_groups')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingGroups && existingGroups.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Groups already exist for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Define initial groups
    const initialGroups = [
      {
        name: 'Housing',
        description: 'rent, mortgage, utilities',
        color: '#EF4444',
        user_id: user.id,
      },
      {
        name: 'Food & Groceries',
        description: 'eating out, groceries',
        color: '#F59E0B',
        user_id: user.id,
      },
      {
        name: 'Transportation',
        description: 'fuel, maintenance, public transit',
        color: '#10B981',
        user_id: user.id,
      },
      {
        name: 'Technology',
        description: 'devices, software, subscriptions',
        color: '#3B82F6',
        user_id: user.id,
      },
      {
        name: 'Financial & Professional Services',
        description: 'bank fees, tax prep, consulting',
        color: '#8B5CF6',
        user_id: user.id,
      },
      {
        name: 'Health & Insurance',
        description: 'medical, dental, insurance premiums',
        color: '#EC4899',
        user_id: user.id,
      },
      {
        name: 'Personal & Recreation',
        description: 'clothing, hobbies, entertainment',
        color: '#14B8A6',
        user_id: user.id,
      },
      {
        name: 'Savings & Investments',
        description: 'emergency fund, retirement, stocks',
        color: '#6366F1',
        user_id: user.id,
      },
    ];

    // Insert groups
    const { data: createdGroups, error: insertError } = await supabase
      .from('category_groups')
      .insert(initialGroups)
      .select();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        message: 'Successfully seeded category groups',
        groups: createdGroups,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});