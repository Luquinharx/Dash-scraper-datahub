export function toMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const maybeObj = value as Record<string, unknown>;

    // Firestore timestamp JSON shape
    if (typeof maybeObj.seconds === "number") {
      return (maybeObj.seconds as number) * 1000;
    }

    // SDK timestamp instance shape
    if (typeof maybeObj.toMillis === "function") {
      try {
        const millis = (maybeObj.toMillis as () => number)();
        return Number.isFinite(millis) ? millis : 0;
      } catch {
        return 0;
      }
    }
  }

  return 0;
}

export function formatDateTimePtBR(value: unknown): string {
  const millis = toMillis(value);
  if (!millis) return "Invalid Date";
  return new Date(millis).toLocaleDateString("pt-BR") + " " + new Date(millis).toLocaleTimeString("pt-BR");
}

export function formatDatePtBR(value: unknown): string {
  const millis = toMillis(value);
  if (!millis) return "—";
  return new Date(millis).toLocaleDateString("pt-BR");
}
