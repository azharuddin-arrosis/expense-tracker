import { createClient } from '@vercel/kv';

function getEnv(name: string): string | undefined {
  const prefixed = `expensetracker_${name}`;
  return process.env[prefixed] || process.env[name];
}

export const kv = createClient({
  url: getEnv('KV_REST_API_URL') || '',
  token: getEnv('KV_REST_API_TOKEN') || '',
});

export function getKvUrl(): string | undefined {
  return getEnv('KV_URL');
}
