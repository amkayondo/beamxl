export function maskPhoneNumber(phone: string) {
  if (phone.length <= 4) return "****";
  const visiblePrefix = phone.slice(0, 5);
  const visibleSuffix = phone.slice(-2);
  return `${visiblePrefix}${"*".repeat(Math.max(4, phone.length - 7))}${visibleSuffix}`;
}
