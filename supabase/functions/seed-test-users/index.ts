import { createClient } from "npm:@supabase/supabase-js@2";

// NOTE: This is a testing function that should NOT be deployed to production
// It intentionally has no authentication to allow test user setup
// After testing, consider removing this function from deployment

// Dynamic CORS headers - reflects origin or uses wildcard for server-to-server
function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const testUsers = [
  { email: "diarista@teste.com", role: "diarista", nome: "Dr. Diarista Teste", crm: "CRM/TEST-001" },
  { email: "coordenador@teste.com", role: "coordenador", nome: "Dr. Coordenador Teste", crm: "CRM/TEST-002" },
  { email: "plantonista@teste.com", role: "plantonista", nome: "Dr. Plantonista Teste", crm: "CRM/TEST-003" },
];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require setup key for authentication
  const setupKey = req.headers.get('X-Setup-Key');
  const expectedKey = Deno.env.get('SETUP_SECRET_KEY');
  
  if (!expectedKey || setupKey !== expectedKey) {
    console.error('Unauthorized: Invalid or missing setup key');
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or missing setup key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: Array<{ email: string; status: string; role: string; error?: string }> = [];

    // First, get the UTI Geral unit (or the first available unit)
    const { data: units, error: unitsError } = await supabaseAdmin
      .from("units")
      .select("id, name")
      .limit(1);

    if (unitsError) {
      console.error("Error fetching units:", unitsError);
    }

    const unitId = units && units.length > 0 ? units[0].id : null;
    console.log("Using unit:", unitId ? units![0].name : "No unit available");

    for (const testUser of testUsers) {
      console.log(`Processing user: ${testUser.email}`);

      try {
        // Check if user already exists
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error(`Error listing users:`, listError);
          results.push({ email: testUser.email, status: "error", role: testUser.role, error: listError.message });
          continue;
        }

        const existingUser = existingUsers.users.find((u) => u.email === testUser.email);

        let userId: string;

        if (existingUser) {
          console.log(`User ${testUser.email} already exists`);
          userId = existingUser.id;
          results.push({ email: testUser.email, status: "already_exists", role: testUser.role });
        } else {
          // Create the user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: testUser.email,
            password: "teste123",
            email_confirm: true,
            user_metadata: {
              nome: testUser.nome,
              crm: testUser.crm,
            },
          });

          if (createError) {
            console.error(`Error creating user ${testUser.email}:`, createError);
            results.push({ email: testUser.email, status: "error", role: testUser.role, error: createError.message });
            continue;
          }

          userId = newUser.user.id;
          console.log(`Created user ${testUser.email} with id ${userId}`);
          results.push({ email: testUser.email, status: "created", role: testUser.role });
        }

        // Wait a bit for the trigger to create the profile
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Update profile to approved
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ 
            approval_status: "approved",
            nome: testUser.nome,
            crm: testUser.crm
          })
          .eq("id", userId);

        if (profileError) {
          console.error(`Error updating profile for ${testUser.email}:`, profileError);
        } else {
          console.log(`Profile approved for ${testUser.email}`);
        }

        // Check if role already exists
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", testUser.role)
          .maybeSingle();

        if (!existingRole) {
          // Insert role
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: userId, role: testUser.role });

          if (roleError) {
            console.error(`Error inserting role for ${testUser.email}:`, roleError);
          } else {
            console.log(`Role ${testUser.role} assigned to ${testUser.email}`);
          }
        } else {
          console.log(`Role ${testUser.role} already exists for ${testUser.email}`);
        }

        // Assign to unit if available
        if (unitId) {
          const { data: existingUnitAssign } = await supabaseAdmin
            .from("user_units")
            .select("id")
            .eq("user_id", userId)
            .eq("unit_id", unitId)
            .maybeSingle();

          if (!existingUnitAssign) {
            const { error: unitError } = await supabaseAdmin
              .from("user_units")
              .insert({ user_id: userId, unit_id: unitId });

            if (unitError) {
              console.error(`Error assigning unit for ${testUser.email}:`, unitError);
            } else {
              console.log(`Unit assigned to ${testUser.email}`);
            }
          } else {
            console.log(`Unit already assigned to ${testUser.email}`);
          }
        }
      } catch (userError) {
        console.error(`Unexpected error for ${testUser.email}:`, userError);
        results.push({ 
          email: testUser.email, 
          status: "error", 
          role: testUser.role, 
          error: userError instanceof Error ? userError.message : "Unknown error" 
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, users: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in seed-test-users:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
