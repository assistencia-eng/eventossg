import { useState, useRef } from "react";
import { EventData } from "@/types"; // Ajuste o caminho se necessário
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OutdoorSettingsProps {
  event: EventData;
  onChange: (field: string, value: any) => void;
}

export const OutdoorSettings = ({ event, onChange }: OutdoorSettingsProps) => {
  const [px, setPx] = useState(event.outdoor_image_position_x ?? 50);
  const [py, setPy] = useState(event.outdoor_image_position_y ?? 50);
  const [zoom, setZoom] = useState(event.outdoor_image_zoom ?? 1);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPx: number;
    startPy: number;
    w: number;
    h: number;
  } | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);

  const commit = (field: string, value: number) => {
    onChange(field, value);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!boxRef.current || !event.imagem) return;

    const rect = boxRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPx: px,
      startPy: py,
      w: rect.width,
      h: rect.height,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;

    const d = dragRef.current;
    const dx = ((e.clientX - d.startX) / d.w) * 100;
    const dy = ((e.clientY - d.startY) / d.h) * 100;

    const newPx = Math.max(0, Math.min(100, d.startPx - dx));
    const newPy = Math.max(0, Math.min(100, d.startPy - dy));

    setPx(newPx);
    setPy(newPy);
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    commit("outdoor_image_position_x", px);
    commit("outdoor_image_position_y", py);
    dragRef.current = null;
  };

  const resetPosition = () => {
    const defaults = { px: 50, py: 50, zoom: 1 };
    setPx(defaults.px);
    setPy(defaults.py);
    setZoom(defaults.zoom);
    commit("outdoor_image_position_x", defaults.px);
    commit("outdoor_image_position_y", defaults.py);
    commit("outdoor_image_zoom", defaults.zoom);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Posicionamento da Imagem no Outdoor</CardTitle>
        <p className="text-sm text-muted-foreground">
          Arraste a imagem para reposicionar • Use o slider para zoom
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview Interativo */}
        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border cursor-grab active:cursor-grabbing"
        >
          {event.imagem ? (
            <img
              src={event.imagem}
              alt="Preview Outdoor"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              style={{
                objectPosition: `${px}% ${py}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${px}% ${py}%`,
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Nenhuma imagem carregada
            </div>
          )}
        </div>

        <Button variant="outline" onClick={resetPosition} className="w-full">
          Resetar para Centro
        </Button>

        {/* Controles */}
        <div className
