import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { ImageLightbox } from "@/components/visit/ImageLightbox";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export function AuthAttachment({
  src,
  name,
  type,
}: {
  src?: string;
  name?: string;
  type?: string;
  mine?: boolean;
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [open, setOpen] = useState(false);
  const image = Boolean(type?.startsWith("image/"));
  const label = name || "Document";

  useEffect(() => {
    if (!src) return;
    const token = localStorage.getItem("token");
    const url = src.startsWith("http") ? src : `${API_BASE}${src.replace(/^\/api/, "")}`;
    let objectUrl = "";
    const ac = new AbortController();
    fetch(url, {
      signal: ac.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      ac.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src || !blobUrl) return null;

  if (image) {
    return (
      <>
        <button
          type="button"
          className="block w-full max-w-[220px] overflow-hidden rounded-lg border-0 bg-transparent p-0"
          onClick={() => setOpen(true)}
        >
          <img src={blobUrl} alt={label} className="max-h-52 w-full object-contain bg-black/5" />
        </button>
        <ImageLightbox src={blobUrl} alt={label} open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <a
      href={blobUrl}
      target="_blank"
      rel="noreferrer"
      download={label}
      className="flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1.5 text-sm text-[#111b21]"
    >
      <FileText className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}
