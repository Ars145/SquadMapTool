import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Upload, Pen, CheckCircle, Trash2, Download, Maximize2, Layers, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Point {
  x: number;
  y: number;
}

function createStripePattern(): HTMLCanvasElement {
  const size = 60;
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = size;
  patternCanvas.height = size;
  const pCtx = patternCanvas.getContext("2d")!;
  pCtx.clearRect(0, 0, size, size);
  pCtx.strokeStyle = "rgba(120,55,58,0.4)";
  pCtx.lineWidth = size * 0.42;
  pCtx.beginPath();
  pCtx.moveTo(-size, size);
  pCtx.lineTo(size, -size);
  pCtx.moveTo(-size, size * 2);
  pCtx.lineTo(size * 2, -size);
  pCtx.moveTo(0, size * 2);
  pCtx.lineTo(size * 2, 0);
  pCtx.stroke();
  return patternCanvas;
}

function drawBorder(
  ctx: CanvasRenderingContext2D,
  displayPoints: Point[],
  scaleFactor: number = 1
) {
  const tracePath = () => {
    ctx.beginPath();
    ctx.moveTo(displayPoints[0].x, displayPoints[0].y);
    for (let i = 1; i < displayPoints.length; i++) {
      ctx.lineTo(displayPoints[i].x, displayPoints[i].y);
    }
    ctx.closePath();
  };

  ctx.save();
  tracePath();
  ctx.shadowColor = "rgba(180,40,40,0.5)";
  ctx.shadowBlur = 25 * scaleFactor;
  ctx.strokeStyle = "rgba(180,40,40,0.01)";
  ctx.lineWidth = 1 * scaleFactor;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  tracePath();
  ctx.shadowColor = "rgba(160,35,35,0.35)";
  ctx.shadowBlur = 12 * scaleFactor;
  ctx.strokeStyle = "rgba(180,40,40,0.85)";
  ctx.lineWidth = 3 * scaleFactor;
  ctx.lineJoin = "miter";
  ctx.stroke();
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  points: Point[],
  closed: boolean,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  exportMode: boolean = false
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!exportMode) {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  if (image) {
    const dw = image.naturalWidth * zoom;
    const dh = image.naturalHeight * zoom;
    ctx.drawImage(image, panX, panY, dw, dh);
  }

  if (closed && points.length >= 3) {
    const patternCanvas = createStripePattern();
    const pattern = ctx.createPattern(patternCanvas, "repeat");

    const displayPoints = points.map((p) => ({
      x: p.x * zoom + panX,
      y: p.y * zoom + panY,
    }));

    const imgX = panX;
    const imgY = panY;
    const imgW = image ? image.naturalWidth * zoom : canvasWidth;
    const imgH = image ? image.naturalHeight * zoom : canvasHeight;

    const clipOutside = () => {
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.moveTo(displayPoints[0].x, displayPoints[0].y);
      for (let i = 1; i < displayPoints.length; i++) {
        ctx.lineTo(displayPoints[i].x, displayPoints[i].y);
      }
      ctx.closePath();
    };

    if (image) {
      ctx.save();
      clipOutside();
      ctx.clip("evenodd");
      ctx.filter = "grayscale(1)";
      ctx.drawImage(image, imgX, imgY, imgW, imgH);
      ctx.filter = "none";
      ctx.restore();
    }

    ctx.save();
    clipOutside();
    ctx.clip("evenodd");
    ctx.fillStyle = "rgba(10,8,10,0.5)";
    ctx.fillRect(imgX, imgY, imgW, imgH);
    ctx.restore();

    ctx.save();
    clipOutside();
    ctx.clip("evenodd");
    if (pattern) {
      pattern.setTransform(new DOMMatrix().translateSelf(panX, panY).scaleSelf(zoom, zoom));
      ctx.fillStyle = pattern;
      ctx.fillRect(imgX, imgY, imgW, imgH);
    }
    ctx.restore();

    if (exportMode) {
      const bloomScale = Math.max(1, canvasWidth / 1200);
      const bloomCanvas = document.createElement("canvas");
      bloomCanvas.width = canvasWidth;
      bloomCanvas.height = canvasHeight;
      const bCtx = bloomCanvas.getContext("2d")!;
      bCtx.strokeStyle = "rgba(200,45,45,1)";
      bCtx.lineWidth = 35 * bloomScale;
      bCtx.lineJoin = "miter";
      bCtx.beginPath();
      bCtx.moveTo(displayPoints[0].x, displayPoints[0].y);
      for (let i = 1; i < displayPoints.length; i++) {
        bCtx.lineTo(displayPoints[i].x, displayPoints[i].y);
      }
      bCtx.closePath();
      bCtx.stroke();

      ctx.save();
      clipOutside();
      ctx.clip("evenodd");
      ctx.filter = "blur(" + Math.round(20 * bloomScale) + "px)";
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(bloomCanvas, 0, 0);
      ctx.filter = "none";
      ctx.restore();
    }

    const borderScale = exportMode ? Math.max(1, canvasWidth / 1200) : 1;
    drawBorder(ctx, displayPoints, borderScale);
  }

  if (!closed && points.length > 0 && !exportMode) {
    const displayPoints = points.map((p) => ({
      x: p.x * zoom + panX,
      y: p.y * zoom + panY,
    }));

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(displayPoints[0].x, displayPoints[0].y);
    for (let i = 1; i < displayPoints.length; i++) {
      ctx.lineTo(displayPoints[i].x, displayPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (!exportMode && points.length > 0) {
    const displayPoints = points.map((p) => ({
      x: p.x * zoom + panX,
      y: p.y * zoom + panY,
    }));
    for (const dp of displayPoints) {
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = "#FF4500";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

export default function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageBRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const [points, setPoints] = useState<Point[]>([]);
  const [closed, setClosed] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [hasImageB, setHasImageB] = useState(false);
  const [activeImage, setActiveImage] = useState<1 | 2>(1);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [bloomPoints, setBloomPoints] = useState<string>("");
  const [bloomViewBox, setBloomViewBox] = useState("0 0 0 0");

  const activeImageRef = useRef<1 | 2>(1);
  useEffect(() => { activeImageRef.current = activeImage; }, [activeImage]);

  const viewZoomRef = useRef(1);
  const viewPanXRef = useRef(0);
  const viewPanYRef = useRef(0);

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartPanRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);
  const userManipulatedViewRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const closedRef = useRef(false);
  const drawingModeRef = useRef(false);
  const draggingIndexRef = useRef<number | null>(null);

  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { closedRef.current = closed; }, [closed]);
  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);
  useEffect(() => { draggingIndexRef.current = draggingIndex; }, [draggingIndex]);

  const renderImperative = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const displayImage =
      activeImageRef.current === 2 && imageBRef.current
        ? imageBRef.current
        : imageRef.current;
    drawScene(
      ctx,
      displayImage,
      pointsRef.current,
      closedRef.current,
      canvas.width,
      canvas.height,
      viewZoomRef.current,
      viewPanXRef.current,
      viewPanYRef.current
    );
    setZoomDisplay(Math.round(viewZoomRef.current * 100));
    if (closedRef.current && pointsRef.current.length >= 3) {
      const z = viewZoomRef.current;
      const px = viewPanXRef.current;
      const py = viewPanYRef.current;
      const pts = pointsRef.current.map(p => `${p.x * z + px},${p.y * z + py}`).join(" ");
      setBloomPoints(pts);
      setBloomViewBox(`0 0 ${canvas.width} ${canvas.height}`);
    } else {
      setBloomPoints("");
    }
  }, []);

  const renderRef = useRef(renderImperative);
  useEffect(() => { renderRef.current = renderImperative; }, [renderImperative]);

  const fitImageToView = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const zoom = Math.min(
      canvas.width / image.naturalWidth,
      canvas.height / image.naturalHeight
    );
    viewZoomRef.current = zoom;
    viewPanXRef.current = (canvas.width - image.naturalWidth * zoom) / 2;
    viewPanYRef.current = (canvas.height - image.naturalHeight * zoom) / 2;
    userManipulatedViewRef.current = false;
    renderRef.current();
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (imageRef.current && !userManipulatedViewRef.current) {
      fitImageToView();
    } else {
      renderRef.current();
    }
  }, [fitImageToView]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    renderRef.current();
  }, [points, closed, activeImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        spaceHeldRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!imageRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const oldZoom = viewZoomRef.current;
      const newZoom = Math.max(0.1, Math.min(10, oldZoom * zoomFactor));

      viewPanXRef.current = mouseX - (mouseX - viewPanXRef.current) * (newZoom / oldZoom);
      viewPanYRef.current = mouseY - (mouseY - viewPanYRef.current) * (newZoom / oldZoom);
      viewZoomRef.current = newZoom;
      userManipulatedViewRef.current = true;

      renderRef.current();
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  const loadImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          imageBRef.current = null;
          setHasImage(true);
          setHasImageB(false);
          setActiveImage(1);
          setPoints([]);
          setClosed(false);
          setDrawingMode(false);
          setTimeout(() => {
            fitImageToView();
          }, 0);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [fitImageToView]
  );

  const loadReferenceImage = useCallback(
    (file: File) => {
      const main = imageRef.current;
      if (!main) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (
            img.naturalWidth !== main.naturalWidth ||
            img.naturalHeight !== main.naturalHeight
          ) {
            toast({
              title: "Resolution mismatch",
              description: `Reference must be ${main.naturalWidth}×${main.naturalHeight}. Got ${img.naturalWidth}×${img.naturalHeight}.`,
              variant: "destructive",
            });
            return;
          }
          imageBRef.current = img;
          setHasImageB(true);
          setActiveImage(2);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [toast]
  );

  const canvasToImage = useCallback(
    (cx: number, cy: number): Point => {
      return {
        x: (cx - viewPanXRef.current) / viewZoomRef.current,
        y: (cy - viewPanYRef.current) / viewZoomRef.current,
      };
    },
    []
  );

  const imageToCanvas = useCallback(
    (p: Point): Point => {
      return {
        x: p.x * viewZoomRef.current + viewPanXRef.current,
        y: p.y * viewZoomRef.current + viewPanYRef.current,
      };
    },
    []
  );

  const findPointNear = useCallback(
    (cx: number, cy: number, threshold: number = 15): number => {
      for (let i = 0; i < pointsRef.current.length; i++) {
        const dp = imageToCanvas(pointsRef.current[i]);
        const dist = Math.sqrt((cx - dp.x) ** 2 + (cy - dp.y) ** 2);
        if (dist < threshold) return i;
      }
      return -1;
    },
    [imageToCanvas]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (e.button === 1 || (e.button === 0 && spaceHeldRef.current)) {
        e.preventDefault();
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panStartPanRef.current = { x: viewPanXRef.current, y: viewPanYRef.current };
        return;
      }

      if (!hasImage || e.button !== 0) return;

      if (closedRef.current) {
        const idx = findPointNear(cx, cy);
        if (idx >= 0) {
          setDraggingIndex(idx);
          return;
        }
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panStartPanRef.current = { x: viewPanXRef.current, y: viewPanYRef.current };
        return;
      }

      if (!drawingModeRef.current) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panStartPanRef.current = { x: viewPanXRef.current, y: viewPanYRef.current };
        return;
      }

      if (pointsRef.current.length >= 3) {
        const firstDP = imageToCanvas(pointsRef.current[0]);
        const dist = Math.sqrt(
          (cx - firstDP.x) ** 2 + (cy - firstDP.y) ** 2
        );
        if (dist < 15) {
          setClosed(true);
          setDrawingMode(false);
          return;
        }
      }

      const imgPt = canvasToImage(cx, cy);
      setPoints((prev) => [...prev, imgPt]);
    },
    [hasImage, findPointNear, imageToCanvas, canvasToImage]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        viewPanXRef.current = panStartPanRef.current.x + dx;
        viewPanYRef.current = panStartPanRef.current.y + dy;
        userManipulatedViewRef.current = true;
        renderRef.current();
        return;
      }

      if (!hasImage) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (draggingIndexRef.current !== null) {
        const imgPt = canvasToImage(cx, cy);
        setPoints((prev) => {
          const next = [...prev];
          next[draggingIndexRef.current!] = imgPt;
          return next;
        });
        return;
      }

      const idx = findPointNear(cx, cy);
      setHoveredPoint(idx >= 0 ? idx : null);
    },
    [hasImage, canvasToImage, findPointNear]
  );

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isPanningRef.current = false;
    setDraggingIndex(null);
  }, []);

  const handleExport = useCallback(() => {
    const image = imageRef.current;
    if (!image || !closedRef.current || pointsRef.current.length < 3) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.naturalWidth;
    exportCanvas.height = image.naturalHeight;
    const ctx = exportCanvas.getContext("2d")!;

    drawScene(
      ctx,
      image,
      pointsRef.current,
      true,
      image.naturalWidth,
      image.naturalHeight,
      1,
      0,
      0,
      true
    );

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "squad-map-boundary.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
        loadImage(file);
      }
    },
    [loadImage]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!isDragOver) setIsDragOver(true);
    },
    [isDragOver]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
      e.target.value = "";
    },
    [loadImage]
  );

  const handleReferenceFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadReferenceImage(file);
      e.target.value = "";
    },
    [loadReferenceImage]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const cursorStyle =
    isPanningRef.current
      ? "grabbing"
      : spaceHeldRef.current
        ? "grab"
        : draggingIndex !== null
          ? "grabbing"
          : hoveredPoint !== null
            ? "grab"
            : drawingMode && hasImage
              ? "crosshair"
              : hasImage && !drawingMode
                ? "grab"
                : "default";

  return (
    <div className="flex h-screen w-full select-none" data-testid="map-editor">
      <div
        className="flex flex-col items-center gap-3 py-3 px-2 border-r border-border"
        style={{ width: 60, backgroundColor: "#252540" }}
        data-testid="toolbar"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-upload"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-300"
            >
              <Upload />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Upload Map Image</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-upload-reference"
              onClick={() => refFileInputRef.current?.click()}
              disabled={!hasImage}
              className={hasImageB ? "text-[#FF4500]" : "text-gray-300"}
            >
              <Layers />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Upload Reference (same size, not exported)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-switch-view"
              onClick={() =>
                setActiveImage((prev) => (prev === 1 ? 2 : 1))
              }
              disabled={!hasImageB}
              className={activeImage === 2 ? "text-[#FF4500]" : "text-gray-300"}
            >
              <ArrowLeftRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Switch View (currently: {activeImage === 1 ? "Main" : "Reference"})
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-draw"
              onClick={() => {
                if (hasImage && !closed) setDrawingMode((prev) => !prev);
              }}
              disabled={!hasImage || closed}
              className={
                drawingMode
                  ? "text-[#FF4500] toggle-elevate toggle-elevated"
                  : "text-gray-300"
              }
            >
              <Pen />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Polygon Draw Tool</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-close-polygon"
              onClick={() => {
                if (points.length >= 3 && !closed) {
                  setClosed(true);
                  setDrawingMode(false);
                }
              }}
              disabled={points.length < 3 || closed}
              className="text-gray-300"
            >
              <CheckCircle />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Close Polygon</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-clear"
              onClick={() => {
                setPoints([]);
                setClosed(false);
                setDrawingMode(false);
              }}
              disabled={points.length === 0}
              className="text-gray-300"
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear All</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-fit"
              onClick={fitImageToView}
              disabled={!hasImage}
              className="text-gray-300"
            >
              <Maximize2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Fit to View</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-export"
              onClick={handleExport}
              disabled={!closed || points.length < 3}
              className="text-gray-300"
            >
              <Download />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Export PNG</TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ backgroundColor: "#1a1a2e" }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="canvas-container"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-file"
        />
        <input
          ref={refFileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleReferenceFileChange}
          data-testid="input-file-reference"
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ cursor: cursorStyle }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={handleContextMenu}
          data-testid="canvas-main"
        />

        {bloomPoints && bloomViewBox && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={bloomViewBox}
            preserveAspectRatio="none"
            style={{
              pointerEvents: "none",
              overflow: "visible",
              mixBlendMode: "screen",
            }}
            data-testid="svg-bloom"
          >
            <defs>
              <filter id="bloom-blur" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
              </filter>
              <clipPath id="bloom-clip">
                <rect x="-9999" y="-9999" width="99999" height="99999" />
                <polygon points={bloomPoints} />
              </clipPath>
            </defs>
            <g clipPath="url(#bloom-clip)" clipRule="evenodd">
              <polygon
                points={bloomPoints}
                fill="none"
                stroke="rgba(200,45,45,1)"
                strokeWidth="70"
                strokeLinejoin="miter"
                filter="url(#bloom-blur)"
              />
            </g>
          </svg>
        )}

        {hasImage && (
          <div
            className="absolute bottom-3 right-3 flex gap-2 pointer-events-none"
            data-testid="hud"
          >
            {hasImageB && (
              <div
                className="px-2 py-1 rounded-md text-xs"
                style={{
                  backgroundColor: "rgba(0,0,0,0.5)",
                  color: activeImage === 2 ? "#FF4500" : "#9ca3af",
                }}
                data-testid="text-active-view"
              >
                {activeImage === 1 ? "Main" : "Reference"}
              </div>
            )}
            <div
              className="px-2 py-1 rounded-md text-xs text-gray-400"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              data-testid="text-zoom-level"
            >
              {zoomDisplay}%
            </div>
          </div>
        )}

        {!hasImage && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${isDragOver ? "ring-2 ring-inset ring-[#FF4500]" : ""}`}
            data-testid="text-placeholder"
          >
            <Upload className="w-12 h-12 text-gray-500 mb-3" />
            <p className="text-gray-400 text-sm">
              Drop map image here or click upload
            </p>
          </div>
        )}

        {isDragOver && hasImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <p className="text-white text-lg">Drop to replace image</p>
          </div>
        )}
      </div>
    </div>
  );
}
