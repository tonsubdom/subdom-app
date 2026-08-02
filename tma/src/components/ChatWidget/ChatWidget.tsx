// src/components/ChatWidget/ChatWidget.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { apiService } from '@/services/api';
import ConnectWalletPrompt from '@/components/ConnectWalletPrompt/ConnectWalletPrompt';

interface Message {
  id: string;
  sender: 'user' | 'operator';
  text: string;
  timestamp: string;
  temp?: boolean;
  tempId?: string;
}

interface ChatState {
  messages: Message[];
}

interface UIState {
  chatWidget: {
    open: boolean;
    orderId: string | null;
  };
}

interface RootState {
  chat: ChatState;
  ui: UIState;
}

const ChatWidget: React.FC = () => {
  const dispatch = useDispatch();
  const address = useTonAddress();
  const wallet = useTonWallet();
  const isTestnet = wallet?.account?.chain === "-3";
  
  // Получаем тему из ThemeContext
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  // Получаем язык и переводы
  const { t } = useLanguage();

  // Используем хук пользователя
  const { user } = useUser();

  const uiChat = useSelector((state: RootState) => state.ui?.chatWidget || { open: false, orderId: null });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [currentDomain, setCurrentDomain] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);
  const uiTriggeredOpenRef = useRef<boolean>(false);

  // Цвета для темы - синие в светлой, золотые в темной
  const themeColors = {
    light: {
      primary: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
      accent: "#3B82F6",
      background: "#FFFFFF",
      text: "#1F2937",
      border: "#E5E7EB",
      secondaryBg: "#F9FAFB",
      shadow: "rgba(59, 130, 246, 0.4)",
      cyberpunk: "#3B82F6"
    },
    dark: {
      primary: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
      accent: "#FFD700",
      background: "#121212",
      text: "#E5E5E5",
      border: "#333333",
      secondaryBg: "#1A1A1A",
      shadow: "rgba(255, 215, 0, 0.4)",
      cyberpunk: "#FFD700"
    }
  };

  const colors = themeColors[isDark ? "dark" : "light"];

  // Получаем текущий домен из URL или используем дефолтный
  useEffect(() => {
    const domain = window.location.hostname || 'subdom.zone';
    setCurrentDomain(domain);
  }, []);

  // Устанавливаем сеть в apiService при изменении isTestnet
  useEffect(() => {
    apiService.setNetwork(isTestnet);
  }, [isTestnet]);

  // Получаем идентификатор чата из user.address или адреса кошелька
  const getChatIdentifier = useCallback(() => {
    return user?.address || address || 'default-domain';
  }, [user, address]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Функция для загрузки чата из бэкенда через apiService
  const loadChatFromBackend = useCallback(async () => {
    if (!address || !currentDomain) return;
    
    try {
      const chatIdentifier = getChatIdentifier();
      const chat = await apiService.getChat(chatIdentifier, address);
      
      if (chat && chat.messages) {
        setChatMessages(chat.messages as Message[]);
        lastMessageCountRef.current = chat.messages.length;
      }
    } catch (error) {
      console.error(t('error') + ' загрузки чата:', error);
      
      // Если чата нет, пытаемся создать его
      try {
        const chatIdentifier = getChatIdentifier();
        await apiService.createChat(chatIdentifier, address);
        // После создания загружаем снова
        await loadChatFromBackend();
      } catch (createError) {
        console.error(t('error') + ' создания чата:', createError);
      }
    }
  }, [address, currentDomain, getChatIdentifier, t]);

  // Функция для отправки сообщения в бэкенд через apiService
  const sendMessageToBackend = useCallback(async (messageText: string) => {
    if (!address || !currentDomain) return null;
    
    try {
      const chatIdentifier = getChatIdentifier();
      const chat = await apiService.sendMessage(chatIdentifier, {
        text: messageText,
        sender: 'user',
        userAddress: address,
      });
      
      return chat;
    } catch (error) {
      console.error(t('error') + ' отправки сообщения:', error);
      return null;
    }
  }, [address, currentDomain, getChatIdentifier, t]);

  const pollChatAndOrderLocal = useCallback(async () => {
    if (!address || !currentDomain) return;
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    
    try {
      await loadChatFromBackend();
    } catch (err) {
      console.warn("Polling error:", err);
    } finally {
      isPollingRef.current = false;
    }
  }, [address, currentDomain, loadChatFromBackend]);

  useEffect(() => {
    if (!isOpen || !address || !currentDomain) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    loadChatFromBackend();
    pollChatAndOrderLocal();
    pollingIntervalRef.current = setInterval(
      () => pollChatAndOrderLocal(),
      5000 // Опрашиваем каждые 5 секунд
    );

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, address, currentDomain, pollChatAndOrderLocal, loadChatFromBackend]);

  useEffect(() => {
    lastMessageCountRef.current = chatMessages.length;
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && address && currentDomain) loadChatFromBackend();
  }, [isOpen, address, currentDomain, loadChatFromBackend]);

  useEffect(() => {
    if (uiChat && uiChat.open) {
      uiTriggeredOpenRef.current = true;
      setIsOpen(true);
      if (uiChat.orderId) {
        lastMessageCountRef.current = 0;
      }
    } else {
      if (uiTriggeredOpenRef.current) {
        uiTriggeredOpenRef.current = false;
        closeWidgetInternal();
      }
    }
  }, [uiChat.open, uiChat.orderId, dispatch]);

  const closeWidgetInternal = () => {
    setIsOpen(false);
    setInputValue("");
    setError(null);
    lastMessageCountRef.current = 0;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !address || !currentDomain) return;
    const messageText = inputValue.trim();

    const tempId = `tmp-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticMessage: Message = {
      id: tempId,
      sender: "user",
      text: messageText,
      timestamp: new Date().toISOString(),
      temp: true,
    };

    // Оптимистичное обновление UI
    setChatMessages(prev => [...prev, optimisticMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      // Отправляем сообщение в бэкенд через apiService
      const result = await sendMessageToBackend(messageText);
      
      if (result) {
        // Заменяем временное сообщение на реальное
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === tempId 
              ? result.messages![result.messages!.length - 1] as Message
              : msg
          )
        );
      } else {
        // Если ошибка, удаляем временное сообщение
        setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
        setError(t('messageSendError'));
      }
      
      // Обновляем чат через секунду
      setTimeout(() => pollChatAndOrderLocal(), 1000);
    } catch (err) {
      console.error("❌ " + t('error') + " отправки:", err);
      setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
      setError(`${t('error')}: ${err instanceof Error ? err.message : t('unknownError')}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Стили кнопок
  const buttonStyle = {
    background: colors.primary,
    color: isDark ? '#000' : '#fff',
    border: 'none',
    outline: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: `0 0 12px ${colors.shadow}`,
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative' as const,
    // overflow: 'hidden'
  };

  const inputStyle = {
    padding: "10px 12px",
    border: `2px solid ${colors.border}`,
    borderRadius: "6px",
    fontSize: "13px",
    fontFamily: "monospace",
    outline: "none",
    transition: "border-color 0.2s",
    background: colors.background,
    color: colors.text,
    letterSpacing: '0.5px',
    width: "-webkit-fill-available"
  };

  // Форматирование адреса для отображения
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      {/* Floating button */}
      <div
        onClick={() => {
          setIsOpen(true);
        }}
        style={{
          position: "fixed",
          bottom: "80px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: colors.primary,
          boxShadow: `0 4px 12px ${colors.shadow}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          transition: "all 0.3s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = `0 6px 20px ${colors.shadow}`;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDark ? "black" : "white"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "160px",
            right: "15px",
            left: "auto",
            width: "min(400px, calc(100% - 30px))",
            maxHeight: "600px",
            backgroundColor: colors.background,
            borderRadius: "12px",
            boxShadow: "0 5px 40px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            zIndex: 999,
            animation: "slideUp 0.3s ease",
            border: `1px solid ${colors.border}`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: `1px solid ${colors.border}`,
              background: colors.primary,
              borderRadius: "12px 12px 0 0",
              color: isDark ? "black" : "white",
            }}
          >
            <div>
              <h3 style={{ 
                margin: "0 0 4px 0", 
                fontSize: "16px",
                fontFamily: 'monospace'
              }}>
                💬 {t('support')}
              </h3>
              <p style={{ 
                margin: 0, 
                fontSize: "12px", 
                opacity: 0.9,
                fontFamily: 'monospace'
              }}>
                {address
                  ? `${t('chatUser')} ${formatAddress(address)} • ${isTestnet ? 'Testnet' : 'Mainnet'}`
                  : t('connectToChat')}
              </p>
            </div>
            <button
              onClick={() => closeWidgetInternal()}
              style={{
                background: "none",
                border: "none",
                color: isDark ? "black" : "white",
                fontSize: "24px",
                cursor: "pointer",
                padding: "0",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {!wallet ? (
            <div style={{ backgroundColor: colors.secondaryBg }}>
              <ConnectWalletPrompt subtitle={t('connectToChat')} />
            </div>
          ) : (
            <>
              {/* Messages area */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  backgroundColor: colors.secondaryBg,
                  minHeight: "200px",
                }}
              >
                {error && (
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#ffe5e5",
                      color: "#d32f2f",
                      borderRadius: "8px",
                      fontSize: "13px",
                      border: "1px solid #ffcdd2",
                      textAlign: "center",
                      fontFamily: 'monospace'
                    }}
                  >
                    ⚠️ {error}
                  </div>
                )}

                {chatMessages.length === 0 && !error && (
                  <div
                    style={{
                      textAlign: "center",
                      color: colors.text,
                      fontSize: "14px",
                      marginTop: "20px",
                      opacity: 0.7,
                      fontFamily: 'monospace'
                    }}
                  >
                    {t('noMessagesFirst')} 👋
                    <p style={{ fontSize: "12px", marginTop: "8px" }}>
                      Напишите первое сообщение!
                    </p>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        msg.sender === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        backgroundColor:
                          msg.sender === "user" ? colors.cyberpunk : colors.background,
                        color: msg.sender === "user" ? (isDark ? "#000" : "#fff") : colors.text,
                        wordWrap: "break-word",
                        fontSize: "14px",
                        lineHeight: "1.4",
                        border:
                          msg.sender === "user" ? "none" : `1px solid ${colors.border}`,
                        fontFamily: 'monospace',
                        opacity: msg.temp ? 0.7 : 1,
                      }}
                    >
                      {msg.text}
                      <div style={{
                        fontSize: "10px",
                        opacity: 0.6,
                        marginTop: "4px",
                        textAlign: "right",
                      }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div
                style={{
                  padding: "12px",
                  borderTop: `1px solid ${colors.border}`,
                  display: "flex",
                  gap: "8px",
                  backgroundColor: colors.background,
                  borderRadius: "0 0 12px 12px",
                  justifyContent: 'flex-end'
                }}
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('writeMessage')}
                  disabled={isLoading}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = colors.cyberpunk)}
                  onBlur={(e) => (e.target.style.borderColor = colors.border)}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  style={{
                    ...buttonStyle,
                    backgroundColor:
                      isLoading || !inputValue.trim() ? colors.border : colors.cyberpunk,
                    cursor:
                      isLoading || !inputValue.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading && inputValue.trim()) {
                      e.currentTarget.style.boxShadow = `0 0 16px ${colors.shadow}`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isLoading && inputValue.trim()) {
                      e.currentTarget.style.boxShadow = `0 0 12px ${colors.shadow}`;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isLoading ? "..." : t('send')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default ChatWidget;