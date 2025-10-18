import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, categories } = await req.json();
    
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Invalid transactions array');
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      throw new Error('Invalid categories array');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const categoryList = categories.map(cat => cat.name).join(', ');
    
    const prompt = `You are a financial transaction categorization assistant. 
Analyze these transaction descriptions and assign the most appropriate category to each one.

Available categories: ${categoryList}

Rules:
- Choose the MOST SPECIFIC category that fits
- If no specific category fits, use "Other"
- Be consistent with similar transactions
- Consider common merchant names and patterns

Transactions to categorize:
${transactions.map((t, i) => `${i + 1}. "${t.description}" (Store: ${t.storeName})`).join('\n')}

Return ONLY a JSON array with this exact format (no markdown, no explanation):
[{"storeName": "store name", "category": "category name"}, ...]`;

    console.log('Sending request to Lovable AI...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a financial categorization expert. Return only valid JSON arrays with no markdown formatting or explanation.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('Lovable AI credits depleted. Please add credits to continue.');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);
    
    // Parse the AI response, handling potential markdown code blocks
    let categorizations;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      categorizations = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI categorization response');
    }

    if (!Array.isArray(categorizations)) {
      throw new Error('AI returned invalid format');
    }

    console.log('Successfully categorized transactions:', categorizations.length);

    return new Response(JSON.stringify({ categorizations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in categorize-transactions function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
