import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAppSetting = <T = any>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
      if (active) {
        if (data?.value !== undefined && data?.value !== null) setValue(data.value as T);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`app_settings_${key}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${key}` }, (payload) => {
        const newVal = (payload.new as any)?.value;
        if (newVal !== undefined) setValue(newVal as T);
      });
    channel.subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [key]);

  const update = async (newVal: T) => {
    setValue(newVal);
    await supabase.from("app_settings").upsert({ key, value: newVal as any });
  };

  return { value, setValue: update, loading };
};
