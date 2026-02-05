import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("delete-user: Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's token for auth validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get requester info
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("delete-user: JWT validation failed", claimsError);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requesterId = claimsData.claims.sub as string;
    console.log(`delete-user: Request from user ${requesterId}`);

    // Parse request body
    const { targetUserId } = await req.json();
    
    if (!targetUserId) {
      console.error("delete-user: Missing targetUserId");
      return new Response(
        JSON.stringify({ error: "ID do usuário alvo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (requesterId === targetUserId) {
      console.error("delete-user: User attempted self-deletion");
      return new Response(
        JSON.stringify({ error: "Você não pode excluir a si mesmo" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get requester's roles
    const { data: requesterRoles, error: requesterRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId);

    if (requesterRolesError) {
      console.error("delete-user: Error fetching requester roles", requesterRolesError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requesterRoleList = requesterRoles?.map((r) => r.role) || [];
    const isAdmin = requesterRoleList.includes("admin");
    const isCoordinator = requesterRoleList.includes("coordenador");

    console.log(`delete-user: Requester roles: ${requesterRoleList.join(", ")}`);

    // Only admins and coordinators can delete users
    if (!isAdmin && !isCoordinator) {
      console.error("delete-user: User lacks permission to delete");
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para excluir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user's roles
    const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId);

    if (targetRolesError) {
      console.error("delete-user: Error fetching target roles", targetRolesError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar usuário alvo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetRoleList = targetRoles?.map((r) => r.role) || [];
    console.log(`delete-user: Target user ${targetUserId} roles: ${targetRoleList.join(", ") || "none"}`);

    // Coordinators can only delete plantonistas and diaristas
    if (isCoordinator && !isAdmin) {
      const allowedRolesToDelete = ["plantonista", "diarista"];
      const hasProtectedRole = targetRoleList.some(
        (role) => !allowedRolesToDelete.includes(role)
      );
      
      // If target has any role not in allowed list, or has no roles but isn't just a basic user
      if (hasProtectedRole) {
        console.error("delete-user: Coordinator attempted to delete protected user");
        return new Response(
          JSON.stringify({ 
            error: "Coordenadores só podem excluir plantonistas e diaristas" 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Begin cascaded deletion
    console.log(`delete-user: Starting cascaded deletion for user ${targetUserId}`);

    // 1. Delete user_roles
    const { error: rolesDeleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);
    
    if (rolesDeleteError) {
      console.error("delete-user: Error deleting user_roles", rolesDeleteError);
    } else {
      console.log("delete-user: Deleted user_roles");
    }

    // 2. Delete user_units
    const { error: unitsDeleteError } = await supabaseAdmin
      .from("user_units")
      .delete()
      .eq("user_id", targetUserId);
    
    if (unitsDeleteError) {
      console.error("delete-user: Error deleting user_units", unitsDeleteError);
    } else {
      console.log("delete-user: Deleted user_units");
    }

    // 3. Delete active_sessions
    const { error: sessionsDeleteError } = await supabaseAdmin
      .from("active_sessions")
      .delete()
      .eq("user_id", targetUserId);
    
    if (sessionsDeleteError) {
      console.error("delete-user: Error deleting active_sessions", sessionsDeleteError);
    } else {
      console.log("delete-user: Deleted active_sessions");
    }

    // 4. Update print_logs to SET NULL on user_id (preserve logs)
    const { error: logsUpdateError } = await supabaseAdmin
      .from("print_logs")
      .update({ user_id: null })
      .eq("user_id", targetUserId);
    
    if (logsUpdateError) {
      console.error("delete-user: Error updating print_logs", logsUpdateError);
    } else {
      console.log("delete-user: Updated print_logs (set user_id to null)");
    }

    // 5. Delete profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", targetUserId);
    
    if (profileDeleteError) {
      console.error("delete-user: Error deleting profile", profileDeleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir perfil do usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("delete-user: Deleted profile");

    // 6. Delete from auth.users using Admin API
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUserId
    );

    if (authDeleteError) {
      console.error("delete-user: Error deleting from auth.users", authDeleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir usuário da autenticação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("delete-user: Deleted from auth.users");

    console.log(`delete-user: Successfully deleted user ${targetUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário excluído com sucesso" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("delete-user: Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
