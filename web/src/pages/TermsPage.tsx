import { CguDocument } from "@/components/legal/CguDocument";
import { CGU_FR } from "@/content/cgu-fr";

export function TermsPage() {
  return (
    <div className="font-jakarta min-h-screen bg-muted text-foreground py-5 sm:py-8 px-3 sm:px-4">
      <article className="max-w-3xl mx-auto bg-card text-card-foreground shadow-lg border-2 border-border rounded-2xl px-4 sm:px-10 py-7 sm:py-10">
        <CguDocument source={CGU_FR} />
      </article>
    </div>
  );
}
