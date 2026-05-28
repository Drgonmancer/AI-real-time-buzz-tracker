import dns from 'dns';
import { execSync, spawnSync } from 'child_process';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

/** 读取 Windows 系统代理（VPN 开启后通常会自动写入） */
function getWindowsSystemProxy(): string | null {
  if (process.platform !== 'win32') return null;
  try {
    const script =
      "$p=Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if($p.ProxyEnable -eq 1 -and $p.ProxyServer){$p.ProxyServer}";
    const server = execSync(`powershell -NoProfile -Command "${script}"`, {
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
    if (!server) return null;
    return server.startsWith('http') ? server : `http://${server}`;
  } catch {
    return null;
  }
}

let proxyDispatcher: ProxyAgent | undefined;
let activeProxyUrl = '';

/** Reddit 会拦截 Node/undici 的 TLS 指纹；Windows 下经 curl 走代理可正常访问 */
function isRedditHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'reddit.com' || host.endsWith('.reddit.com');
  } catch {
    return false;
  }
}

function normalizeHeaders(
  headers?: Record<string, string> | Headers | [string, string][]
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

function fetchWithCurl(url: string, options: RequestInit = {}, timeoutMs = 20000): Response {
  const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const headers = normalizeHeaders(
    options.headers as Record<string, string> | Headers | [string, string][] | undefined
  );
  const args = [
    '-sS',
    '-L',
    '--compressed',
    '--max-time',
    String(Math.max(5, Math.ceil(timeoutMs / 1000))),
    '-w',
    '\n__CURL_HTTP_CODE__:%{http_code}',
  ];

  if (activeProxyUrl) args.push('-x', activeProxyUrl);
  for (const [key, value] of Object.entries(headers)) {
    args.push('-H', `${key}: ${value}`);
  }
  args.push(url);

  const result = spawnSync(curlBin, args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`curl exited ${result.status}: ${result.stderr || result.stdout}`);
  }

  const output = result.stdout || '';
  const marker = '\n__CURL_HTTP_CODE__:';
  const idx = output.lastIndexOf(marker);
  const body = idx >= 0 ? output.slice(0, idx) : output;
  const status = idx >= 0 ? parseInt(output.slice(idx + marker.length).trim(), 10) : 200;

  return new Response(body, {
    status: Number.isFinite(status) ? status : 200,
    statusText: status >= 400 ? 'Error' : 'OK',
  });
}

/** VPN/代理环境下优先 IPv4，并自动挂载系统代理 */
export function initNetwork(): void {
  dns.setDefaultResultOrder('ipv4first');

  activeProxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    getWindowsSystemProxy() ||
    '';

  if (activeProxyUrl && !proxyDispatcher) {
    try {
      proxyDispatcher = new ProxyAgent(activeProxyUrl);
      console.log(`[HTTP] Using proxy: ${activeProxyUrl}`);
    } catch (err) {
      console.warn('[HTTP] Invalid proxy URL:', err);
    }
  }
}

/** Reddit API 要求唯一、可识别的 User-Agent，否则返回 403 */
export const REDDIT_USER_AGENT = 'PulseHotMonitor/1.0 (Windows; Node.js; +https://github.com/pulse-hot-monitor)';

export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 20000,
  retries = 1
): Promise<Response> {
  // Reddit 经 undici 易被 403；优先 curl（与 PowerShell/curl 行为一致）
  if (isRedditHost(url)) {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = fetchWithCurl(url, options, timeoutMs);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
        return res;
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      const res = proxyDispatcher
        ? await undiciFetch(
            url,
            { ...fetchOptions, dispatcher: proxyDispatcher } as Record<string, unknown>
          )
        : await fetch(url, fetchOptions);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
      }
      return res as unknown as Response;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

/** 国际源（Reddit / Google News）使用更长超时 + 重试 */
export const INTL_FETCH_OPTS = { timeoutMs: 35000, retries: 2 } as const;
