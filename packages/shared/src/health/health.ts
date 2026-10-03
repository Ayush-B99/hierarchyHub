import { z } from 'zod';

/**
 * Contract for GET /api/health and /api/health/ready. Defined once here and used by both
 * the API (to build the response) and the web app (to parse it).
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  /** only on the readiness check */
  database: z.enum(['up', 'down']).optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
