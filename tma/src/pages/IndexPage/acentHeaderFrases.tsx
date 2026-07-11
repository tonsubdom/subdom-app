

// src/pages/IndexPage/acentHeaderFrases.tsx

type Language = 'ru' | 'en' | 'zh' | 'ja' | 'hi' | 'ar' | 'es' | 'it' | 'de' | 'fr';

interface LanguagePhrases {
  goldBlue: string[];
  gradient: string[];
  normal: string[];
}

export const FormattedHeaderDescription = ({ 
  text, 
  isDark, 
  language = 'ru' 
}: { 
  text: string; 
  isDark: boolean; 
  language?: string;
}) => {
  // Определяем фразы для разных языков с явным типом
  const languagePhrases: Record<Language, LanguagePhrases> = {
    ru: {
      goldBlue: ['остаётесь владельцем', 'получаете прибыль'],
      gradient: ['Приобретаете возможности', 'создаёте активы', 'даёте создавать другим субдомены'],
      normal: ['раскрываете потенциал домена', '(proxy)']
    },
    en: {
      goldBlue: ['remain the owner', 'get profit'],
      gradient: ['Acquire capabilities', 'create assets', 'allow others to create subdomains'],
      normal: ['unlock domain potential', '(proxy)']
    },
    zh: {
      goldBlue: ['保持所有者身份', '获得利润'],
      gradient: ['获得能力', '创建资产', '允许他人在您的域名上创建子域名？'],
      normal: ['释放域名潜力', '(proxy)']
    },
    ja: {
      goldBlue: ['所有者のまま', '利益を得る'],
      gradient: ['能力を獲得', '資産を作成', '他の人にあなたのドメインでサブドメインを作成させますか？'],
      normal: ['ドメインの可能性を解放', '(proxy)']
    },
    hi: {
      goldBlue: ['मालिक बने रहें', 'लाभ प्राप्त करें'],
      gradient: ['क्षमताएं प्राप्त करें', 'संपत्ति बनाएं', 'दूसरों को अपने डोमेन पर सबडोमेन बनाने दें?'],
      normal: ['डोमेन क्षमता को अनलॉक करें', '(proxy)']
    },
    ar: {
      goldBlue: ['ابق المالك', 'احصل على الربح'],
      gradient: ['اكتسب القدرات', 'أنشئ الأصول', 'اسمح للآخرين بإنشاء نطاقات فرعية على نطاقك؟'],
      normal: ['أطلق إمكانات النطاق', '(proxy)']
    },
    es: {
      goldBlue: ['permanece como propietario', 'obtén ganancias'],
      gradient: ['Adquiere capacidades', 'crea activos', '¿permites a otros crear subdominios en tu dominio?'],
      normal: ['desbloquea el potencial del dominio', '(proxy)']
    },
    it: {
      goldBlue: ['rimani proprietario', 'ottieni profitto'],
      gradient: ['Acquisisci capacità', 'crea asset', 'permetti ad altri di creare sottodomini sul tuo dominio?'],
      normal: ['sblocca il potenziale del dominio', '(proxy)']
    },
    de: {
      goldBlue: ['bleiben Sie Eigentümer', 'erhalten Sie Gewinn'],
      gradient: ['Erwerben Sie Fähigkeiten', 'schaffen Sie Vermögenswerte', 'lassen Sie andere Subdomains auf Ihrer Domain erstellen?'],
      normal: ['entfesseln Sie das Domain-Potenzial', '(proxy)']
    },
    fr: {
      goldBlue: ['restez propriétaire', 'obtenez un profit'],
      gradient: ['Acquérez des capacités', 'créez des actifs', 'permettez à d\'autres de créer des sous-domaines sur votre domaine ?'],
      normal: ['débloque le potentiel du domaine', '(proxy)']
    }
  };

  // Получаем фразы для текущего языка, используем русский по умолчанию
  const phrases = languagePhrases[language as Language] || languagePhrases.ru;

  // Безопасная функция форматирования
  const formatText = () => {
    if (!phrases || !text) return text;
    
    let formattedText = text;
    
    // Заменяем золотые/синие фразы
    if (phrases.goldBlue && Array.isArray(phrases.goldBlue)) {
      phrases.goldBlue.forEach(phrase => {
        if (phrase && formattedText.includes(phrase)) {
          const color = isDark ? '#FFD700' : '#3B82F6';
          formattedText = formattedText.replace(
            phrase, 
            `<span style="color: ${color}; font-weight: 700;">${phrase}</span>`
          );
        }
      });
    }
    
    // Заменяем градиентные фразы
    if (phrases.gradient && Array.isArray(phrases.gradient)) {
      phrases.gradient.forEach(phrase => {
        if (phrase && formattedText.includes(phrase)) {
          const gradient = isDark 
          ? 'linear-gradient(90deg, #60A5FA, #38BDF8)' 
          : 'linear-gradient(90deg, #ba82ffff, #a2a2e2ff)';
          formattedText = formattedText.replace(
            phrase,
            `<span style="background: ${gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700;">${phrase}</span>`
          );
        }
      });
    }
    
    // Заменяем обычные фразы (белые/серые)
    if (phrases.normal && Array.isArray(phrases.normal)) {
      phrases.normal.forEach(phrase => {
        if (phrase && formattedText.includes(phrase)) {
          const color = isDark ? '#FFFFFF' : '#374151';
          formattedText = formattedText.replace(
            phrase,
            `<span style="color: ${color}; font-weight: 500;">${phrase}</span>`
          );
        }
      });
    }
    
    return formattedText;
  };

  return (
    <div 
      style={{
        fontSize: '16px',
        color: isDark ? '#D1D5DB' : '#6B7280',
        textAlign: 'center',
        margin: 0,
        lineHeight: '1.5',
      }}
      dangerouslySetInnerHTML={{ __html: formatText() }}
    />
  );
};

export default FormattedHeaderDescription;
