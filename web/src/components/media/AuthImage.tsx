import { useEffect, useState } from "react";

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
  return <img src={blobUrl} alt={alt} className={className} />;
}
