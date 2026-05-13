export function parseOptionalFollowUpDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T09:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid follow-up date.");
  }

  return parsed;
}

export function parseCsvTags(value: string | null) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function parseSelectedLeadIds(formData: FormData, key: string) {
  return Array.from(
    new Set(
      formData
        .getAll(key)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}
