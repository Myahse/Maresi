import { useEffect, useState } from "react";
import { Camera, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { compressImageFile } from "@/lib/compressImage";
import { cn } from "@/lib/utils";
import { AuthImage } from "@/components/media/AuthImage";

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
      onChange(await compressImageFile(raw, { maxEdge: 1280, quality: 0.82 }));
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <label
        htmlFor={id}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden min-h-[10rem]",
          file ? "border-brand bg-card" : "border-border bg-muted hover:border-brand",
          preparing && "pointer-events-none opacity-70"
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-40 object-cover" />
        ) : currentSrc ? (
          <AuthImage src={currentSrc} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-muted-foreground">
            {capture === "user" ? <Camera className="h-8 w-8" /> : <CreditCard className="h-8 w-8" />}
            <span className="text-sm text-center">{hint}</span>
            <span className="text-xs text-brand font-semibold">
              {preparing ? t("register.preparingPhoto") : t("register.choosePhoto")}
            </span>
          </div>
        )}
      </label>
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
      {file && (
        <p className="text-xs text-muted-foreground truncate">
          {preparing ? t("register.preparingPhoto") : file.name}
        </p>
      )}
    </div>
  );
}
