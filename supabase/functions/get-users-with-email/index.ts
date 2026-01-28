import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  "https://sinapsehealthcare.app",
  "https://sinapsehealthcare.lovable.app",
  "https://id-preview--deb97400-6ef9-479c-a47d-70385f8c2cdb.lovable.app",
  "https://lovable.dev",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000"
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.some(o => origin.startsWith(o.replace(/:\d+$/, '')) || origin === o)
    ? origin
    : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error("Error listing auth users:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all user_roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("*");

    if (rolesError) {
      console.error("Error fetching user_roles:", rolesError);
    }

    // Get all user_units with unit names
    const { data: userUnits, error: unitsError } = await supabaseAdmin
      .from("user_units")
      .select("*, units(id, name)");

    if (unitsError) {
      console.error("Error fetching user_units:", unitsError);
    }

    // Get all units for the dropdown
    const { data: allUnits, error: allUnitsError } = await supabaseAdmin
      .from("units")
      .select("id, name");

    if (allUnitsError) {
      console.error("Error fetching all units:", allUnitsError);
    }

    // Combine the data
    const usersWithEmail = profiles?.map((profile) => {
      const authUser = authUsers.users.find((u) => u.id === profile.id);
      const roles = userRoles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [];
      const units = userUnits?.filter((u) => u.user_id === profile.id).map((u) => ({
        id: u.unit_id,
        name: u.units?.name || "Unknown",
      })) || [];

      return {
        id: profile.id,
        nome: profile.nome,
        crm: profile.crm,
        email: authUser?.email || "N/A",
        approval_status: profile.approval_status,
        roles,
        units,
        created_at: profile.created_at,
      };
    }) || [];

    return new Response(
      JSON.stringify({ users: usersWithEmail, allUnits: allUnits || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-users-with-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
