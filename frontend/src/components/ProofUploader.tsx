import { useCallback, useEffect, useRef, useState } from "react";
import SignaturePad from "./SignaturePad";

type Tab = "upload" | "signature";

interface Props {
  /** Called whenever a new file is ready to be submitted with the form */
  onChange: (file: File | null) => void;
  /** If provided, the component fetches & displays the existing proof on mount */
  existingProofUrl?: (() => Promise<Blob | null>) | null;
  onDelete?: () => void;
}

export default function ProofUploader({ onChange, existingProofUrl, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("image/png");
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existingProofUrl) return;
    setLoadingExisting(true);
    existingProofUrl()
      .then((blob) => {
        if (blob) {
          setExistingUrl(URL.createObjectURL(blob));
          setPreviewType(blob.type);
        }
      })
      .finally(() => setLoadingExisting(false));
  }, [existingProofUrl]);

  const setFile = useCallback(
    (file: File) => {
      setPreview(URL.createObjectURL(file));
      setPreviewType(file.type);
      onChange(file);
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFile(file);
  };

  const clearPreview = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  const displayUrl = preview ?? existingUrl;
  const displayType = previewType;

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(["upload", "signature"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              tab === t ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "upload" ? "Upload File" : "Draw Signature"}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-6 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-sm text-slate-500">
            Click or drag a file here
          </p>
          <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP, GIF, or PDF · max 15 MB</p>
        </div>
      )}

      {tab === "signature" && (
        <SignaturePad
          onSigned={(file) => setFile(file)}
          onClear={clearPreview}
        />
      )}

      {/* Preview */}
      {loadingExisting && (
        <p className="text-xs text-slate-400 animate-pulse">Loading existing proof…</p>
      )}

      {displayUrl && (
        <div className="relative border border-slate-200 rounded-lg overflow-hidden">
          {isImage(displayType) ? (
            <img
              src={displayUrl}
              alt="Proof preview"
              className="max-h-48 w-full object-contain bg-slate-50"
            />
          ) : (
            <div className="flex items-center gap-2 p-3 bg-slate-50">
              <svg className="w-6 h-6 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
              </svg>
              <span className="text-sm text-slate-600 truncate">PDF document</span>
            </div>
          )}

          <div className="absolute top-2 right-2 flex gap-1">
            {preview && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearPreview(); }}
                className="bg-white/90 hover:bg-white text-slate-600 hover:text-rose-600 rounded-full p-1 shadow text-xs"
                title="Remove new file"
              >
                ✕
              </button>
            )}
            {existingUrl && !preview && onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="bg-white/90 hover:bg-white text-slate-600 hover:text-rose-600 rounded-full p-1 shadow text-xs"
                title="Delete saved proof"
              >
                🗑
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
