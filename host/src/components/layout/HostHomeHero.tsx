import { Building2, Home, LayoutTemplate, Hotel, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "apartment", icon: Building2 },
  { id: "villa", icon: Home },
  { id: "studio", icon: LayoutTemplate },
  { id: "hotel", icon: Hotel },
] as const;

interface HostHomeHeroProps {
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: string | null;
  onTypeFilterChange: (value: string | null) => void;
}

export function HostHomeHero({ query, onQueryChange, typeFilter, onTypeFilterChange }: HostHomeHeroProps) {
  const { t } = useTranslation();

  return (
    <section className="bg-[#111111] text-white px-4 pt-5 pb-6 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <p className="font-extrabold italic text-[22px] tracking-tight text-[#2DD4BF]">Maresi</p>
        <h1 className="mt-7 text-[28px] leading-tight font-bold sm:text-3xl">{t("owner.homeHero.title")}</h1>
        <label className="mt-5 flex items-center gap-3 rounded-full bg-white px-4 py-3.5 shadow-sm">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("owner.homeHero.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          />
        </label>
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {CATEGORIES.map(({ id, icon: Icon }) => {
            const selected = typeFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTypeFilterChange(selected ? null : id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl px-1 py-3 transition-colors",
                  selected ? "bg-[#2a2a2a] ring-1 ring-[#2DD4BF]" : "bg-[#1c1c1c]"
                )}
              >
                <Icon className="h-7 w-7 text-[#2DD4BF]" strokeWidth={1.6} />
                <span className="text-[11px] font-medium text-white text-center leading-tight">
                  {t(`owner.homeHero.types.${id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
