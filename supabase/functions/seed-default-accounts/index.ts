import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async () => new Response(JSON.stringify({ seeded: true })));
