import { createClient } from "npm:@supabase/supabase-js@2";

// NOTE: This is a setup function that should NOT be deployed to production
// It intentionally has no authentication to allow initial admin setup
// After setup, consider removing this function from deployment

// Dynamic CORS headers - reflects origin or uses wildcard for server-to-server
function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require setup key for authentication
  const setupKey = req.headers.get('X-Setup-Key');
  const expectedKey = Deno.env.get('SETUP_SECRET_KEY');
  
  if (!expectedKey || setupKey !== expectedKey) {
    console.error('Unauthorized: Invalid or missing setup key');
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or missing setup key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('Starting admin seed process...')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')

    if (!adminEmail || !adminPassword) {
      console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing admin credentials in environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail)

    if (existingUser) {
      console.log('Admin user already exists, updating to ensure proper setup...')
      
      // Update profile to approved
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ approval_status: 'approved' })
        .eq('id', existingUser.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }

      // Check if admin role exists
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', existingUser.id)
        .eq('role', 'admin')
        .single()

      if (!existingRole) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: existingUser.id, role: 'admin' })

        if (roleError) {
          console.error('Error adding admin role:', roleError)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin user already existed, verified setup',
          userId: existingUser.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new admin user
    console.log('Creating new admin user...')
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { nome: 'Alison Matheus', crm: 'ADMIN' }
    })

    if (userError) {
      console.error('Error creating user:', userError)
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', user.user.id)

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update profile to approved
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', user.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    } else {
      console.log('Profile updated to approved')
    }

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: user.user.id, role: 'admin' })

    if (roleError) {
      console.error('Error adding admin role:', roleError)
    } else {
      console.log('Admin role added successfully')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        userId: user.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Unexpected error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
