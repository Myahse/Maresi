import type { FC } from "react";

export const WaveLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#00B8D9"/>
    <path d="M8 16C8 11.58 11.58 8 16 8C20.42 8 24 11.58 24 16C24 20.42 20.42 24 16 24C11.58 24 8 20.42 8 16Z" fill="white"/>
    <path d="M10 16C10 12.69 12.69 10 16 10C19.31 10 22 12.69 22 16C22 19.31 19.31 22 16 22C12.69 22 10 19.31 10 16Z" fill="#00B8D9"/>
    <circle cx="16" cy="16" r="3" fill="white"/>
  </svg>
);

export const OrangeMoneyLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#FF6F00"/>
    <circle cx="16" cy="16" r="10" fill="white"/>
    <path d="M11 12L16 17L21 12" stroke="#FF6F00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MTNMoneyLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#FFCC00"/>
    <path d="M10 10L22 22M22 10L10 22" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="16" cy="16" r="6" fill="white"/>
    <path d="M16 11V21M11 16H21" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export const MoovMoneyLogo: FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#007BFF"/>
    <circle cx="16" cy="16" r="10" fill="white"/>
    <path d="M11 16L16 21L21 11" stroke="#007BFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function getPaymentMethodLogo(id: string) {
  switch (id) {
    case "wave": return WaveLogo;
    case "orange_money": return OrangeMoneyLogo;
    case "mtn_money": return MTNMoneyLogo;
    case "moov_money": return MoovMoneyLogo;
    default: return WaveLogo;
  }
}