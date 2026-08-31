import { useTranslation } from "react-i18next";
import { Maximize2 } from "lucide-react";

interface VirtualTourViewerProps {
  url: string;
  title?: string;
}

export function VirtualTourViewer({ url, title }: VirtualTourViewerProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("virtualTour.title")}</h2>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand flex items-center gap-1 hover:underline"
        >
          <Maximize2 className="h-4 w-4" />
          {t("virtualTour.open")}
        </a>
      </div>
      <div className="relative rounded-2xl overflow-hidden border-2 border-border aspect-video bg-muted">
        <iframe
          src={url}
          title={title ?? t("virtualTour.title")}
          className="absolute inset-0 w-full h-full border-0"
          allow="fullscreen; xr-spatial-tracking"
          allowFullScreen
        />
      </div>
    </section>
  );
}
