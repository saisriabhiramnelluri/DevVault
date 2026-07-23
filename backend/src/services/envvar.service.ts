import { prisma } from '../config/prisma';
import { EnvCategory, EnvEnvironment } from '@prisma/client';

// ── Category detection ─────────────────────────────────────────────────────────

const CATEGORY_PATTERNS: Record<EnvCategory, RegExp[]> = {
  DATABASE: [/DB_/i, /DATABASE/i, /POSTGRES/i, /MYSQL/i, /MONGO/i, /REDIS/i, /SUPABASE/i, /NEON/i, /PLANETSCALE/i],
  AUTHENTICATION: [/JWT/i, /AUTH/i, /SECRET/i, /SESSION/i, /OAUTH/i, /CLERK/i, /NEXTAUTH/i, /PASSW/i],
  CLOUD: [/AWS/i, /GCP/i, /AZURE/i, /GOOGLE_CLOUD/i, /CLOUDFLARE/i, /DIGITALOCEAN/i, /LINODE/i],
  PAYMENTS: [/STRIPE/i, /RAZORPAY/i, /PAYPAL/i, /BRAINTREE/i, /PADDLE/i, /LEMONSQUEEZY/i],
  EMAIL: [/SMTP/i, /SENDGRID/i, /MAILGUN/i, /RESEND/i, /POSTMARK/i, /EMAIL/i, /MAIL/i, /SES/i],
  STORAGE: [/S3/i, /BUCKET/i, /CLOUDFLARE_R2/i, /SUPABASE_STORAGE/i, /MINIO/i, /UPLOAD/i],
  API: [/API_KEY/i, /API_SECRET/i, /API_TOKEN/i, /OPENAI/i, /ANTHROPIC/i, /TWILIO/i, /PUSHER/i],
  OTHER: [],
};

export function detectCategory(key: string): EnvCategory {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'OTHER') continue;
    if (patterns.some((p) => p.test(key))) {
      return category as EnvCategory;
    }
  }
  return 'OTHER';
}

export function parseEnvFile(content: string): Array<{ key: string; value: string }> {
  const results: Array<{ key: string; value: string }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      results.push({ key, value });
    }
  }

  return results;
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

export async function createEnvVariable(
  projectId: string,
  key: string,
  ciphertext: string,
  iv: string,
  environment: EnvEnvironment = 'PRODUCTION',
  categoryOverride?: EnvCategory
) {
  const category = categoryOverride || detectCategory(key);
  return prisma.envVariable.create({
    data: { projectId, key, ciphertext, iv, category, environment },
  });
}

export async function bulkCreateEnvVariables(
  projectId: string,
  variables: Array<{
    key: string;
    ciphertext: string;
    iv: string;
    environment?: EnvEnvironment;
    category?: EnvCategory;
  }>
) {
  const data = variables.map((v) => ({
    projectId,
    key: v.key,
    ciphertext: v.ciphertext,
    iv: v.iv,
    environment: v.environment || ('PRODUCTION' as EnvEnvironment),
    category: v.category || detectCategory(v.key),
  }));

  return prisma.envVariable.createMany({ data });
}

export async function getEnvVariables(projectId: string, search?: string) {
  return prisma.envVariable.findMany({
    where: {
      projectId,
      ...(search ? { key: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });
}

export async function updateEnvVariable(
  id: string,
  projectId: string,
  data: { key?: string; ciphertext?: string; iv?: string; environment?: EnvEnvironment }
) {
  return prisma.envVariable.update({
    where: { id, projectId },
    data: {
      ...data,
      ...(data.key ? { category: detectCategory(data.key) } : {}),
    },
  });
}

export async function deleteEnvVariable(id: string, projectId: string) {
  return prisma.envVariable.delete({ where: { id, projectId } });
}
