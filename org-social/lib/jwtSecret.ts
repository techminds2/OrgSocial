// lib/jwtSecret.ts
export const DJANGO_JWT_SECRET = new TextEncoder().encode(
  process.env.DJANGO_JWT_SECRET || ""
);
