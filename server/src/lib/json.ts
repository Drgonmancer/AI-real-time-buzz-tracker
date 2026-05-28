export function safeParse(json: string | null | undefined): any {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

export function parseMetrics(metrics: any): Record<string, number> {
  if (typeof metrics === 'string') {
    try {
      return JSON.parse(metrics);
    } catch {
      return {};
    }
  }
  return metrics || {};
}
