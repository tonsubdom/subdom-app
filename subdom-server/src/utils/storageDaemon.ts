// subdom-server/src/utils/storageDaemon.ts
//
// Тонкий клиент HTTP API tonutils-storage (xssnick/tonutils-storage),
// сервис "storage" в docker-compose.yml. POST /api/v1/create читает файлы
// с диска ПО ПУТИ (не по телу запроса) — этот путь должен быть виден
// демону через общий volume storage_uploads (см. docker-compose.yml).
// Референс API: https://github.com/xssnick/tonutils-storage#http-api

const STORAGE_API_URL = process.env.STORAGE_API_URL || 'http://storage:8192';
const STORAGE_API_LOGIN = process.env.STORAGE_API_LOGIN || '';
const STORAGE_API_PASSWORD = process.env.STORAGE_API_PASSWORD || '';

function authHeader(): string | undefined {
  if (!STORAGE_API_LOGIN) return undefined;
  return 'Basic ' + Buffer.from(`${STORAGE_API_LOGIN}:${STORAGE_API_PASSWORD}`).toString('base64');
}

async function storageFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any) };
  const auth = authHeader();
  if (auth) headers['Authorization'] = auth;

  const response = await fetch(`${STORAGE_API_URL}${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`tonutils-storage HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

/**
 * Создаёт bag из файлов, уже лежащих на диске по diskPath (внутри
 * контейнера storage — путь строится из STORAGE_UPLOADS_PATH на стороне
 * вызывающего кода, см. server-sqlite.ts).
 */
export async function createBag(diskPath: string, description: string): Promise<string> {
  const result = await storageFetch<{ bag_id: string }>('/api/v1/create', {
    method: 'POST',
    body: JSON.stringify({ path: diskPath, description }),
  });
  return result.bag_id;
}

export interface BagDetails {
  bag_id: string;
  description: string;
  size: number;
  files_count: number;
  completed: boolean;
  seeding: boolean;
}

export async function getBagDetails(bagId: string): Promise<BagDetails> {
  return storageFetch<BagDetails>(`/api/v1/details?bag_id=${encodeURIComponent(bagId)}`);
}
