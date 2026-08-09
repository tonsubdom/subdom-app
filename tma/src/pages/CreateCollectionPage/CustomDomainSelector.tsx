// src/pages/CreateCollectionPage/CustomDomainSelector.tsx
// Селектор доменов пользователя для шага 1 CreateCollectionPage — тот же
// UI-паттерн (поиск + выпадающий список), что и CustomZoneSelector.tsx в
// AddSubdomainPage, но список наполняется .ton доменами, которыми реально
// владеет подключённый кошелёк (TonCenterAPI.getItemsByCollectionAndOwner
// по адресу официальной TON DNS коллекции), а не зонами платформы.
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TonCenterAPI } from "@/services/blockchainItems/toncenter-api-config";

export interface OwnedDomain {
  name: string;
  address: string;
}

interface CustomDomainSelectorProps {
  dnsCollectionAddress: string;
  ownerAddress: string | null;
  isTestnet: boolean;
  selectedDomain: string;
  onDomainChange: (domainName: string) => void;
  isDark: boolean;
  placeholder?: string;
  disabled?: boolean;
  onActivate?: () => void;
}

export const CustomDomainSelector: React.FC<CustomDomainSelectorProps> = ({
  dnsCollectionAddress,
  ownerAddress,
  isTestnet,
  selectedDomain,
  onDomainChange,
  isDark,
  placeholder,
  disabled = false,
  onActivate,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [domains, setDomains] = useState<OwnedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const loadedForRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const themeColors = {
    light: {
      primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
      accent: "#3B82F6",
    },
    dark: {
      primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
      accent: "#FFD700",
    },
  };
  const colors = themeColors[isDark ? "dark" : "light"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !ownerAddress) return;
    const cacheKey = `${isTestnet ? "testnet" : "mainnet"}_${ownerAddress}`;
    if (loadedForRef.current === cacheKey) return;
    loadedForRef.current = cacheKey;

    setIsLoading(true);
    setError(null);
    const api = new TonCenterAPI(isTestnet);
    const PAGE_SIZE = 200;

    // toncenter отдаёт максимум PAGE_SIZE итемов за раз независимо от того,
    // сколько реально есть у кошелька (у юзера бывает 520+ доменов) —
    // догружаем страницы, пока очередная не вернула меньше PAGE_SIZE.
    const loadAllPages = async (): Promise<OwnedDomain[]> => {
      const all: OwnedDomain[] = [];
      let offset = 0;
      for (;;) {
        const res = await api.getItemsByCollectionAndOwner(dnsCollectionAddress, ownerAddress, PAGE_SIZE, offset);
        const items = (res?.nft_items || [])
          .map((item: any) => ({
            name: item?.content?.domain as string | undefined,
            address: item?.address as string,
          }))
          .filter((d): d is OwnedDomain => !!d.name);
        all.push(...items);
        if (items.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return all;
    };

    loadAllPages()
      .then(setDomains)
      .catch((err) => {
        console.error("Не удалось загрузить домены кошелька:", err);
        setError(t("domainSelectorLoadError") || "Не удалось загрузить домены");
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, ownerAddress, isTestnet, dnsCollectionAddress, t]);

  const formatDomainLabel = (fullName: string) => fullName.replace(/\.ton$/i, "");

  const filteredDomains = useMemo(() => {
    const query = searchQuery.toLowerCase().replace(/^\./, "");
    const filtered = query.trim()
      ? domains.filter((d) => d.name.toLowerCase().includes(query))
      : domains;
    if (!sortOrder) return filtered;
    const sorted = [...filtered].sort((a, b) => a.name.length - b.name.length);
    return sortOrder === "asc" ? sorted : sorted.reverse();
  }, [domains, searchQuery, sortOrder]);

  const cycleSortOrder = () => {
    setSortOrder((prev) => (prev === null ? "asc" : prev === "asc" ? "desc" : null));
  };

  const handleSelect = (domainFullName: string) => {
    onDomainChange(formatDomainLabel(domainFullName));
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div style={{ position: "relative", width: "280px" }} ref={dropdownRef}>
      <div
        onClick={() => {
          if (disabled) {
            onActivate?.();
            return;
          }
          setIsOpen((v) => !v);
        }}
        style={{
          width: "280px",
          borderRadius: "25px",
          padding: "10px 15px",
          background: isDark ? "#1A1A1A" : "white",
          border: `1px solid ${isOpen ? colors.accent : (isDark ? "#444" : "#ccc")}`,
          cursor: "pointer",
          color: isDark ? "#E5E5E5" : "black",
          fontFamily: "monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "44px",
          boxSizing: "border-box",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: selectedDomain ? (isDark ? "#E5E5E5" : "black") : "#999",
          }}
        >
          {selectedDomain ? `.${selectedDomain}` : (placeholder || t("domainSelectorPlaceholder") || "Выбрать из своих доменов...")}
        </span>
        <span
          style={{
            marginLeft: "8px",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            color: "#666",
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "280px",
            background: isDark ? "#1A1A1A" : "white",
            border: `1px solid ${isDark ? "#444" : "#ccc"}`,
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            maxHeight: "340px",
            overflow: "hidden",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "10px", borderBottom: `1px solid ${isDark ? "#333" : "#f0f0f0"}`, background: colors.primary, display: "flex", gap: "8px" }}>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("domainSelectorSearchPlaceholder") || "Поиск домена..."}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontFamily: "monospace",
                fontSize: "14px",
                outline: "none",
                color: "black",
                boxSizing: "border-box",
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cycleSortOrder(); }}
              title={
                sortOrder === "asc"
                  ? (t("domainSelectorSortAsc") || "Сначала короткие")
                  : sortOrder === "desc"
                  ? (t("domainSelectorSortDesc") || "Сначала длинные")
                  : (t("domainSelectorSortDefault") || "Без сортировки")
              }
              style={{
                flexShrink: 0,
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background: sortOrder ? "rgba(255,255,255,0.85)" : "white",
                cursor: "pointer",
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : "↕"}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", maxHeight: "260px", background: isDark ? "#1A1A1A" : "white" }}>
            {isLoading ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: "13px", fontFamily: "monospace" }}>
                {t("loading") || "Загрузка..."}
              </div>
            ) : error ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#e74c3c", fontSize: "13px", fontFamily: "monospace" }}>
                {error}
              </div>
            ) : filteredDomains.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: "13px", fontFamily: "monospace" }}>
                {domains.length === 0
                  ? (t("domainSelectorNoDomains") || "У вас нет .ton доменов на этом кошельке")
                  : (t("domainSelectorNoMatches") || "Ничего не найдено")}
              </div>
            ) : (
              filteredDomains.map((domain) => (
                <div
                  key={domain.address}
                  onClick={() => handleSelect(domain.name)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    color: isDark ? "#E5E5E5" : "black",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    borderBottom: `1px solid ${isDark ? "#2a2a2a" : "#f5f5f5"}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#f5f5f5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  .{formatDomainLabel(domain.name)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDomainSelector;
