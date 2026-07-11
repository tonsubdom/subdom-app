

import React from "react";
import { Link } from "@/components/Link/Link.tsx";
import { Page } from "@/components/Page";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {FormattedHeaderDescription} from "../IndexPage/acentHeaderFrases"



interface CardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText: string;
  to: string;
}

const IconWrapper: React.FC<{ children: React.ReactNode; bgColor: string; isDark: boolean }> = ({ 
  children, 
  bgColor, 
  isDark 
}) => (
  <div
    style={{
      width: 80,
      height: 80,
      borderRadius: 25,
      backgroundColor: bgColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: isDark 
        ? "0 4px 12px rgba(255, 215, 0, 0.3)"
        : "0 4px 12px rgba(59, 130, 246, 0.3)",
      border: isDark 
        ? "1px solid rgba(255, 215, 0, 0.2)"
        : "1px solid rgba(59, 130, 246, 0.2)",
    }}
  >
    {children}
  </div>
);

const Card: React.FC<CardProps & { isDark: boolean }> = ({ title, description, icon, actionText, to, isDark }) => {
  
  const colors = {
    light: {
      primary: "#3B82F6",
      accent: "#60A5FA",
      background: "#FFFFFF",
      text: "#1F2937",
      border: "#E5E7EB",
      shadow: "0 8px 25px rgba(0, 0, 0, 0.1)"
    },
    dark: {
      primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
      accent: "#FFED4A",
      background: "#1F2937",
      text: "#F9FAFB",
      border: "#374151",
      shadow: "0 8px 25px rgba(0, 0, 0, 0.3)"
    }
  };

  const theme = colors[isDark ? "dark" : "light"];

  return (
    <div
      style={{
        background: theme.background,
        borderRadius: "16px",
        padding: "24px",
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = isDark
          ? "0 12px 35px rgba(255, 215, 0, 0.2)"
          : "0 12px 35px rgba(59, 130, 246, 0.2)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = theme.shadow;
      }}
    >
      {/* Декоративный элемент */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "60px",
          height: "60px",
          background: isDark 
            ? "linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%)"
            : "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(96, 165, 250, 0.1) 100%)",
          borderRadius: "0 16px 0 60px",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
        {icon}
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {title}
        </h3>
      </div>

      <p
        style={{
          margin: "0 0 20px 0",
          color: theme.text,
          opacity: 0.8,
          fontSize: "14px",
          lineHeight: "1.5",
        }}
      >
        {description}
      </p>

      <Link to={to}>
        <button
          style={{
            width: "100%",
            padding: "12px 16px",
            background: theme.primary,
            color: isDark ? 'black' : "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = isDark
              ? "0 4px 12px rgba(255, 215, 0, 0.4)"
              : "0 4px 12px rgba(59, 130, 246, 0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {actionText}
        </button>
      </Link>
    </div>
  );
};

export const IndexPage: React.FC = () => {
  // Получаем тему из ThemeContext
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  
  // Получаем переводы из LanguageContext
  const { t } = useLanguage();

  // Создаем карточки с передачей isDark
  const createCards = (isDark: boolean): CardProps[] => [
    {
      title: t('addSubdomZone'),
      description: t('createCollection'),
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#000000ff"} isDark={isDark}>
          <p style={{
            color: 'white', 
            fontFamily: 'monospace', 
            fontSize: '16px', 
            fontWeight: '600'
          }}>
            .*.ton
          </p>
        </IconWrapper>
      ),
      actionText: t('add'),
      to: "/create-collection",
    },
    {
      title: t('createSubdomain'),
      description: t('addSubdomainToCollection'),
      icon: (
        <IconWrapper bgColor={isDark ? "#4B5563" : "#DBEAFE"} isDark={isDark}>
          <p style={{
            color: isDark ? 'white' : 'black', 
            fontFamily: 'monospace', 
            fontSize: '14px', 
            fontWeight: '600'
          }}>
            *.*.ton
          </p>
        </IconWrapper>
      ),
      actionText: t('create'),
      to: "/add-subdomain",
    },
    {
      title: t('manageDNSRecords'),
      description: t('linkWalletSiteStorage'),
      icon: (
        <IconWrapper bgColor={isDark ? "#374151" : "#FFFFFF"} isDark={isDark}>
          <div 
            style={{
              display:'flex', 
              flexDirection: 'column', 
              alignItems:'center', 
              width: '80px', 
              height: '80px', 
              border: `2px solid ${isDark ? '#FFD700' : 'black'}`, 
              borderRadius: '25px', 
              justifyContent: 'center'
            }}
          >
            <p style={{
              color: isDark ? '#FFD700' : 'black', 
              fontFamily: 'monospace', 
              fontSize: '14px', 
              fontWeight: '600', 
              margin: 0, 
              height:'20px'
            }}>
              LINKS
            </p>
          </div>
        </IconWrapper>
      ),
      actionText: t('manage'),
      to: "/manage",
    },
    {
      title: t('marketTitle'),
      description: t('marketSubtitle'),
      icon: (
        <IconWrapper bgColor={isDark ? "#065F46" : "#DCFCE7"} isDark={isDark}>
          {/* Логотип домик с долларом внутри */}
          <div style={{
            position: 'relative',
            width: '50px',
            height: '50px',
          }}>
            {/* Домик */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '10px',
              width: '30px',
              height: '20px',
              backgroundColor: isDark ? '#FFD700' : '#3B82F6',
              borderRadius: '4px 4px 0 0',
            }} />
            {/* Крыша */}
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              width: '40px',
              height: '15px',
              backgroundColor: isDark ? '#FFA500' : '#2563EB',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }} />
            {/* Доллар */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '22px',
              width: '6px',
              height: '20px',
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderRadius: '1px',
            }} />
            <div style={{
              position: 'absolute',
              top: '22px',
              left: '18px',
              width: '14px',
              height: '6px',
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderRadius: '3px',
            }} />
            <div style={{
              position: 'absolute',
              top: '32px',
              left: '18px',
              width: '14px',
              height: '6px',
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderRadius: '3px',
            }} />
          </div>
        </IconWrapper>
      ),
      actionText: t('open'),
      to: "/market",
    }
  ];

  const cards = createCards(isDark);
    // Получаем язык и функцию перевода
  const { language } = useLanguage();

  return (
    <Page back={false}>
      <div 
        className="bodyWrapperFlex"
        style={{
          maxWidth: '425px',
          margin: '0 auto',
          padding: '20px 16px 180px 16px',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h1 
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: isDark ? '#F9FAFB' : '#1F2937',
              margin: '0 0 8px 0',
              textAlign: 'center',
            }}
          >
            {t('subdomHeaderWelcome')}
          </h1>
          <FormattedHeaderDescription
        text={t('headerServiceDescription')}
        isDark={isDark}
        language={language}/>
        </div>

        <div 
          style={{
            display: 'grid',
            gap: '20px',
            gridTemplateColumns: '1fr',
          }}
        >
          {cards.map((card, index) => (
            <Card
              key={index}
              title={card.title}
              description={card.description}
              icon={card.icon}
              actionText={card.actionText}
              to={card.to}
              isDark={isDark}
            />
          ))}
        </div>
      </div>
    </Page>
  );
};