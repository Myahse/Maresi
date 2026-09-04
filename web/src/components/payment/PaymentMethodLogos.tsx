import type { FC } from "react";
import { cn } from "@/lib/utils";

function LogoTile({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-black",
        className
      )}
    >
      <img src={src} alt={alt} className="block h-full w-full object-cover" />
    </span>
  );
}

export const WaveLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <LogoTile src="/payment/wave.png" alt="Wave" className={className} />
);

export const OrangeMoneyLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <LogoTile src="/payment/orange-money.png?v=2" alt="Orange Money" className={className} />
);

export const MTNMoneyLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <LogoTile src="/payment/mtn-money.png" alt="MTN Money" className={className} />
);

export const MoovMoneyLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <LogoTile src="/payment/moov-money.png?v=2" alt="Moov Money" className={className} />
);

export function getPaymentMethodLogo(id: string) {
  switch (id) {
    case "wave":
      return WaveLogo;
    case "orange_money":
      return OrangeMoneyLogo;
    case "mtn_money":
      return MTNMoneyLogo;
    case "moov_money":
      return MoovMoneyLogo;
    default:
      return WaveLogo;
  }
}
