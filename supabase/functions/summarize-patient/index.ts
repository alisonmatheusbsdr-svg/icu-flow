import { createClient } from "npm:@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ summary: null, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const { data: isApproved } = await supabaseClient.rpc("is_approved", { _user_id: userId });
    if (!isApproved) {
      return new Response(
        JSON.stringify({ summary: null, error: "User not approved" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ summary: null, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context string from all patient data
    const p = body;
    const daysAdmitted = Math.ceil((Date.now() - new Date(p.admission_date).getTime()) / (1000 * 60 * 60 * 24));

    let context = `Paciente ${p.initials}, ${p.age} anos`;
    if (p.weight) context += `, ${p.weight}kg`;
    context += `, internado há ${daysAdmitted} dias.`;
    if (p.main_diagnosis) context += ` Diagnóstico principal: ${p.main_diagnosis}.`;
    if (p.comorbidities) context += ` Comorbidades: ${p.comorbidities}.`;
    if (p.specialty_team) context += ` Equipe: ${p.specialty_team}.`;
    if (p.is_palliative) context += ` Paciente em cuidados paliativos.`;
    if (p.diet_type) context += ` Dieta: ${p.diet_type}.`;

    if (p.respiratory) {
      const r = p.respiratory;
      context += ` Suporte respiratório: ${r.modality}`;
      if (r.ventilator_mode) context += ` (modo ${r.ventilator_mode})`;
      if (r.fio2) context += `, FiO2 ${r.fio2}%`;
      if (r.peep) context += `, PEEP ${r.peep}`;
      context += '.';
    }

    if (p.devices?.length) context += ` Dispositivos invasivos: ${p.devices.join(', ')}.`;
    if (p.venous_access?.length) context += ` Acessos venosos: ${p.venous_access.join(', ')}.`;
    if (p.vasoactive_drugs?.length) {
      const drugs = p.vasoactive_drugs.map((d: any) => `${d.drug_name} ${d.dose_ml_h}ml/h`).join(', ');
      context += ` Drogas vasoativas: ${drugs}.`;
    }
    if (p.antibiotics?.length) context += ` Antibióticos: ${p.antibiotics.join(', ')}.`;
    if (p.precautions?.length) context += ` Precauções: ${p.precautions.join(', ')}.`;
    if (p.prophylaxis?.length) context += ` Profilaxias: ${p.prophylaxis.join(', ')}.`;
    if (p.therapeutic_plan) context += ` Plano terapêutico: ${p.therapeutic_plan}.`;

    // Format evolutions
    let evolutionsText = '';
    if (p.evolutions?.length) {
      evolutionsText = p.evolutions.map((e: any) => {
        const date = new Date(e.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `[${date}${e.clinical_status ? ` - ${e.clinical_status}` : ''}]: ${e.content}`;
      }).join('\n\n');
    }

    const systemPrompt = `Você é um médico intensivista experiente. Sua tarefa é gerar um resumo clínico integrado do paciente, combinando TODOS os dados fornecidos (dados demográficos, diagnósticos, comorbidades, dispositivos, medicações, suporte respiratório, evoluções clínicas, plano terapêutico) em um texto coerente e completo.

Regras:
- Escreva em texto corrido, 8 a 15 linhas
- Integre TODAS as informações disponíveis de forma fluida
- Comece pela identificação e motivo da internação
- Inclua trajetória clínica baseada nas evoluções
- Mencione terapêutica atual (drogas, antibióticos, suporte ventilatório)
- Finalize com estado atual e perspectiva/plano
- Linguagem médica formal, português brasileiro
- NÃO use marcadores, listas ou subtítulos
- NÃO invente dados que não foram fornecidos`;

    const userPrompt = `${context}\n\n${evolutionsText ? `Evoluções clínicas:\n${evolutionsText}` : 'Sem evoluções registradas.'}`;

    console.log(`Generating clinical summary for patient ${p.initials} by user ${userId}`);

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
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ summary: null, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ summary: null, error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ summary: null, error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return new Response(
        JSON.stringify({ summary: null, error: "Falha ao gerar resumo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Clinical summary generated successfully");
    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in summarize-patient:", error);
    return new Response(
      JSON.stringify({ summary: null, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
