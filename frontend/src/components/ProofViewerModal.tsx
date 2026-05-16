import { useEffect, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";

interface Props {
  blob: Blob;
  onClose: () => void;
}

export default function ProofViewerModal({ blob, onClose }: Props) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  const isPdf = blob.type === "application/pdf";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = isPdf ? "proof.pdf" : "proof";
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">Proof of Payment</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
          {!url ? (
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          ) : isPdf ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <FileText className="h-5 w-5 shrink-0 text-rose-400" />
                PDF document — use Download to save a copy
              </div>
              <iframe src={url} className="h-[60vh] w-full rounded-xl border border-slate-200 bg-white" title="Proof PDF" />
            </div>
          ) : (
            <img
              src={url}
              alt="Proof of payment"
              className="max-h-[70vh] rounded-xl object-contain shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
