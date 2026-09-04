export interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  operatorFeePercent: number;
  description?: string;
}

/** Operator fees from GeniusPay pricing (CI): Wave direct 1.5%; Orange / MTN / Moov via PawaPay or PAL ~3.5%. */
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "wave",
    name: "Wave",
    logo: "wave",
    operatorFeePercent: 1.5,
    description: "Frais opérateur 1.5%",
  },
  {
    id: "orange_money",
    name: "Orange Money",
    logo: "orange_money",
    operatorFeePercent: 3.5,
    description: "Frais opérateur 3.5%",
  },
  {
    id: "mtn_money",
    name: "MTN Money",
    logo: "mtn_money",
    operatorFeePercent: 3.5,
    description: "Frais opérateur 3.5%",
  },
  {
    id: "moov_money",
    name: "Moov Money",
    logo: "moov_money",
    operatorFeePercent: 3.5,
    description: "Frais opérateur 3.5%",
  },
];

export function calculateTotalAmount(
  baseAmount: number,
  paymentMethod: PaymentMethod,
  clientPaysOperatorFees: boolean
): { total: number; operatorFee: number } {
  if (!clientPaysOperatorFees) {
    return { total: baseAmount, operatorFee: 0 };
  }
  const operatorFee = Math.ceil((baseAmount * paymentMethod.operatorFeePercent) / 100);
  return {
    total: baseAmount + operatorFee,
    operatorFee,
  };
}
