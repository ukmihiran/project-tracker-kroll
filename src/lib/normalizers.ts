export function normalizeRequiredText(value: string) {
  return value.trim();
}

export function normalizeOptionalText(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

export function normalizeOptionalUrl(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

export function normalizeOptionalDate(value?: Date | null) {
  return value ?? null;
}
