

// src/utils/miniAppLinks.ts - полностью исправленная версия
import { publicUrl } from '../helpers/publicUrl';
import { AuctionUrlParams} from './urlParams';

/**
 * Утилита для генерации ссылок для мини-апп Telegram
 * Интегрируется с существующей системой URL параметров
 */

export interface MiniAppLinkConfig {
  isProduction?: boolean;
  botUsername?: string;
}

export class MiniAppLinkGenerator {
  // Конфигурация по умолчанию
  private static config: MiniAppLinkConfig = {
    isProduction: true,
    botUsername: 'subdom'
  };

  /**
   * Инициализирует конфигурацию генератора ссылок
   */
  static init(config: Partial<MiniAppLinkConfig> = {}): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Получает базовый URL приложения
   */
  private static getBaseUrl(): string {
    if (this.config.isProduction) {
      // В продакшене используем publicUrl для корректного формирования URL
      return publicUrl('/');
    } else {
      // В разработке используем localhost
      return import.meta.env.VITE_API_BASE_URL;
    }
  }

  /**
   * Генерирует полный URL для приложения (hash routing)
   * @param path - путь в hash routing (например: "/add-subdomain")
   * @param params - параметры для URL
   * @returns Полный URL для открытия в браузере
   */
  static generateAppUrl(path: string, params: Record<string, string> = {}): string {
    const baseUrl = this.getBaseUrl();
    
    // Для hash routing формируем URL
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    // Создаем URL с hash
    const url = new URL(baseUrl);
    url.hash = `/${path}`;
    
    // Добавляем параметры
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          searchParams.set(key, value);
        }
      });
      url.hash += `?${searchParams.toString()}`;
    }
    
    return url.toString();
  }

  /**
   * Генерирует deeplink для Telegram мини-апп
   * @param path - путь в приложении
   * @param params - параметры для роута
   * @returns Deeplink для Telegram
   */
  static generateTelegramDeeplink(path: string, params: Record<string, string> = {}): string {
    // Формируем startapp параметр
    let startappParam = path.replace(/^\/+/, ''); // Убираем начальный слеш
    
    if (Object.keys(params).length > 0) {
      // Преобразуем параметры в строку формата key_value
      const paramString = Object.entries(params)
        .filter(([_, value]) => value) // Фильтруем пустые значения
        .map(([key, value]) => `${key}_${value}`)
        .join('_');
      
      if (paramString) {
        startappParam = `${startappParam}_${paramString}`;
      }
    }
    
    // Кодируем параметр для URL
    const encodedParam = encodeURIComponent(startappParam);
    
    // Формируем deeplink
    return `https://t.me/${this.config.botUsername}?startapp=${encodedParam}`;
  }

  // ========== СПЕЦИАЛЬНЫЕ МЕТОДЫ ДЛЯ КОНКРЕТНЫХ КЕЙСОВ ==========

  /**
   * Генерирует ссылку для создания субдомена (роут 1)
   * Используется когда разворачивается Bundle
   * @param zoneName - имя зоны (например: "polymarket.ton")
   * @param subdomainName - опциональное имя субдомена
   * @returns Ссылка для мини-апп
   */
  // Telegram startapp допускает только [A-Za-z0-9_-] — точка из ".ton" ломает
  // ссылку (мини-апп вообще не открывается). Отрезаем TLD тут, обратно
  // добавляем в parseStartappParam ниже, чтобы zone всегда приходил с ".ton"
  // туда, где он матчится с zone.name (allZones, sbtCollections и т.д.).
  private static stripTonTld(zoneName: string): string {
    return zoneName.replace(/\.ton$/i, '');
  }

  static generateAddSubdomainLink(zoneName: string, subdomainName?: string): string {
    const params: Record<string, string> = { zone: this.stripTonTld(zoneName) };
    if (subdomainName) {
      params.subdomain = subdomainName;
    }

    return this.generateTelegramDeeplink('/add-subdomain', params);
  }

  /**
   * Генерирует ссылку для маркета (роут 2)
   * Используется когда аукцион завершен
   * @returns Ссылка для мини-апп
   */
  static generateMarketLink(): string {
    return this.generateTelegramDeeplink('/market');
  }

  /**
   * Генерирует ссылку для аукциона (роут 3)
   * Используется для нового аукциона или новой ставки
   * @param zoneName - имя зоны
   * @param subdomainName - имя субдомена
   * @returns Ссылка для мини-апп
   */
  static generateAuctionLink(zoneName: string, subdomainName: string): string {
    return this.generateTelegramDeeplink('/add-subdomain', {
      zone: this.stripTonTld(zoneName),
      subdomain: subdomainName
    });
  }

  /**
   * Генерирует ссылку для главной страницы
   * @returns Ссылка для мини-апп
   */
  static generateHomeLink(): string {
    return this.generateTelegramDeeplink('/');
  }

  // ========== МЕТОДЫ ДЛЯ ИНТЕГРАЦИИ С СУЩЕСТВУЮЩЕЙ СИСТЕМОЙ ==========

  /**
   * Генерирует ссылку для аукциона с использованием существующей системы URL параметров
   * @param auctionParams - параметры аукциона
   * @returns Deeplink для Telegram
   */
  static generateAuctionDeeplinkFromParams(auctionParams: AuctionUrlParams): string {
    if (!auctionParams.zone) {
      throw new Error('Zone name is required for auction deeplink');
    }

    const params: Record<string, string> = { zone: auctionParams.zone };
    if (auctionParams.subdomain) {
      params.subdomain = auctionParams.subdomain;
    }

    return this.generateTelegramDeeplink('/add-subdomain', params);
  }

  /**
   * Генерирует прямую ссылку на приложение для аукциона
   * @param auctionParams - параметры аукциона
   * @returns Прямой URL для открытия в браузере
   */
  static generateDirectAuctionUrl(auctionParams: AuctionUrlParams): string {
    const params: Record<string, string> = {};
    if (auctionParams.zone) params.zone = auctionParams.zone;
    if (auctionParams.subdomain) params.subdomain = auctionParams.subdomain;

    return this.generateAppUrl('/add-subdomain', params);
  }

  // ========== УТИЛИТЫ ДЛЯ ПАРСИНГА ==========

  /**
   * Парсит startapp параметр из Telegram deeplink
   * @param startappParam - параметр startapp из URL
   * @returns Объект с роутом и параметрами
   */
  static parseStartappParam(startappParam: string): { route: string; params: Record<string, string> } {
    const parts = startappParam.split('_');
    
    if (parts.length === 0) {
      return { route: '/', params: {} };
    }
    
    // Первая часть - это роут
    // Используем не-null assertion (!) так как мы проверили parts.length > 0
    const firstPart = parts[0]!; // ! говорит TypeScript, что это не undefined
    const route = firstPart.startsWith('/') ? firstPart : `/${firstPart}`;
    const params: Record<string, string> = {};
    
    // Остальные части - это параметры в формате key_value
    for (let i = 1; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        const key = parts[i];
        const value = parts[i + 1];
        
        // Проверяем что key и value определены
        if (key !== undefined && value !== undefined) {
          params[key] = value;
        }
      }
    }

    // Симметрично stripTonTld() в generateAddSubdomainLink/generateAuctionLink —
    // zone пришёл без ".ton" (иначе Telegram отклоняет startapp), возвращаем
    // TLD обратно, чтобы дальше zone матчился с zone.name (allZones и т.д.).
    if (params.zone && !/\.ton$/i.test(params.zone)) {
      params.zone = `${params.zone}.ton`;
    }

    return { route, params };
  }

  /**
   * Проверяет, является ли ссылка deeplink для вашего мини-апп
   * @param url - URL для проверки
   * @returns true если это deeplink для вашего мини-апп
   */
  static isOurMiniAppDeeplink(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 't.me' && 
             urlObj.pathname === `/${this.config.botUsername}` &&
             urlObj.searchParams.has('startapp');
    } catch {
      return false;
    }
  }

  /**
   * Извлекает параметры из deeplink URL
   * @param deeplinkUrl - полный deeplink URL
   * @returns Объект с роутом и параметрами или null
   */
  static extractParamsFromDeeplink(deeplinkUrl: string): { route: string; params: Record<string, string> } | null {
    try {
      const urlObj = new URL(deeplinkUrl);
      const startappParam = urlObj.searchParams.get('startapp');
      
      if (!startappParam) {
        return null;
      }
      
      return this.parseStartappParam(decodeURIComponent(startappParam));
    } catch {
      return null;
    }
  }
}

// Экспортируем хелперы для удобства
export const MiniAppLinks = {
  // Генерация ссылок
  addSubdomain: (zone: string, subdomain?: string) => 
    MiniAppLinkGenerator.generateAddSubdomainLink(zone, subdomain),
  
  market: () => MiniAppLinkGenerator.generateMarketLink(),
  
  auction: (zone: string, subdomain: string) => 
    MiniAppLinkGenerator.generateAuctionLink(zone, subdomain),
  
  home: () => MiniAppLinkGenerator.generateHomeLink(),
  
  // Утилиты
  parseStartapp: (param: string) => MiniAppLinkGenerator.parseStartappParam(param),
  
  isDeeplink: (url: string) => MiniAppLinkGenerator.isOurMiniAppDeeplink(url),
  
  extractFromDeeplink: (url: string) => MiniAppLinkGenerator.extractParamsFromDeeplink(url)
};