import { z } from 'zod';

const envSchema = z.object({
  RPC_URL: z.string().min(1),
  NETWORK: z.string().min(1),
  CHAIN_ID: z.coerce.number(),
  RPC_RATE_LIMIT: z.coerce.number().default(20),
  RPC_MAX_BATCH_SIZE: z.coerce.number().default(100),
  BLOCK_RANGE_FROM: z.coerce.number(),
  BLOCK_RANGE_TO: z.coerce.number().nullish(),
});

export const config = envSchema.parse(process.env);
