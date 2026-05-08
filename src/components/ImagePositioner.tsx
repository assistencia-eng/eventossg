import { useState, useRef, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Crosshair, Trash2, ZoomIn, ZoomOut, Move } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  /** If provided, shows a "Remove image" button with confirmation */
  onRemove?: () => void;
  height?: number;
  /** Frame aspect (width/height). Defaults to 16/9. */
  aspect?: number;
  label?: string;
  helper?: string;
}

const DEFAULTS: Values = { x: 50, y: 50, zoom: 1 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const ImagePositioner = ({
  imageSrc,
  value,
  onChange,
  onCommit,
  onRemove,
  height,
  aspect = 16 / 9,
  label = "Ajustar imagem",
  helper = "Arraste para enquadrar. Use o slider, scroll ou pinça para zoom.",
}: ImagePositionerProps) => {
  const [px, setPx] = useState(value?.x ?? 50);
  const [py, setPy] = useState(value?.y ?? 50);
  const [zoom, setZoom] = useState(value?.zoom ?? 1);
  const [interacting, setInteracting] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{ startPx: number; startPy: number; w: number; h: number; startX: number; startY: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const skipNextChange = useRef(false);

  useEffect(() => {
    if (!value) return;
    if (skipNextChange.current) { skipNextChange.current = false; return; }
    setPx(value.x);
    setPy(value.y);
    setZoom(value.zoom);
  }, [value?.x, value?.y, value?.zoom]);

  const emit = useCallback((next: Values, commit = false) => {
    skipNextChange.current = true;
    onChange?.(next);
    if (commit) onCommit?.(next);
  }, [onChange, onCommit]);

  const getDist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!boxRef.current || !imageSrc) return;
    const r = boxRef.current.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture(e.pointerId);

    if (pointers.current.size === 1) {
      // Double-tap detection (touch)
      const now = Date.now();
      if (e.pointerType !== "mouse" && now - lastTapRef.current < 300) {
        // Double tap → toggle zoom
        const newZoom = zoom > 1.05 ? 1 : 2;
        const next = { x: 50, y: 50, zoom: newZoom };
        setPx(50); setPy(50); setZoom(newZoom);
        emit(next, true);
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      dragRef.current = {
        startPx: px,
        startPy: py,
        w: r.width,
        h: r.height,
        startX: e.clientX,
        startY: e.clientY,
      };
      setInteracting(true);
    } else if (pointers.current.size === 2) {
      // Begin pinch
      const pts = Array.from(pointers.current.values());
      pinchRef.current = { startDist: getDist(pts[0], pts[1]), startZoom: zoom };
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointers.current.values());
      const dist = getDist(pts[0], pts[1]);
      const factor = dist / pinchRef.current.startDist;
      const next = clamp(pinchRef.current.startZoom * factor, MIN_ZOOM, MAX_ZOOM);
      setZoom(next);
      emit({ x: px, y: py, zoom: next });
      return;
    }

    if (dragRef.current) {
      const d = dragRef.current;
      // Drag delta (px) → scale by zoom: at higher zoom, smaller % moves further
      const dx = ((e.clientX - d.startX) / d.w) * 100 / zoom;
      const dy = ((e.clientY - d.startY) / d.h) * 100 / zoom;
      const nx = clamp(d.startPx - dx, 0, 100);
      const ny = clamp(d.startPy - dy, 0, 100);
      setPx(nx);
      setPy(ny);
      emit({ x: nx, y: ny, zoom });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) {
      const wasDragging = !!dragRef.current;
      dragRef.current = null;
      setInteracting(false);
      if (wasDragging) emit({ x: px, y: py, zoom }, true);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const next = clamp(zoom * (1 + delta), MIN_ZOOM, MAX_ZOOM);
    setZoom(next);
    emit({ x: px, y: py, zoom: next }, true);
  };

  const reset = () => {
    setPx(DEFAULTS.x);
    setPy(DEFAULTS.y);
    setZoom(DEFAULTS.zoom);
    emit(DEFAULTS, true);
  };
  const center = () => {
    setPx(50); setPy(50);
    emit({ x: 50, y: 50, zoom }, true);
  };
  const bumpZoom = (delta: number) => {
    const next = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM);
    setZoom(next);
    emit({ x: px, y: py, zoom: next }, true);
  };

  const frameStyle: React.CSSProperties = height
    ? { height }
    : { aspectRatio: `${aspect}` };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Move className="w-3.5 h-3.5" />
          <span>{helper}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs gap-1" onClick={center} title="Centralizar">
            <Crosshair className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs gap-1" onClick={reset} title="Resetar">
            <RotateCcw className="w-3.5 h-3.5" /> Resetar
          </Button>
        </div>
      </div>

      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        style={frameStyle}
        className="relative w-full rounded-xl overflow-hidden bg-muted touch-none cursor-grab active:cursor-grabbing select-none border border-border shadow-inner"
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              objectPosition: `${px}% ${py}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${px}% ${py}%`,
              transition: interacting ? "none" : "transform 180ms ease-out, object-position 180ms ease-out",
              willChange: "transform",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Sem imagem
          </div>
        )}

        {/* Frame guide overlay */}
        {imageSrc && (
          <>
            <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-0 hover:opacity-100 transition-opacity">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
              {zoom.toFixed(2)}×
            </div>
          </>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => bumpZoom(-0.1)} title="Diminuir zoom">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Slider
          value={[zoom]}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          onValueChange={(v) => { setZoom(v[0]); emit({ x: px, y: py, zoom: v[0] }); }}
          onValueCommit={(v) => emit({ x: px, y: py, zoom: v[0] }, true)}
          className="flex-1"
        />
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => bumpZoom(0.1)} title="Aumentar zoom">
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Remove image action */}
      {onRemove && imageSrc && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-full h-9 text-destructive hover:text-destructive gap-2">
              <Trash2 className="w-4 h-4" /> Remover imagem
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover imagem personalizada?</AlertDialogTitle>
              <AlertDialogDescription>
                A imagem será removida do evento. O sistema voltará a usar automaticamente
                a imagem da palavra-chave, subcategoria ou categoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ImagePositioner;
