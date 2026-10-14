import { expect } from "vitest";

export function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  expect(actual, msg).toEqual(expected);
}

export function assertNotEquals<T>(actual: T, expected: T, msg?: string): void {
  expect(actual, msg).not.toEqual(expected);
}

export function assert(expr: unknown, msg?: string): asserts expr {
  expect(Boolean(expr), msg).toBe(true);
}

export function assertExists<T>(actual: T, msg?: string): asserts actual is NonNullable<T> {
  expect(actual, msg).toBeDefined();
  expect(actual, msg).not.toBeNull();
}

export async function assertRejects(
  fn: () => Promise<unknown>,
  ErrorClass?: new (...args: any[]) => Error,
  msgIncludes?: string | RegExp,
  msg?: string
): Promise<void> {
  if (ErrorClass) {
    if (msgIncludes) {
      await expect(fn(), msg).rejects.toThrowError(msgIncludes);
    } else {
      await expect(fn(), msg).rejects.toThrowError(ErrorClass);
    }
  } else {
    await expect(fn(), msg).rejects.toThrow();
  }
}

export function assertThrows(
  fn: () => unknown,
  ErrorClass?: new (...args: any[]) => Error,
  msgIncludes?: string | RegExp,
  msg?: string
): void {
  if (ErrorClass) {
    if (msgIncludes) {
      expect(fn, msg).toThrowError(msgIncludes);
    } else {
      expect(fn, msg).toThrowError(ErrorClass);
    }
  } else {
    expect(fn, msg).toThrow();
  }
}

export function assertMatch(actual: string, regex: RegExp, msg?: string): void {
  expect(actual, msg).toMatch(regex);
}

export function assertStringIncludes(actual: string, expected: string, msg?: string): void {
  expect(actual, msg).toContain(expected);
}

export function assertArrayIncludes<T>(actual: ArrayLike<T>, expected: ArrayLike<T>, msg?: string): void {
  for (const item of Array.from(expected)) {
    expect(actual, msg).toContain(item);
  }
}

export function unreachable(msg?: string): never {
  throw new Error(msg || "unreachable code executed");
}
