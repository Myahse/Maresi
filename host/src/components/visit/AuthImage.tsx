import { useEffect, useState } from "react";
import { ImageLightbox } from "@/components/visit/ImageLightbox";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export function AuthImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [open, setOpen] = useState(false);

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
  return (
    <>
      <button
        type="button"
        className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
        onClick={() => setOpen(true)}
        title={alt}
      >
        <img src={blobUrl} alt={alt} className={className} />
      </button>
      <ImageLightbox src={blobUrl} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
