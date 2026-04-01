"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Camera,
  Image as ImageIcon,
  FolderOpen,
  X,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

interface SmartUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  showAiAnalyze?: boolean;
  onAiAnalyze?: (file: File) => Promise<void>;
  category?: string;
  className?: string;
}

type InputMode = "camera" | "library" | "files";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export default function SmartUpload({
  onUpload,
  accept = "image/*,.pdf",
  multiple = true,
  maxSizeMB = 25,
  showAiAnalyze = true,
  onAiAnalyze,
  category,
  className,
}: SmartUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiAnalyze, setAiAnalyze] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): boolean => {
      if (file.size > maxSizeBytes) {
        toast.error(
          `"${file.name}" exceeds ${maxSizeMB}MB limit (${formatFileSize(file.size)})`
        );
        return false;
      }
      return true;
    },
    [maxSizeBytes, maxSizeMB]
  );

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const validFiles: File[] = [];
      const newPreviews = new Map(previews);

      Array.from(newFiles).forEach((file) => {
        if (!validateFile(file)) return;

        // Avoid duplicates by name+size+lastModified
        const isDuplicate = files.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
        if (isDuplicate) {
          toast.error(`"${file.name}" is already added`);
          return;
        }

        validFiles.push(file);

        // Generate preview for images
        if (isImageFile(file)) {
          const url = URL.createObjectURL(file);
          newPreviews.set(`${file.name}-${file.lastModified}`, url);
        }
      });

      if (validFiles.length > 0) {
        setPreviews(newPreviews);
        setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles));
      }
    },
    [files, previews, multiple, validateFile]
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => {
        const file = prev[index];
        const key = `${file.name}-${file.lastModified}`;
        setPreviews((p) => {
          const next = new Map(p);
          const url = next.get(key);
          if (url) URL.revokeObjectURL(url);
          next.delete(key);
          return next;
        });
        return prev.filter((_, i) => i !== index);
      });
    },
    []
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [addFiles]
  );

  const handleModeClick = useCallback((mode: InputMode) => {
    const refs: Record<InputMode, React.RefObject<HTMLInputElement | null>> = {
      camera: cameraInputRef,
      library: libraryInputRef,
      files: filesInputRef,
    };
    refs[mode].current?.click();
  }, []);

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're leaving the component entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await onUpload(files);

      // If AI analysis is enabled, process each file
      if (aiAnalyze && onAiAnalyze) {
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(i + 1);
          await onAiAnalyze(files[i]);
        }
      }

      // Clear files after successful upload
      previews.forEach((url) => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviews(new Map());
      toast.success(
        `${files.length} file${files.length > 1 ? "s" : ""} uploaded`
      );
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [files, onUpload, aiAnalyze, onAiAnalyze, previews]);

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-4 relative",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/90">
          <div className="text-center">
            <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-700">
              Drop files here
            </p>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      {/* Camera: capture="environment" opens camera directly, does NOT save to gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Take photo with camera"
      />
      {/* Photo Library: no capture attribute, opens standard picker */}
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Choose from photo library"
      />
      {/* File browser: documents only */}
      <input
        ref={filesInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Browse files"
      />

      {/* Input mode button group */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => handleModeClick("camera")}
          disabled={isUploading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
            "min-h-[44px] px-3 py-2.5 text-sm",
            "bg-black text-white hover:bg-gray-800 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Camera className="w-4 h-4" />
          <span>Take Photo</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeClick("library")}
          disabled={isUploading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
            "min-h-[44px] px-3 py-2.5 text-sm",
            "bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Photo Library</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeClick("files")}
          disabled={isUploading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
            "min-h-[44px] px-3 py-2.5 text-sm",
            "bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Browse Files</span>
        </button>
      </div>

      {/* File preview area */}
      {files.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file, index) => {
              const key = `${file.name}-${file.lastModified}`;
              const previewUrl = previews.get(key);

              return (
                <div
                  key={key}
                  className="relative group bg-gray-50 rounded-lg p-2 border border-gray-100"
                >
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                    className={cn(
                      "absolute -top-1.5 -right-1.5 z-10",
                      "w-6 h-6 flex items-center justify-center",
                      "bg-red-500 text-white rounded-full shadow-sm",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:bg-red-600 active:scale-95",
                      // Always visible on touch devices
                      "touch-action-manipulation [@media(hover:none)]:opacity-100"
                    )}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Thumbnail or icon */}
                  <div className="flex items-center justify-center w-full aspect-square rounded-md overflow-hidden bg-gray-100 mb-1.5">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-gray-400" />
                    )}
                  </div>

                  {/* File info */}
                  <p
                    className="text-xs font-medium text-gray-700 truncate"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state / drop hint */}
      {files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-gray-400 select-none">
          <Upload className="w-6 h-6 mb-1.5" />
          <p className="text-sm">
            Select files above or drag &amp; drop here
          </p>
        </div>
      )}

      {/* AI Analyze toggle */}
      {showAiAnalyze && (
        <div className="flex items-start gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aiAnalyze}
              onChange={(e) => setAiAnalyze(e.target.checked)}
              disabled={isUploading}
              className={cn(
                "w-5 h-5 rounded border-gray-300 text-black",
                "focus:ring-black focus:ring-offset-0",
                "cursor-pointer disabled:cursor-not-allowed"
              )}
            />
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">
              Analyze with AI
            </span>
          </label>
          {aiAnalyze && (
            <p className="text-xs text-gray-500 mt-0.5">
              AI will extract vendor, amount, and description
            </p>
          )}
        </div>
      )}

      {/* Upload button */}
      <Button
        variant="primary"
        className="w-full"
        disabled={files.length === 0 || isUploading}
        isLoading={isUploading}
        onClick={handleUpload}
      >
        {isUploading ? (
          `Uploading ${uploadProgress} of ${files.length}...`
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload {files.length > 0 ? `${files.length} File${files.length !== 1 ? "s" : ""}` : "Files"}
          </>
        )}
      </Button>
    </div>
  );
}
