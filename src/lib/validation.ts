export function requiredTrimmedString(
  formData: FormData,
  key: string,
  options?: { maxLength?: number },
) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    throw new Error(`${key} is required.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${key} is required.`);
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    throw new Error(`${key} must be ${options.maxLength} characters or fewer.`);
  }

  return trimmed;
}

export function optionalTrimmedString(
  formData: FormData,
  key: string,
  options?: { maxLength?: number },
) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    throw new Error(`${key} must be ${options.maxLength} characters or fewer.`);
  }

  return trimmed;
}

export function requiredEmail(formData: FormData, key: string) {
  const email = requiredTrimmedString(formData, key, { maxLength: 254 }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${key} must be a valid email address.`);
  }

  return email;
}

export function requiredEnumValue<T extends string>(
  formData: FormData,
  key: string,
  allowedValues: readonly T[],
) {
  const value = requiredTrimmedString(formData, key, { maxLength: 64 });

  if (!allowedValues.includes(value as T)) {
    throw new Error(`Invalid ${key}.`);
  }

  return value as T;
}

export function requiredToken(formData: FormData, key: string) {
  return requiredTrimmedString(formData, key, { maxLength: 255 });
}
