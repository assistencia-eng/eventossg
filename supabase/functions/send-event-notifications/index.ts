import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID")!;
const oneSignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EventRow {
  id: string;
  nome: string;
  data: string;
  cidade: string;
  subcategorias: string[];
  local: string;
}

interface ProfileRow {
  user_id: string;
  cidade: string | null;
  interests: string[];
  favorite_event_ids: string[];
  receber_notificacoes: boolean;
  email: string | null;
}

function daysDiff(eventDate: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const evDate = new Date(eventDate + "T00:00:00");
  return Math.round((evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getNotificationContent(eventName: string, days: number): { heading: string; content: string } | null {
  if (days === 7) {
    return {
      heading: "📅 Evento em 1 semana!",
      content: `"${eventName}" acontece daqui a 7 dias. Prepare-se!`,
    };
  }
  if (days === 1) {
    return {
      heading: "⏰ Evento amanhã!",
      content: `"${eventName}" é amanhã! Não perca!`,
    };
  }
  if (days === 0) {
    return {
      heading: "🎉 Evento HOJE!",
      content: `"${eventName}" é HOJE! Aproveite!`,
    };
  }
  return null;
}

async function sendPushNotification(userIds: string[], heading: string, content: string) {
  if (userIds.length === 0) return;

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${oneSignalApiKey}`,
    },
    body: JSON.stringify({
      app_id: oneSignalAppId,
      include_external_user_ids: userIds,
      headings: { en: heading },
      contents: { en: content },
    }),
  });

  const result = await response.json();
  console.log("OneSignal response:", JSON.stringify(result));
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Fetch future events (today + 7 days ahead)
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekAheadStr = weekAhead.toISOString().split("T")[0];

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, nome, data, cidade, subcategorias, local")
      .gte("data", todayStr)
      .lte("data", weekAheadStr);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No events in range" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all profiles with notifications enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, cidade, interests, favorite_event_ids, receber_notificacoes, email")
      .eq("receber_notificacoes", true);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles with notifications enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsSent = 0;

    for (const event of events as EventRow[]) {
      const days = daysDiff(event.data);
      const notif = getNotificationContent(event.nome, days);
      if (!notif) continue;

      const targetUserIds: string[] = [];

      for (const profile of profiles as ProfileRow[]) {
        // Check favorite match
        const isFavorite = profile.favorite_event_ids?.includes(event.id);
        
        // Check interest match (subcategory + same city)
        const hasSubcategoryMatch = event.subcategorias?.some(
          (sub) => profile.interests?.includes(sub)
        );
        const sameCidade = profile.cidade && event.cidade && 
          profile.cidade.toLowerCase() === event.cidade.toLowerCase();

        if (isFavorite || (hasSubcategoryMatch && sameCidade)) {
          targetUserIds.push(profile.user_id);
        }
      }

      if (targetUserIds.length > 0) {
        await sendPushNotification(targetUserIds, notif.heading, notif.content);
        notificationsSent++;
        console.log(`Sent notification for "${event.nome}" to ${targetUserIds.length} users (${days} days)`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notificationsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
