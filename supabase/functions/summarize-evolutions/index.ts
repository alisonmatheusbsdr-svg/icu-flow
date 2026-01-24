import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Evolution {
  content: string;
  created_at: string;
  author_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Format evolutions for the prompt (excluding the 2 most recent)
    const evolutionsToSummarize = evolutions.slice(2); // Skip first 2 (most recent)
    const formattedEvolutions = evolutionsToSummarize.map((e: Evolution, i: number) => {
      const date = new Date(e.created_at).toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `[${date}${e.author_name ? ` - ${e.author_name}` : ''}]: ${e.content}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `Você é um médico intensivista experiente. Sua tarefa é resumir evoluções clínicas de pacientes de UTI de forma clara e concisa.

Regras:
- Resuma em NO MÁXIMO 3 linhas
- Foque em: diagnóstico/problema principal, tendência clínica (melhora/piora/estável), e próximos passos se mencionados
- Use linguagem médica objetiva
- NÃO inclua datas ou nomes de autores
- NÃO use marcadores ou listas
- Escreva em texto corrido`;

    const userPrompt = `${patient_context ? `Contexto do paciente: ${patient_context}\n\n` : ''}Resuma as seguintes evoluções clínicas:

${formattedEvolutions}`;

    console.log(`Summarizing ${evolutionsToSummarize.length} evolutions...`);

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
        max_tokens: 200,
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
