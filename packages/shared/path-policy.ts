export class PathPolicyViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathPolicyViolation";
  }
}

/**
 * Validates and sanitizes a client-supplied relative path:
 * - Must be a non-empty string
 * - Rejects null bytes (\0)
 * - Normalizes Windows backslashes to POSIX forward slashes
 * - Rejects absolute paths (leading slash / or Windows drive C:)
 * - Rejects directory traversal (..) segments
 * - Strips leading/trailing slashes and redundant ./ segments
 */
export function sanitizeRelativePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== "string") {
    throw new PathPolicyViolation("Relative path must be a non-empty string");
  }

  if (rawPath.includes("\0")) {
    throw new PathPolicyViolation("Relative path cannot contain null bytes");
  }

  const normalized = rawPath.replace(/\\/g, "/");

  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new PathPolicyViolation("Relative path cannot be an absolute path");
  }

  const segments = normalized.split("/").filter((s) => s.length > 0 && s !== ".");
  if (segments.length === 0) {
    throw new PathPolicyViolation("Relative path cannot be empty");
  }

  if (segments.includes("..")) {
    throw new PathPolicyViolation("Relative path cannot contain directory traversal '..' segments");
  }

  return segments.join("/");
}
