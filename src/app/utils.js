export function formatNumber(val) {
  if (typeof val !== "number" || isNaN(val)) return "";
  if (Number.isInteger(val)) return val.toString();
  return parseFloat(val.toFixed(2)).toString();
}

export function getBasicAuthHeader() {
  const user = process.env.NEXT_PUBLIC_RECORDS_USERNAME;
  const pass = process.env.NEXT_PUBLIC_RECORDS_PASSWORD;
  if (!user || !pass) return {};
  const token = typeof btoa === "function"
    ? btoa(`${user}:${pass}`)
    : Buffer.from(`${user}:${pass}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}
