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

export interface BagFileInfo {
  index: number;
  name: string;
  size: number;
}

export interface BagDetails {
  bag_id: string;
  description: string;
  size: number;
  files_count: number;
  completed: boolean;
  seeding: boolean;
  // Нужны для деплоя storage-contract (см. xssnick/tonutils-contracts
  // storage-contract.fc): bag_size = полный размер (file_size в TL-B),
  // piece_size = chunk_size, merkle_hash — корень merkle-дерева кусков.
  piece_size: number;
  bag_size: number;
  merkle_hash: string;
  // Присутствуют для bag'ов, добавленных через addBag (скачивание готового
  // bagID, не создание нового) — у только что созданных локально bag'ов эти
  // поля демон обычно не возвращает содержательными.
  downloaded?: number;
  active?: boolean;
  files?: BagFileInfo[];
  // Реальная директория на диске, куда демон пишет содержимое бага — НЕ
  // совпадает с bagId (внутренний хеш демона, отличный и от bagId, и от
  // merkle_hash). addBag() принимает diskPath как подсказку, но демон его
  // игнорирует и всегда кладёт файлы в STORAGE_UPLOADS_PATH/<dir_name>/ —
  // проверено вручную (find по shared volume). Отсюда и нужно резолвить
  // путь к уже скачанным файлам, а не из bagId.
  dir_name?: string;
}

export async function getBagDetails(bagId: string): Promise<BagDetails> {
  return storageFetch<BagDetails>(`/api/v1/details?bag_id=${encodeURIComponent(bagId)}`);
}

/**
 * Скачивание УЖЕ СУЩЕСТВУЮЩЕГО bag'а по его bagID (в отличие от createBag,
 * который создаёт новый bag из локальных файлов) — демон сам качает
 * содержимое от пиров в сети TON Storage и пишет на diskPath. download_all:
 * true — качаем реально все файлы, а не только заголовок (по умолчанию у
 * демона download_all:false качает только метаданные).
 */
export async function addBag(bagId: string, diskPath: string): Promise<void> {
  await storageFetch<{ ok: boolean }>('/api/v1/add', {
    method: 'POST',
    body: JSON.stringify({ bag_id: bagId, path: diskPath, download_all: true }),
  });
}

/**
 * Снимает bag с раздачи и удаляет исходные файлы с диска демона —
 * вызывается только после того, как все требуемые провайдеры storage-
 * contract'а подтвердили ончейн хотя бы один цикл proof_storage (см.
 * checkStorageDeals в server-sqlite.ts), то есть реально скачали полную
 * копию и способны раздавать её сами дальше без нашего узла.
 */
export async function removeBag(bagId: string): Promise<void> {
  await storageFetch<{ ok: boolean }>('/api/v1/remove', {
    method: 'POST',
    body: JSON.stringify({ bag_id: bagId, with_files: true }),
  });
}
