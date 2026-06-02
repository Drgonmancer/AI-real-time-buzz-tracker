import prisma from '../lib/prisma';
import { config } from '../config';

export async function getOrCreateDefaultUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { username: 'default_user' },
    });
  }
  return user;
}

export function applyRuntimeAiConfig(partial: {
  apiKey?: string | null;
  baseUrl?: string;
  model?: string;
}) {
  if (partial.apiKey !== undefined) {
    const key = partial.apiKey || '';
    config.deepseek.apiKey = key;
    if (key) {
      process.env.DEEPSEEK_API_KEY = key;
    } else {
      delete process.env.DEEPSEEK_API_KEY;
    }
  }
  if (partial.baseUrl) {
    config.deepseek.baseUrl = partial.baseUrl;
    process.env.DEEPSEEK_BASE_URL = partial.baseUrl;
  }
  if (partial.model) {
    config.deepseek.model = partial.model;
    process.env.DEEPSEEK_MODEL = partial.model;
  }
}

export async function initAiConfigFromDb(): Promise<void> {
  if (config.deepseek.apiKey) return;

  const user = await prisma.user.findFirst({
    select: { apiKey: true },
  });

  if (user?.apiKey) {
    applyRuntimeAiConfig({ apiKey: user.apiKey });
  }
}

export async function saveAiConfig(data: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}) {
  const user = await getOrCreateDefaultUser();

  if (data.apiKey) {
    await prisma.user.update({
      where: { id: user.id },
      data: { apiKey: data.apiKey },
    });
    applyRuntimeAiConfig({ apiKey: data.apiKey });
  }

  if (data.baseUrl) {
    applyRuntimeAiConfig({ baseUrl: data.baseUrl });
  }

  if (data.model) {
    applyRuntimeAiConfig({ model: data.model });
  }
}

export async function clearStoredApiKey(): Promise<void> {
  const user = await getOrCreateDefaultUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { apiKey: null },
  });
  applyRuntimeAiConfig({ apiKey: null });
}

export function getApiKeyHint(apiKey: string): string | null {
  if (!apiKey) return null;
  if (apiKey.length <= 8) return '••••••••';
  return `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
}

export function getAiConfigSnapshot() {
  const configured = Boolean(config.deepseek.apiKey);
  return {
    model: config.deepseek.model,
    apiKeyStatus: configured ? ('valid' as const) : ('not_configured' as const),
    apiKeyConfigured: configured,
    apiKeyHint: configured ? getApiKeyHint(config.deepseek.apiKey) : null,
    dailyUsage: 0.35,
    dailyLimit: config.ai.dailyBudget,
  };
}
