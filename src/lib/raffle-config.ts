// Raffle details. Edit here to change what the app, ticket and messages show.
export const raffleConfig = {
  organizer: "Yoli Manualidades",
  raffleName: "Rifa Navideña",
  totalNumbers: 100,
  priceText: "1 por S/ 8 | 2 por S/ 15",
  drawDate: "Domingo 13 de diciembre de 2026",
  drawPlace: "Se realizará virtualmente en el Facebook de Yoli Manualidades",
  contactWhatsApp: "+51931436288", // shown formatted as 931 436 288
  payment: "Pago vía Yape",
  prizes: [
    "1er Premio: Papá Noel navideño hecho a mano",
    "2do Premio: Muñeco de nieve navideño (no incluye panetón)",
    "3er Premio: Adorno navideño de galletas de jengibre",
  ],
} as const;

export const TOTAL_NUMBERS = raffleConfig.totalNumbers;

/** 7 -> "007" */
export function padNumber(n: number): string {
  return String(n).padStart(3, "0");
}

/** "+51931436288" -> "931 436 288" */
export function formatContactWhatsApp(): string {
  const digits = raffleConfig.contactWhatsApp.replace(/^\+51/, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}
