import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Search, Heart, Calendar, Home, LayoutDashboard } from "lucide-react";
import { openHostApp } from "@/lib/hostApp";

export function RoleDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.role === "owner";

  const cards = [
    {
      id: "browse",
      title: t("dashboard.cards.browse"),
      description: t("dashboard.cards.browseDesc"),
      icon: Search,
      route: "/properties",
    },
    {
      id: "favorites",
      title: t("dashboard.cards.favorites"),
      description: t("dashboard.cards.favoritesDesc"),
      icon: Heart,
      route: "/favorites",
    },
    {
      id: "visits",
      title: t("dashboard.cards.visits"),
      description: t("dashboard.cards.visitsDesc"),
      icon: Calendar,
      route: "/visits",
    },
    {
      id: "host",
      title: isOwner ? t("dashboard.cards.openHost") : t("dashboard.cards.becomeHost"),
      description: isOwner ? t("dashboard.cards.openHostDesc") : t("dashboard.cards.becomeHostDesc"),
      icon: Home,
      route: "/become-host",
      external: isOwner,
    },
  ];

  return (
    <div className="font-jakarta min-h-screen bg-brand flex flex-col">
      <div className="px-4 sm:px-8 pt-8 pb-16 text-white">
        <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
          <LayoutDashboard className="h-4 w-4" />
          {t("dashboard.hub")}
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-wide">
          {t("dashboard.hello", { name: user?.full_name?.split(" ")[0] ?? t("common.user") })}
        </h1>
        <p className="text-white/80 mt-2 text-sm sm:text-base">{t("dashboard.subtitle")}</p>
      </div>

      <div className="flex-1 bg-card rounded-t-3xl px-4 sm:px-8 py-8 -mt-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cards.map((card) => (
            <DashboardCard
              key={card.id}
              title={card.title}
              description={card.description}
              icon={card.icon}
              onClick={() => (card.external ? openHostApp() : navigate(card.route))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
