export type TopupPackCode = "MINI" | "BUSINESS" | "POWER";

export type TopupPack = {
  code: TopupPackCode;
  name: string;
  priceMinor: number;
  currency: "USD";
  smsCredits: number;
  emailCredits: number;
  voiceSeconds: number;
  whatsappCredits: number;
};

export const TOPUP_PACKS: TopupPack[] = [
  {
    code: "MINI",
    name: "Mini",
    priceMinor: 700,
    currency: "USD",
    smsCredits: 200,
    emailCredits: 2000,
    voiceSeconds: 0,
    whatsappCredits: 200,
  },
  {
    code: "BUSINESS",
    name: "Business",
    priceMinor: 2900,
    currency: "USD",
    smsCredits: 1000,
    emailCredits: 10000,
    voiceSeconds: 60 * 60,
    whatsappCredits: 1000,
  },
  {
    code: "POWER",
    name: "Power",
    priceMinor: 9900,
    currency: "USD",
    smsCredits: 5000,
    emailCredits: 50000,
    voiceSeconds: 200 * 60,
    whatsappCredits: 5000,
  },
];

export function getTopupPack(code: string) {
  return TOPUP_PACKS.find((pack) => pack.code === code.toUpperCase());
}
