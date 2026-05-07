import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Values {
  x: number;
  y: number;
  zoom: number;
}

interface ImagePositionerProps {
  imageSrc: string | null | undefined;
  value?: Values;
  onChange?: (v: Values) => void;
  /** Called only when user releases drag/slider (good for DB commits) */
  onCommit?: (v: Values) => void;
  height?: number;
}

const DEFAULTS: Values = { x: 50, y: 50, zoom: 1 };

const ImagePositioner = ({ imageSrc, value, onChange, onCommit, height = 160 }: ImagePositionerProps) => {
  const [px, setPx] = useState(value?.x ?? 50);
  const [py, setPy] = useState(value?.y ?? 50);
  const [zoom, setZoom] = useState(value?.zoom ?? 1);
  const dragRef = useRef<{ startX: number; startY: number; startPx: number; startPy: number; w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setPx(value.x);
      setPy(value.y);
      setZoom(value.zoom);
    }
  }, [value?.x, value?.y, value?.zoom]);

  const emit = (next: Values, commit = false) => {
    onChange?.(next);
    if (commit) onCommit?.(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!boxRef.current || !imageSrc) return;
    const r = boxRef.current.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPx: px, startPy: py, w: r.width, h: r.height };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const dx = ((e.clientX - d.startX) / d.w) * 100;
    const dy = ((e.clientY - d.startY) / d.h) * 100;
    const nx = Math.max(0, Math.min(100, d.startPx - dx));
    const ny = Math.max(0, Math.min(100, d.startPy - dy));
    setPx(nx);
    setPy(ny);
    emit({ x: nx, y: ny, zoom });
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    emit({ x: px, y: py, zoom }, true);
  };

  const reset = () => {
    setPx(DEFAULTS.x);
    setPy(DEFAULTS.y);
    setZoom(DEFAULTS.zoom);
    emit(DEFAULTS, true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Arraste para mover. Zoom abaixo.</p>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={reset}>
          <RotateCcw className="w-3 h-3" /> Resetar
        </Button>
      </div>
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ height }}
        className="relative w-full rounded-md overflow-hidden bg-muted touch-none cursor-grab active:cursor-grabbing select-none"
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `${px}% ${py}%`, transform: `scale(${zoom})`, transformOrigin: `${px}% ${py}%` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>
      <Label className="text-xs font-medium">Zoom: {zoom.toFixed(2)}x</Label>
      <Slider
        value={[zoom]}
        min={1}
        max={3}
        step={0.05}
        onValueChange={(v) => { setZoom(v[0]); emit({ x: px, y: py, zoom: v[0] }); }}
        onValueCommit={(v) => emit({ x: px, y: py, zoom: v[0] }, true)}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X: {px.toFixed(0)}%</Label>
          <Slider
            value={[px]} min={0} max={100} step={1}
            onValueChange={(v) => { setPx(v[0]); emit({ x: v[0], y: py, zoom }); }}
            onValueCommit={(v) => emit({ x: v[0], y: py, zoom }, true)}
          />
        </div>
        <div>
          <Label className="text-xs">Y: {py.toFixed(0)}%</Label>
          <Slider
            value={[py]} min={0} max={100} step={1}
            onValueChange={(v) => { setPy(v[0]); emit({ x: px, y: v[0], zoom }); }}
            onValueCommit={(v) => emit({ x: px, y: v[0], zoom }, true)}
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePositioner;
