
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extends Vitest's expect method with methods from jest-dom (toBeInTheDocument, etc.)
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});
