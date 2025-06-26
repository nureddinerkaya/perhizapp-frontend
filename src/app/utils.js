export function formatNumber(val) {
  if (typeof val !== "number" || isNaN(val)) return "";
  if (Number.isInteger(val)) return val.toString();
  return parseFloat(val.toFixed(2)).toString();
}
