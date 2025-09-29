// supabase/functions/delete-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client dengan token user pemanggil (untuk cek role)
    const client = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    // Pastikan pemanggil adalah admin
    const { data: prof } = await client
      .from("profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "admin") return new Response("Forbidden", { status: 403 });

    const { userId } = await req.json();

    // Admin client (pakai service_role_key)
    const admin = createClient(supaUrl, serviceKey);

    // Hapus user di Auth
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return new Response(JSON.stringify({ ok:false, error: delErr.message }), { status: 400 });

    // Opsional: bersihkan profile jika tidak otomatis
    await admin.from("profiles").delete().eq("id", userId);

    return new Response(JSON.stringify({ ok:true }), { headers: { "Content-Type":"application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status: 500 });
  }
});
