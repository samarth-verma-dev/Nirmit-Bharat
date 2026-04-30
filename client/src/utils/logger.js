// src/utils/logger.js
// Simple logger that only outputs in development mode.

export const log = (...args) => {
  if (import.meta.env && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};
