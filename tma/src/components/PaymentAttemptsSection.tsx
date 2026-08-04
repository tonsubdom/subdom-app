import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { ZoneLength } from "@/services/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useZonePayment, ZoneType } from "@/hooks/useZonePayment";
import { ShowSnackbar } from "@/components/ShowSnackbar";
import { LengthRevealCard } from "@/components/PromoRevealModal/LengthRevealCard";

// Импортируем логотип TON (предполагаем, что файл ton.svg находится в той же папке)
import TonLogo from "./Header/ton.svg";

interface PaymentAttemptsSectionProps {
  address: string;
  colors: {
    background: string;
    text: string;
    border: string;
    secondaryBg: string;
    primary: string;
    cyberpunk: string;
    link: string;
  };
  isDark: boolean;
  onBeforeNavigate?: () => void;
}

const PaymentAttemptsSection: React.FC<PaymentAttemptsSectionProps> = ({
  address,
  colors,
  isDark,
  onBeforeNavigate,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [revealAfterPurchase, setRevealAfterPurchase] = useState<{ type: "proxy" | "sbt"; length: ZoneLength } | null>(null);
  const [paymentData, setPaymentData] = useState<{
    proxy: Record<ZoneLength, boolean>;
    sbt: Record<ZoneLength, boolean>;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const { payForZone } = useZonePayment();
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<JSX.Element | null>(null);

  const showSnackbar = (message: string, type: "success" | "error" = "success") => {
    setSnackbar(<ShowSnackbar message={message} type={type} onClose={() => setSnackbar(null)} />);
  };

  // Цены для proxy зон
  const proxyPrices: Record<ZoneLength, number> = {
    4: 100,
    5: 50,
    6: 40,
    7: 30,
    8: 20,
    9: 10,
  };

  // Цены для SBT попыток
  const sbtPrices: Record<ZoneLength, number> = {
    4: 5,
    5: 2.5,
    6: 2,
    7: 1.5,
    8: 1,
    9: 0.5,
  };

  useEffect(() => {
    if (!address) return;

    const fetchPaymentAttempts = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("📡 Загружаем оплаченные попытки для адреса:", address);
        const response = await apiService.getUserPaymentAttempts(address);

        if (response.success) {
          console.log("✅ Оплаченные попытки загружены:", response.data);
          setPaymentData(response.data);
        } else {
          setError(response.message || t("paymentAttemptsError"));
        }
      } catch (err: any) {
        console.error("❌ Ошибка загрузки оплаченных попыток:", err);
        setError(err.message || t("paymentAttemptsError"));
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentAttempts();
  }, [address, t]);

  // Обновляем высоту контента при изменении данных или состояния разворачивания
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [paymentData, isExpanded]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Клик по неоплаченной ячейке — сразу отправляет транзакцию покупки
  // (переиспользует ту же логику, что и степпер CreateCollectionPage).
  const handleCellClick = async (type: "proxy" | "sbt", length: ZoneLength) => {
    const key = `${type}-${length}`;
    if (payingKey || paymentData?.[type]?.[length]) return;

    setPayingKey(key);
    try {
      const result = await payForZone(type as ZoneType, length);

      if (result.success) {
        setPaymentData((prev) =>
          prev
            ? { ...prev, [type]: { ...prev[type], [length]: true } }
            : prev
        );
        showSnackbar(
          result.confirmedInBlock
            ? t("paymentSuccessfulConfirmed")
            : t("paymentSentNotConfirmed"),
          result.confirmedInBlock ? "success" : "error"
        );
        if (result.confirmedInBlock) {
          setRevealAfterPurchase({ type, length });
        }
      } else {
        showSnackbar(
          result.error === "walletNotConnected"
            ? t("walletNotConnected")
            : t("paymentFailed"),
          "error"
        );
      }
    } finally {
      setPayingKey(null);
    }
  };

  // Функция для отображения статуса попытки
  const renderStatusBadge = (isPaid: boolean) => {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "4px",
          backgroundColor: isPaid ? "#10B981" : "#EF4444",
          color: "white",
          fontSize: "12px",
          fontWeight: "600",
          margin: "2px",
        }}
      >
        {isPaid ? "✓" : "✗"}
      </div>
    );
  };

  // Функция для отображения цены с логотипом TON
  const renderPrice = (price: number) => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          marginTop: "4px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: colors.text,
            opacity: 0.9,
          }}
        >
          {price}
        </span>
        <img
          src={TonLogo}
          alt="GRAM"
          style={{
            width: "12px",
            height: "12px",
          }}
        />
      </div>
    );
  };

  // Функция для отображения таблицы попыток с ценами
  const renderPaymentTable = (
    type: "proxy" | "sbt",
    data: Record<ZoneLength, boolean>
  ) => {
    const zoneLengths: ZoneLength[] = [4, 5, 6, 7, 8, 9];
    const prices = type === "proxy" ? proxyPrices : sbtPrices;

    return (
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: "600",
              color: colors.text,
              fontFamily: "monospace",
            }}
          >
            {type === "proxy"
              ? t("paymentAttemptsProxyZones")
              : t("paymentAttemptsSbtZones")}
          </h4>
          <div
            style={{
              fontSize: "11px",
              color: colors.text,
              opacity: 0.7,
              fontFamily: "monospace",
            }}
          >
            {t("paymentAttemptsZoneLength")}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "4px",
            backgroundColor: colors.secondaryBg,
            padding: "8px",
            borderRadius: "6px",
            border: `1px solid ${colors.border}`,
          }}
        >
          {zoneLengths.map((length) => {
            const isPaid = data[length];
            const key = `${type}-${length}`;
            const isPaying = payingKey === key;

            return (
              <div
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPaid && !payingKey) handleCellClick(type, length);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "6px 4px",
                  borderRadius: "4px",
                  backgroundColor: colors.background,
                  border: `1px solid ${isPaying ? colors.cyberpunk : colors.border}`,
                  minHeight: "70px",
                  cursor: isPaid ? "default" : payingKey ? "wait" : "pointer",
                  opacity: payingKey && !isPaying ? 0.5 : 1,
                  transition: "opacity 0.15s ease, border-color 0.15s ease",
                }}
              >
                {/* Количество символов */}
                <div
                  style={{
                    fontSize: "10px",
                    color: colors.text,
                    opacity: 0.7,
                    marginBottom: "4px",
                    fontFamily: "monospace",
                    textAlign: "center",
                  }}
                >
                  {length} {t("paymentAttemptsChars")}
                </div>

                {/* Статус (галочка/крест/спиннер) */}
                {isPaying ? (
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      margin: "2px",
                      borderRadius: "50%",
                      border: `2px solid ${colors.border}`,
                      borderTopColor: colors.cyberpunk,
                      animation: "payment-attempt-spin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  renderStatusBadge(isPaid)
                )}

                {/* Цена */}
                {renderPrice(prices[length])}
              </div>
            );
          })}
        </div>

        {/* Статистика */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "8px",
            fontSize: "11px",
            color: colors.text,
            opacity: 0.7,
            fontFamily: "monospace",
          }}
        >
          <span>
            {t("paymentAttemptsPaid")}{" "}
            <strong style={{ color: "#10B981" }}>
              {Object.values(data).filter((v) => v).length}
            </strong>{" "}
            {t("paymentAttemptsOf")} 6
          </span>
          <span>
            {t("paymentAttemptsAvailable")}{" "}
            <strong style={{ color: "#10B981" }}>
              {Object.values(data).filter((v) => v).length}
            </strong>
          </span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: colors.text,
            opacity: 0.7,
            fontFamily: "monospace",
          }}
        >
          {t("paymentAttemptsLoading")}
        </div>
      );
    }

    if (error) {
      return (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: "#EF4444",
            fontFamily: "monospace",
          }}
        >
          ❌ {t("error")}: {error}
        </div>
      );
    }

    if (!paymentData) {
      return (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: colors.text,
            opacity: 0.7,
            fontFamily: "monospace",
          }}
        >
          {t("paymentAttemptsNoData")}
        </div>
      );
    }

    return (
      <div
        style={{
          backgroundColor: colors.secondaryBg,
          padding: "16px",
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
        }}
      >
        {renderPaymentTable("proxy", paymentData.proxy)}
        {renderPaymentTable("sbt", paymentData.sbt)}

        <div
          style={{
            marginTop: "12px",
            fontSize: "10px",
            color: colors.text,
            opacity: 0.5,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          {t("paymentAttemptsHint")}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <style>{`
        @keyframes payment-attempt-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {snackbar}
      {revealAfterPurchase && (
        <LengthRevealCard
          length={revealAfterPurchase.length}
          zoneType={revealAfterPurchase.type}
          variant="purchased"
          isDark={isDark}
          t={t}
          onClose={() => setRevealAfterPurchase(null)}
          onCta={() => {
            const type = revealAfterPurchase.type;
            setRevealAfterPurchase(null);
            onBeforeNavigate?.();
            setTimeout(() => navigate(`/create-collection?promo=${type}`), 300);
          }}
        />
      )}
      {/* Заголовок с кнопкой разворачивания */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "0 0 12px 0",
          paddingBottom: "6px",
          borderBottom: `2px solid ${colors.cyberpunk}`,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={toggleExpand}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: "600",
            color: colors.text,
            fontFamily: "monospace",
          }}
        >
          {t("paymentAttemptsTitle")}
        </h3>

        {/* Кнопка плюс/крест с анимацией */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "4px",
            backgroundColor: colors.secondaryBg,
            border: `1px solid ${colors.border}`,
            transition: "transform 0.2s ease",
            transform: isExpanded ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transition: "transform 0.2s ease",
            }}
          >
            <path
              d="M8 3V13M3 8H13"
              stroke={colors.text}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Контент с анимацией высоты */}
      <div
        ref={contentRef}
        style={{
          overflow: "hidden",
          transition: "max-height 0.3s ease",
          maxHeight: isExpanded ? `${contentHeight}px` : "0px",
        }}
      >
        {renderContent()}
      </div>

      {/* Дивайдер под заголовком (виден только когда свернуто) */}
      {!isExpanded && (
        <div
          style={{
            height: "4px",
            marginTop: "8px",
            background: `linear-gradient(90deg, ${colors.cyberpunk} 0%, ${colors.border} 100%)`,
            borderRadius: "2px",
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
};

export default PaymentAttemptsSection;
