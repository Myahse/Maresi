import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getProperty, createProperty, updateProperty } from "@/services/api";
import { PropertyCreationWizard } from "@/components/property/PropertyCreationWizard";
import type { Property } from "@/types";

export function PropertyEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isNew = pathname.endsWith("/owner/new");
  const [initial, setInitial] = useState<Partial<Property> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isNew) {
      setInitial({});
      return;
    }
    if (!id) return;
    getProperty(id)
      .then((p) => setInitial(p))
      .catch(() => setInitial(null));
  }, [id, isNew]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      if (isNew) await createProperty(formData);
      else await updateProperty(id!, formData);
      navigate("/owner", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (isNew && /abonnement|402/i.test(msg)) {
        navigate("/owner/subscription", { replace: true });
        return;
      }
      throw e;
    } finally {
      setLoading(false);
    }
  };

  if (!isNew && initial === null) {
    return <div className="container mx-auto px-4 py-8">{t("propertyEdit.notFound")}</div>;
  }
  if (!isNew && !initial) {
    return <div className="container mx-auto px-4 py-8">{t("common.loading")}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 font-jakarta max-w-6xl">
      <Link to="/owner" className="text-sm text-brand hover:underline">
        ← {t("owner.title")}
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">
        {isNew ? t("propertyEdit.add") : t("propertyEdit.edit")}
      </h1>
      <p className="text-muted-foreground text-sm mb-8">{t("wizard.property.pageHint")}</p>
      <PropertyCreationWizard
        initial={initial ?? undefined}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/owner")}
        loading={loading}
      />
    </div>
  );
}
