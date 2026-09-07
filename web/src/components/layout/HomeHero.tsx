import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BedDouble, Building2, Home, Hotel, Search } from "lucide-react";
import { filtersToSearch, parseListingQuery } from "@/lib/listingSearch";

const CATEGORIES = [
  { id: "apartment", type: "apartment", icon: Building2 },
  { id: "house", type: "villa", icon: Home },
  { id: "studio", type: "studio", icon: BedDouble },
  { id: "hotel", type: "hotel", icon: Hotel },
] as const;

export function HomeHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const search = (event?: FormEvent) => {
    event?.preventDefault();
    navigate(filtersToSearch(parseListingQuery(query)));
  };

  return (
    <section className="px-4 pt-5 pb-6 sm:px-6 sm:pt-8 sm:pb-8 lg:pt-10 lg:pb-8">
      <div className="mx-auto max-w-xl lg:max-w-lg lg:text-center">
        <h1 className="text-[1.7rem] sm:text-3xl font-bold text-foreground leading-tight">
          {t("landing.heroTitle")}
        </h1>

        <form
          onSubmit={search}
          className="mt-5 flex items-center gap-2 rounded-full bg-white pl-4 pr-1.5 py-1.5 shadow-md ring-1 ring-black/5"
        >
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("landing.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none py-2"
            aria-label={t("common.search")}
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            {t("common.search")}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate(filtersToSearch({ location: "", minPrice: "", maxPrice: "", property_type: cat.type }))}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-muted px-1 py-3.5 text-center hover:bg-muted/80 transition-colors"
              >
                <Icon className="h-6 w-6 text-brand" strokeWidth={1.75} />
                <span className="text-[11px] font-medium text-foreground leading-tight">
                  {t(`landing.cats.${cat.id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
