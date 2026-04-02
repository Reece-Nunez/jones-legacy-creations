"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Camera, X, Check, ZoomIn, ZoomOut } from "lucide-react";
import toast from "react-hot-toast";

interface AvatarUploadProps {
  currentUrl: string | null;
  initials: string;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ currentUrl, initials, onUploaded }: AvatarUploadProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const CROP_SIZE = 256;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use JPEG, PNG, or WebP images");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setPreviewSrc(src);
      setScale(1);
      setOffset({ x: 0, y: 0 });

      // Pre-load image to get dimensions
      const img = new Image();
      img.onload = () => { imgRef.current = img; };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [dragging, dragStart]
  );

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    },
    [dragging, dragStart]
  );

  const handleTouchEnd = () => setDragging(false);

  const cropAndUpload = async () => {
    if (!imgRef.current || !previewSrc) return;

    setUploading(true);
    try {
      const img = imgRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Calculate how the image is displayed in the 192px preview area
      const previewSize = 192;
      const imgAspect = img.naturalWidth / img.naturalHeight;

      let drawW: number, drawH: number;
      // Cover the preview area
      if (imgAspect > 1) {
        drawH = previewSize * scale;
        drawW = drawH * imgAspect;
      } else {
        drawW = previewSize * scale;
        drawH = drawW / imgAspect;
      }

      // Scale from preview coords to canvas coords
      const canvasScale = CROP_SIZE / previewSize;
      const sx = ((drawW - previewSize) / 2 - offset.x) * canvasScale;
      const sy = ((drawH - previewSize) / 2 - offset.y) * canvasScale;
      const sSize = previewSize * canvasScale;

      // Draw circle clip
      ctx.beginPath();
      ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw image scaled to canvas
      const totalW = drawW * canvasScale;
      const totalH = drawH * canvasScale;
      const imgX = (totalW - CROP_SIZE) / 2 - offset.x * canvasScale;
      const imgY = (totalH - CROP_SIZE) / 2 - offset.y * canvasScale;

      ctx.drawImage(img, -imgX, -imgY, totalW, totalH);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.9
        );
      });

      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const res = await fetch("/api/admin/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Upload failed");
      }

      const data = await res.json();
      onUploaded(data.avatar_url);
      setPreviewSrc(null);
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const cancel = () => {
    setPreviewSrc(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Crop editor
  if (previewSrc) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-gray-500">Drag to reposition, zoom to fit</p>

        {/* Crop preview */}
        <div
          className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-gray-200 cursor-move select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={previewSrc}
            alt="Crop preview"
            draggable={false}
            className="absolute pointer-events-none"
            style={{
              width: "auto",
              height: "auto",
              minWidth: "100%",
              minHeight: "100%",
              objectFit: "cover",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
              left: "50%",
              top: "50%",
            }}
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-32 accent-black"
          />
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, s + 0.1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cancel}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={cropAndUpload} isLoading={uploading}>
            <Check className="w-4 h-4 mr-1" />
            Save Avatar
          </Button>
        </div>
      </div>
    );
  }

  // Default view
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xl">
            {initials}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline transition-colors"
      >
        Change photo
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
