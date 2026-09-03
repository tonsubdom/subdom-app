// scripts/prerender.mjs
//
// Билд-тайм пререндер под несколько публичных (не wallet-gated) роутов —
// не рантайм SSR: копирует уже собранный dist/index.html (с реальными
// хешированными путями к JS/CSS от Vite) в dist/<route>/index.html для
// каждого роута из PUBLIC_ROUTES, подменяя только title/description/H1/
// canonical/OG. Тот же React-бандл монтируется и берёт управление как
// обычно — риска гидратации нет, потому что рантайм рендер всегда был CSR
// (createRoot().render() полностью перезаписывает #root, см. index.html).
//
// Почему не полноценный SSR: приложение wallet-gated on-chain (Market/
// Manage/Profile читают реальные данные по кошельку через toncenter) —
// серверный рендер этих страниц либо дублировал бы всю ончейн-логику на
// Node, либо рендерил бы пустые заглушки. Индексировать имеет смысл только
// публичный маркетинговый контент — вот он и пререндерится, точечно.
//
// nginx ничего менять не нужно: try_files $uri $uri/ /index.html уже
// резолвит /market в dist/market/index.html через директиву index.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const sourceHtml = readFileSync(path.join(distDir, 'index.html'), 'utf-8');

/** @type {Record<string, { title: string; description: string; h1: string; ogDescription: string; titleEn: string; descriptionEn: string; h1En: string }>} */
const PUBLIC_ROUTES = {
  market: {
    title: 'Рынок NFT-субдоменов .ton — купить и продать | Subdom',
    description: 'Маркетплейс независимых NFT-субдоменов и прокси-доменов .ton в сети TON. Аукционы, офферы, продажа — 90% дохода владельцу зоны.',
    h1: 'Рынок NFT-субдоменов .ton',
    titleEn: 'Subdom Market — Buy and Sell .ton NFT Subdomains',
    descriptionEn: 'Marketplace for independent .ton NFT subdomains and proxy domains on TON. Auctions, offers, sales — 90% of revenue goes to the zone owner.',
    h1En: 'Subdom Market — .ton NFT Subdomains',
    ogDescription: 'Аукционы, офферы и продажа NFT-субдоменов .ton. / Auctions, offers and sales of .ton NFT subdomains.',
  },
  'avatar-secret': {
    title: 'Блокчейн-Профиль — цифровая идентичность на TON | Subdom',
    description: 'Цифровая идентичность для доменов, субдоменов .ton и юзернеймов Telegram. Аватар, категория и описание — прямо в DNS TXT-записи домена.',
    h1: 'Блокчейн-Профиль',
    titleEn: 'Subdom Blockchain Profile — On-Chain Identity on TON',
    descriptionEn: "Digital identity for .ton domains, subdomains, and Telegram usernames. Avatar, category and description stored directly in the domain's DNS TXT record.",
    h1En: 'Subdom Blockchain Profile',
    ogDescription: 'Цифровая идентичность прямо в DNS-записях домена. / Digital identity stored directly in your domain\'s DNS records.',
  },
  faq: {
    title: 'FAQ — вопросы и ответы про NFT-субдомены .ton | Subdom',
    description: 'Частые вопросы о создании, управлении и продаже NFT-субдоменов .ton: SBT и Proxy зоны, аукционы, DNS-записи, сайты и торренты.',
    h1: 'FAQ — вопросы и ответы',
    titleEn: 'Subdom FAQ — .ton NFT Subdomains Explained',
    descriptionEn: 'Frequently asked questions about creating, managing and selling .ton NFT subdomains: SBT and Proxy zones, auctions, DNS records, sites and torrents.',
    h1En: 'Subdom FAQ',
    ogDescription: 'Ответы на частые вопросы про Subdom. / Answers to frequently asked questions about Subdom.',
  },
  // /create-collection и /manage сознательно не пререндерятся — под
  // ProtectedRoute, требуют кошелёк для любого осмысленного действия (см.
  // routes.tsx), краулеру там нечего индексировать без wallet-контекста.
  'add-subdomain': {
    title: 'Создать субдомен .ton — проверить доступность и сделать ставку | Subdom',
    description: 'Добавьте субдомен в SBT- или Proxy-коллекцию .ton: проверка доступности, аукцион с живыми ставками, мгновенный клейм SBT-субдомена.',
    h1: 'Создать субдомен .ton',
    titleEn: 'Create a .ton Subdomain — Check Availability and Bid | Subdom',
    descriptionEn: 'Add a subdomain to an SBT or Proxy .ton collection: check availability, bid in a live auction, or instantly claim an SBT subdomain.',
    h1En: 'Create a .ton Subdomain',
    ogDescription: 'Проверка доступности и аукцион для субдоменов .ton. / Availability check and auction for .ton subdomains.',
  },
  'create-torrent': {
    title: 'Создать торрент в TON Storage — загрузка и BagID | Subdom',
    description: 'Загрузите файлы в децентрализованное хранилище TON Storage, выберите провайдера и получите BagID торрента для субдомена .ton.',
    h1: 'Создать торрент в TON Storage',
    titleEn: 'Create a TON Storage Torrent — Upload and BagID | Subdom',
    descriptionEn: 'Upload files to the decentralized TON Storage network, pick a provider, and get a torrent BagID for your .ton subdomain.',
    h1En: 'Create a TON Storage Torrent',
    ogDescription: 'Загрузка файлов в TON Storage и получение BagID. / Upload files to TON Storage and get a BagID.',
  },
};

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

for (const [route, meta] of Object.entries(PUBLIC_ROUTES)) {
  const titleTag = `${escapeHtml(meta.title)} / ${escapeHtml(meta.titleEn)}`;
  const canonical = `https://subdom.zone/${route}`;

  let html = sourceHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${titleTag}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(meta.description)} / ${escapeHtml(meta.descriptionEn)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${titleTag}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(meta.ogDescription)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${titleTag}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeHtml(meta.ogDescription)}$2`)
    // seo-snapshot H1/H2 — только заголовки блоков (не вся секция), нав со
    // ссылками на остальные разделы оставляем как есть — кросс-линковка
    // между пререндеренными и обычной страницами.
    .replace(/<h1>[^<]*<\/h1>/, `<h1>${escapeHtml(meta.h1)}</h1>`)
    .replace(/<h2>[^<]*<\/h2>/, `<h2>${escapeHtml(meta.h1En)}</h2>`);

  const outDir = path.join(distDir, route);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
  console.log(`[prerender] dist/${route}/index.html written`);
}
