// src/components/ProtectedRoute/ProtectedRoute.tsx (исправленная версия)
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAlphaAccess } from '@/hooks/useAlphaAccess';
import ConnectWalletPrompt from '@/components/ConnectWalletPrompt/ConnectWalletPrompt';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/' 
}) => {
  const { hasAccess, status } = useAlphaAccess();

  // Отладка
  console.log('🔐 ProtectedRoute Debug:');
  console.log('- hasAccess:', hasAccess);
  console.log('- status:', status);
  console.log('- redirectTo:', redirectTo);

  // Если статус loading, показываем загрузку
  if (status === 'loading') {
    console.log('⏳ ProtectedRoute: Loading...');
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontFamily: 'monospace'
      }}>
        ⏳ Проверка доступа...
      </div>
    );
  }

  // Если статус disconnected, показываем сообщение о необходимости подключения
  if (status === 'disconnected') {
    console.log('🔌 ProtectedRoute: Wallet not connected');
    return <ConnectWalletPrompt />;
  }

  // Если нет доступа, перенаправляем на главную
  if (!hasAccess) {
    console.log('🔄 ProtectedRoute: Redirecting to', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // Если есть доступ, показываем детей
  console.log('✅ ProtectedRoute: Granting access');
  return <>{children}</>;
};

export default ProtectedRoute;