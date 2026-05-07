const ImagePositioner = ({
  event,
  onChange,
}: {
  event: EventData;
  onChange: (field: string, value: number) => void;
}) => {
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

  // Reset to center
  const resetPosition = () => {
    setPx(50);
    setPy(50);
    setZoom(1);
    commit("outdoor_image_position_x", 50);
    commit("outdoor_image_position_y", 50);
    commit("outdoor_image_zoom", 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Arraste para reposicionar • Zoom com slider</p>
        <Button variant="ghost" size="sm" onClick={resetPosition}>
          Resetar
        </Button>
      </div>

      {/* Preview Area */}
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-border cursor-grab active:cursor-grabbing touch-none"
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

      {/* Controls */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <Label>Zoom</Label>
            <span className="font-mono text-primary">{zoom.toFixed(2)}x</span>
          </div>
          <Slider
            value={[zoom]}
            min={0.6}
            max={3}
            step={0.01}
            onValueChange={(v) => setZoom(v[0])}
            onValueCommit={(v) => commit("outdoor_image_zoom", v[0])}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Posição Horizontal (X)</Label>
            <Slider
              value={[px]}
              min={0}
              max={100}
              step={0.5}
              onValueChange={(v) => setPx(v[0])}
              onValueCommit={(v) => commit("outdoor_image_position_x", v[0])}
            />
            <div className="text-right text-[10px] text-muted-foreground mt-0.5">{px.toFixed(0)}%</div>
          </div>

          <div>
            <Label className="text-xs">Posição Vertical (Y)</Label>
            <Slider
              value={[py]}
              min={0}
              max={100}
              step={0.5}
              onValueChange={(v) => setPy(v[0])}
              onValueCommit={(v) => commit("outdoor_image_position_y", v[0])}
            />
            <div className="text-right text-[10px] text-muted-foreground mt-0.5">{py.toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutdoorSettings;
