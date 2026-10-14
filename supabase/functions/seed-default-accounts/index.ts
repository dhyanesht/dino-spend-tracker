import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({} as any));
    const user_id = body.user_id;

    if (!user_id) {
      throw new Error("Missing user_id");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: existing } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ status: "ok", message: "Accounts already exist" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error } = await supabase.from("accounts").insert([
      { user_id, name: "Checking", type: "checking", is_primary: true, currency: "USD", is_active: true },
      { user_id, name: "Savings", type: "savings", is_primary: false, currency: "USD", is_active: true },
      { user_id, name: "Credit Card", type: "credit_card", is_primary: false, currency: "USD", is_active: true },
    ]);

    if (error) throw error;

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ status: "error", message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
});

