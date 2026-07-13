export function accessRequestDeliveryPath(
  status: number,
  token: string | undefined
): string | null {
  if (status !== 1 || !token) {
    return null;
  }
  return `/delivery?token=${encodeURIComponent(token)}`;
}
