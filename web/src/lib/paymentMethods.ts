export interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  operatorFeePercent: number;
  fixedFee?: number;
  description?: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "wave",
    name: "Wave",
    logo: "wave",
    operatorFeePercent: 1.5,
    description: "Frais opérateur 1.5% + GeniusPay 1% + 100 XOF",
  },
  {
    id: "orange_money",
    name: "Orange Money",
    logo: "orange_money",
    operatorFeePercent: 1.5,
    description: "Frais opérateur 1.5% + GeniusPay 1% + 100 XOF",
  },
  {
    id: "mtn_money",
    name: "MTN Money",
    logo: "mtn_money",
    operatorFeePercent: 1.5,
    description: "Frais opérateur 1.5% + GeniusPay 1% + 100 XOF",
  },
  {
    id: "moov_money",
    name: "Moov Money",
    logo: "moov_money",
    operatorFeePercent: 1.5,
    description: "Frais opérateur 1.5% + GeniusPay 1% + 100 XOF",
  },
];

export const GENIUSPAY_FEE_PERCENT = 1;
export const GENIUSPAY_FIXED_FEE = 100;

export function calculateTotalAmount(
  baseAmount: number,
  paymentMethod: PaymentMethod,
  clientPaysOperatorFees: boolean
): { total: number; operatorFee: number; geniusPayFee: number } {
  if (!clientPaysOperatorFees) {
    return { total: baseAmount, operatorFee: 0, geniusPayFee: 0 };
  }
  const operatorFee = Math.ceil(baseAmount * paymentMethod.operatorFeePercent / 100);
  const geniusPayFee = Math.ceil(baseAmount * GENIUSPAY_FEE_PERCENT / 100) + GENIUSPAY_FIXED_FEE;
  return {
    total: baseAmount + operatorFee + geniusPayFee,
    operatorFee,
    geniusPayFee,
  };
}