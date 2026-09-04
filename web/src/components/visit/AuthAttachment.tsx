import { useEffect, useState } from "react";
import { FilePreviewer } from "@/components/visit/FilePreviewer";

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
  const [blobType, setBlobType] = useState("");

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
        setBlobType(blob.type || "");
      })
      .catch(() => {});
    return () => {
      ac.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src) return null;
  if (!blobUrl) {
    return <div className="h-28 w-40 animate-pulse rounded-lg bg-black/10" aria-hidden />;
  }
  return <FilePreviewer src={blobUrl} name={name} type={type || blobType} />;
}
