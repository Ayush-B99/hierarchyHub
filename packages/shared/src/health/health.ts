import { z } from 'zod';

/**
 * Contract for GET /api/health. Defined once here and used by both the API
 * (to build the response) and the web app (to parse it).
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
