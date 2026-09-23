function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
}

assert.strictEqual = (actual: unknown, expected: unknown, message?: string): void => {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${String(expected)}, received ${String(actual)}`);
  }
};

export default assert;
