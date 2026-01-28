import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dynamic CORS headers - reflects origin or uses wildcard for server-to-server
function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the requesting user is an admin or coordinator
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

    // Use getClaims for JWT validation (works with signing-keys)
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = claimsData.claims.sub as string;

    // Check if user is admin or coordinator
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    const { data: isCoordenador } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "coordenador",
    });

    // Check authorization - must be admin OR coordinator
    if (!isAdmin && !isCoordenador) {
      console.log(`User ${userId} denied access - not admin or coordenador`);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin or Coordinator only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which roles the requester can see
    // Coordinators can only see plantonistas and diaristas
    // Admins can see everyone
    const allowedRoles = isCoordenador && !isAdmin 
      ? ['plantonista', 'diarista'] 
      : null; // null = no filter (admin sees all)

    console.log(`User ${userId} accessing users. isAdmin: ${isAdmin}, isCoordenador: ${isCoordenador}, allowedRoles: ${allowedRoles}`);

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

    // Get all units for the dropdown (only for admins)
    let allUnits: { id: string; name: string }[] = [];
    if (isAdmin) {
      const { data: unitsData, error: allUnitsError } = await supabaseAdmin
        .from("units")
        .select("id, name");

      if (allUnitsError) {
        console.error("Error fetching all units:", allUnitsError);
      } else {
        allUnits = unitsData || [];
      }
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

    // Filter users based on requester's role
    let filteredUsers = usersWithEmail;
    if (allowedRoles) {
      filteredUsers = usersWithEmail.filter(u => 
        // Include users with allowed roles
        u.roles.some(r => allowedRoles.includes(r)) || 
        // OR users without any role yet (pending registration)
        u.roles.length === 0
      );
      console.log(`Coordinator filter applied. Total: ${usersWithEmail.length}, Filtered: ${filteredUsers.length}`);
    }

    return new Response(
      JSON.stringify({ users: filteredUsers, allUnits }),
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
