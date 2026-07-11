/**
 * Blockchain Items - Главный файл экспорта
 * Экспортирует все модули для удобного импорта
 */

// ==================== КОНФИГУРАЦИЯ ====================

export * from './toncenter-api-config';

// ==================== ТИПЫ ====================

export * from './blockchain-items-types';

// ==================== УТИЛИТЫ ====================

export * from './blockchain-items-utils';

// ==================== СЕРВИС ====================

export * from './universal-blockchain-service';

// ==================== REDUX ====================

export * from './blockchain-items-slice';

// ==================== REACT ====================

export * from './blockchain-items-context.tsx';

// ==================== УДОБНЫЕ ЭКСПОРТЫ ====================

// Для быстрого импорта всех модулей
export { UniversalBlockchainService } from './universal-blockchain-service';
export { default as blockchainItemsReducer } from './blockchain-items-slice';
export { BlockchainItemsProvider, useBlockchainItems } from './blockchain-items-context.tsx';

// Специализированные хуки
export {
  useCollections,
  useProxySubdomains,
  useSBTSubdomains,
  useNFTWrappers,
  useMarketData,
  useUserData
} from './blockchain-items-context.tsx';

// Утилитарные функции
export {
  convertToSimpleEnrichedItems,
  convertToSimpleCollections,
  filterCollectionsByType,
  filterItemsByType,
  filterItemsByOwner,
  getUniqueZones,
  getItemsByCollection,
  getCollectionByAddress,
  getItemsStats
} from './blockchain-items-utils';

// Типы для удобства
export type {
  NetworkType,
  ItemType,
  CollectionType,
  SimpleEnrichedItem,
  SimpleCollection,
  AppData
} from './blockchain-items-types';