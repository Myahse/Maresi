import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function fileKind(type?: string, name?: string): "image" | "pdf" | "other" {
  const mime = (type || "").toLowerCase();
  const fileName = (name || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(fileName)) return "image";
  if (mime.includes("pdf") || fileName.endsWith(".pdf")) return "pdf";
  return "other";
}

export function FilePreviewer({
  src,
  name,
  type,
  removable,
  onRemove,
}: {
  src: string;
  name?: string;
  type?: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const kind = fileKind(type, name);
  const label = name || t("visits.chatAttach");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <div className="relative max-w-[220px]">
        {kind === "image" ? (
          <button
            type="button"
            className="block w-full overflow-hidden rounded-lg border-0 bg-transparent p-0"
            onClick={() => setOpen(true)}
            aria-label={t("visits.chatPreview")}
          >
            <img src={src} alt={label} className="max-h-52 w-full bg-black/5 object-contain" />
          </button>
        ) : kind === "pdf" ? (
          <button
            type="button"
            className="block w-full overflow-hidden rounded-lg border-0 bg-white p-0 text-left"
            onClick={() => setOpen(true)}
            aria-label={t("visits.chatPreview")}
          >
            <iframe
              src={`${src}#toolbar=0&navpanes=0`}
              title={label}
              className="pointer-events-none h-40 w-full bg-[#f8f9fa]"
            />
            <p className="truncate px-2 py-1.5 text-xs text-[#111b21]">{label}</p>
          </button>
        ) : (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            download={label}
            className="flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1.5 text-sm text-[#111b21]"
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </a>
        )}
        {removable && (
          <button
            type="button"
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#111b21] text-white shadow"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove?.();
            }}
            aria-label={t("visits.chatRemoveFile")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-label={t("visits.chatPreview")}
              onClick={() => setOpen(false)}
            >
              <button
                type="button"
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                onClick={() => setOpen(false)}
                aria-label={t("visits.chatPreviewClose")}
              >
                <X className="h-5 w-5" />
              </button>
              {kind === "image" ? (
                <img
                  src={src}
                  alt={label}
                  className="max-h-[92vh] max-w-[min(98vw,1400px)] rounded-lg object-contain shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                />
              ) : (
                <iframe
                  src={src}
                  title={label}
                  className="h-[90vh] w-[min(96vw,1100px)] rounded-lg bg-white"
                  onClick={(event) => event.stopPropagation()}
                />
              )}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function LocalFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) return null;
  return <FilePreviewer src={src} name={file.name} type={file.type} removable onRemove={onRemove} />;
}
