import { createClient } from "npm:@supabase/supabase-js@2";

// Dynamic CORS headers - reflects origin or uses wildcard for server-to-server
function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

interface Evolution {
  content: string;
  created_at: string;
  author_name?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authentication check using getClaims (works with signing-keys)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ summary: null, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use getClaims for JWT validation
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ summary: null, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Verify user is approved
    const { data: isApproved } = await supabaseClient.rpc("is_approved", {
      _user_id: userId
    });

    if (!isApproved) {
      console.error("User not approved:", userId);
      return new Response(
        JSON.stringify({ summary: null, error: "User not approved" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { evolutions, patient_context } = await req.json();
    
    if (!evolutions || !Array.isArray(evolutions) || evolutions.length < 3) {
      return new Response(
        JSON.stringify({ summary: null, error: "Not enough evolutions to summarize" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ summary: null, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format evolutions for the prompt (excluding the 3 most recent, since we now show 3)
    const evolutionsToSummarize = evolutions.slice(3); // Skip first 3 (most recent)
    const formattedEvolutions = evolutionsToSummarize.map((e: Evolution, i: number) => {
      const date = new Date(e.created_at).toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `[${date}${e.author_name ? ` - ${e.author_name}` : ''}]: ${e.content}`;
    }).join('\n\n---\n\n');
    
    const evolutionCount = evolutionsToSummarize.length;

    // Dynamic line count based on evolution count
    const maxLines = evolutionCount <= 5 ? 3 : evolutionCount <= 10 ? 4 : 6;
    
    const systemPrompt = `Você é um médico intensivista experiente. Sua tarefa é resumir evoluções clínicas de pacientes de UTI de forma clara e concisa.

Regras:
- Resuma em NO MÁXIMO ${maxLines} linhas
- Para internações longas, capture a trajetória: admissão → intercorrências principais → estado atual
- Foque em: diagnóstico/problema principal, tendência clínica (melhora/piora/estável), e próximos passos se mencionados
- Use linguagem médica objetiva
- NÃO inclua datas ou nomes de autores
- NÃO use marcadores ou listas
- Escreva em texto corrido`;

    const userPrompt = `${patient_context ? `Contexto do paciente: ${patient_context}\n\n` : ''}Resuma as seguintes evoluções clínicas:

${formattedEvolutions}`;

    console.log(`Summarizing ${evolutionCount} evolutions (max ${maxLines} lines) for user ${userId}...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ summary: null, error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ summary: null, error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ summary: null, error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      console.error("No summary generated from AI response");
      return new Response(
        JSON.stringify({ summary: null, error: "Failed to generate summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Summary generated successfully");
    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in summarize-evolutions:", error);
    return new Response(
      JSON.stringify({ summary: null, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
