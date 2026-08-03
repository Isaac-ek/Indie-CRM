export function requiredTrimmedString(
  formData: FormData,
  key: string,
  options?: { maxLength?: number },
) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    throw new Error(`${key} is required.`);
  }

  const trimmed = sanitizeInputString(value.trim());

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

  const trimmed = sanitizeInputString(value.trim());

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

export function sanitizeInputString(input: string): string {
  // Remove null bytes and unprintable ASCII control characters except newlines/tabs
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (typeof password !== "string" || !password) {
    return { valid: false, reason: "Password is required." };
  }

  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long." };
  }

  if (password.length > 200) {
    return { valid: false, reason: "Password must be 200 characters or fewer." };
  }

  return { valid: true };
}

export function requiredInteger(
  formData: FormData,
  key: string,
  options?: { min?: number; max?: number },
): number {
  const raw = requiredTrimmedString(formData, key);
  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a valid integer.`);
  }

  if (options?.min !== undefined && parsed < options.min) {
    throw new Error(`${key} must be at least ${options.min}.`);
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw new Error(`${key} must be at most ${options.max}.`);
  }

  return parsed;
}

export function optionalUrl(formData: FormData, key: string): string | null {
  const raw = optionalTrimmedString(formData, key, { maxLength: 2048 });
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error(`${key} must be a valid HTTP or HTTPS URL.`);
  }
}
