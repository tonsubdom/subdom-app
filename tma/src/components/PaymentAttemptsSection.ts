import React, { useState, useEffect, useRef } from "react";
import { apiService } from "@/services/api";
import { ZoneLength } from "@/services/api";
import { useLanguage } from "@/contexts/LanguageContext";

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
}

const PaymentAttemptsSection: React.FC<PaymentAttemptsSectionProps> = ({
  address,
  colors,
}) => {
  const { t } = useLanguage();
  const [paymentData, setPaymentData] = useState<{
    proxy: Record<ZoneLength, boolean>;
    sbt: Record<ZoneLength, boolean>;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

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
          {zoneLengths.map((length) => (
            <div
              key={`${type}-${length}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "6px 4px",
                borderRadius: "4px",
                backgroundColor: colors.background,
                border: `1px solid ${colors.border}`,
                minHeight: "70px",
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

              {/* Статус (галочка/крест) */}
              {renderStatusBadge(data[length])}

              {/* Цена */}
              {renderPrice(prices[length])}
            </div>
          ))}
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

        {/* Общая статистика */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: `1px dashed ${colors.border}`,
            fontSize: "12px",
            color: colors.text,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span>{t("paymentAttemptsTotalPaid")}</span>
            <strong style={{ color: colors.cyberpunk }}>
              {Object.values(paymentData.proxy).filter((v) => v).length +
                Object.values(paymentData.sbt).filter((v) => v).length}
            </strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span>{t("paymentAttemptsProxyAttempts")}</span>
            <strong style={{ color: "#10B981" }}>
              {Object.values(paymentData.proxy).filter((v) => v).length}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("paymentAttemptsSbtAttempts")}</span>
            <strong style={{ color: "#3B82F6" }}>
              {Object.values(paymentData.sbt).filter((v) => v).length}
            </strong>
          </div>
        </div>

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
