// /src/pages/CreateCollectionPage/TransactionSender.tsx
import React, { useState } from 'react';
import { useTonConnectUI } from "@tonconnect/ui-react";

interface TransactionData {
  validUntil: number;
  messages: Array<{
    address: string;
    amount: string;
    payload?: string;
    stateInit?: string;
  }>;
}

export const TransactionSender: React.FC = () => {
  const [transactionInput, setTransactionInput] = useState<string>('');
  const [tonConnectUI] = useTonConnectUI();
  const [error, setError] = useState<string | null>(null);

  const handleSendTransaction = async () => {
    try {
      // Парсим JSON из инпута
      const parsedTransaction: TransactionData = JSON.parse(transactionInput);

      // Отправляем транзакцию
      await tonConnectUI.sendTransaction({
        validUntil: parsedTransaction.validUntil,
        messages: parsedTransaction.messages
      });

      // Очищаем инпут и ошибки после успешной отправки
      setTransactionInput('');
      setError(null);
    } catch (err) {
      // Обработка ошибок
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      console.error(err);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '10px', 
      maxWidth: '600px', 
      margin: 'auto',
      background: 'black',
      color: 'white',
      padding: '20px 15px 20px 15px',
      borderRadius: '25px',
      marginBottom: '120px'
    }}>
      <h3>DEV SIMPLE MODE</h3>
      <p>Enter payload and send tx</p>
      <textarea 
        value={transactionInput}
        onChange={(e) => setTransactionInput(e.target.value)}
        placeholder='Вставьте JSON транзакции'
        rows={10}
        style={{ 
          width: '100%', 
          padding: '10px', 
          borderRadius: '8px' 
        }}
      />
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffeeee', 
          padding: '10px', 
          borderRadius: '8px' 
        }}>
          {error}
        </div>
      )}
      <button 
        onClick={handleSendTransaction}
        style={{ 
          padding: '10px', 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: 'pointer' 
        }}
      >
        Отправить транзакцию
      </button>
    </div>
  );
};