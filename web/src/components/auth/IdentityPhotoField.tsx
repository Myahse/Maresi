import { useEffect, useState } from "react";
import { Camera, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { compressImageFile } from "@/lib/compressImage";
import { cn } from "@/lib/utils";
import { AuthImage } from "@/components/media/AuthImage";
import { ImageLightbox } from "@/components/media/ImageLightbox";

interface IdentityPhotoFieldProps {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
  capture?: "user" | "environment";
  currentSrc?: string;
}

export function IdentityPhotoField({
  id,
  label,
  hint,
  file,
  onChange,
  capture,
  currentSrc,
}: IdentityPhotoFieldProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const hasPhoto = Boolean(preview || currentSrc);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = async (raw: File | null) => {
    if (!raw) {
      onChange(null);
      return;
    }
    setPreparing(true);
    try {
      onChange(await compressImageFile(raw, { maxEdge: 960, quality: 0.68 }));
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 overflow-hidden min-h-[10rem]",
          hasPhoto ? "border-brand bg-card" : "border-dashed border-border bg-muted"
        )}
      >
        {preview ? (
          <button
            type="button"
            className="block w-full cursor-zoom-in"
            onClick={() => setLightbox(true)}
            title={t("register.previewPhoto")}
          >
            <img src={preview} alt={label} className="w-full h-40 object-cover" />
          </button>
        ) : currentSrc ? (
          <AuthImage src={currentSrc} alt={label} className="w-full h-40 object-cover" />
        ) : (
          <label
            htmlFor={id}
            className={cn(
              "flex w-full flex-col items-center gap-2 px-4 py-8 text-muted-foreground cursor-pointer hover:border-brand",
              preparing && "pointer-events-none opacity-70"
            )}
          >
            {capture === "user" ? <Camera className="h-8 w-8" /> : <CreditCard className="h-8 w-8" />}
            <span className="text-sm text-center">{hint}</span>
            <span className="text-xs text-brand font-semibold">
              {preparing ? t("register.preparingPhoto") : t("register.choosePhoto")}
            </span>
          </label>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture={capture}
        className="sr-only"
        disabled={preparing}
        onChange={(e) => {
          void handlePick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {hasPhoto && (
        <label
          htmlFor={id}
          className={cn(
            "block text-xs font-semibold text-brand cursor-pointer",
            preparing && "pointer-events-none opacity-70"
          )}
        >
          {preparing ? t("register.preparingPhoto") : t("register.replacePhoto")}
        </label>
      )}
      {file && !preparing && <p className="text-xs text-muted-foreground truncate">{file.name}</p>}
      {preview && (
        <ImageLightbox src={preview} alt={label} open={lightbox} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
