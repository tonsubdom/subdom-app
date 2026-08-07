// src/pages/AdminPanelPage/AdminPanelPage.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/services/api';
import { TransactionSender } from '@/pages/CreateCollectionPage/TransactionSender';
import { PendingActionsPanel } from './PendingActionsPanel';
import { encodeDomainForChain } from '@/utils/domainPunycode';


const renderUserDetails = (user: any, currentTheme: string) => {
  if (!user) return null;
  
  return (
    <div style={{ 
      padding: '10px',
      backgroundColor: currentTheme === 'dark' ? '#111827' : '#ECFDF5',
      borderRadius: '4px',
      marginTop: '10px'
    }}>
      <div style={{ fontSize: '12px', color: currentTheme === 'dark' ? '#9CA3AF' : '#059669', marginBottom: '5px' }}>
        Детали пользователя:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px', fontSize: '11px' }}>
        <div><strong>Адрес:</strong> {user.address}</div>
        <div><strong>Домены:</strong> {user.domains}</div>
        <div><strong>Зоны:</strong> {user.zones}</div>
        <div><strong>Субдомены:</strong> {user.subdomains}</div>
        <div><strong>Proxy зоны:</strong> {user.proxyZones || 0}</div>
        <div><strong>SBT зоны:</strong> {user.sbtZones || 0}</div>
        <div><strong>Proxy субдомены:</strong> {user.proxySubdomains || 0}</div>
        <div><strong>SBT субдомены:</strong> {user.sbtSubdomains || 0}</div>
        <div><strong>Траты на зоны:</strong> {user.totalZoneSpending || 0} TON</div>
        <div><strong>Траты на субдомены:</strong> {user.totalSubdomainSpending || 0} TON</div>
        <div><strong>Прибыль:</strong> {user.totalProfit || 0} TON</div>
      </div>
    </div>
  );
};

// Константа с начальными значениями для API методов
const INITIAL_API_INPUTS = { 
  // Пользователи 
  getUser: { address: '' }, getAllUsers: {}, createUser: { address: '', name: '' }, registerOrGetUser: { address: '', name: '' }, deleteUser: { id: '' }, // НОВЫЙ

// Зоны 
createZone: { name: '', address: '', collectionAddress: '', wrapperAddress: '', proxy: false, owner: '', status: 'active', zonePrice: 0 }, updateZoneStatusToInactive: { id: '' }, updateZoneCollection: { name: '', collectionAddress: '' }, updateZoneWrapper: { name: '', wrapperAddress: '' }, getUserZones: { address: '', isTestnet: false }, getAllZones: {}, getZoneByName: { name: '' }, getZoneById: { id: '' }, deleteZone: { id: '' }, updateZoneAddress: { id: '', address: '' }, updateZoneOwner: { id: '', owner: '' },

// Субдомены 
createSubdomain: { name: '', address: '', mintPrice: 0, links: '[]', zoneId: '', owner: '', status: 'active', auctionEndTime: '', collectionAddress: '' }, updateSubdomainStatus: { id: '', status: 'active' }, addBidToSubdomain: { id: '', bidder: '', amount: 0 }, getUserSubdomains: { address: '', isTestnet: false }, getZoneSubdomains: { zoneId: '' }, getAllSubdomains: {}, getSubdomainByName: { name: '' }, getSubdomainsByStatus: { status: 'active' }, deleteSubdomain: { id: '' }, updateSubdomainAddress: { id: '', address: '' }, updateSubdomainOwner: { id: '', ownerAddress: '' },

// Чаты 
getChat: { domain: '', userAddress: '' }, createChat: { domain: '', userAddress: '' }, sendMessage: { domain: '', text: '', sender: '', userAddress: '' }, deleteChat: { id: '' }, deleteMessage: { id: '' },

// Статистика 
getStats: {},

// Оплаченные попытки 
getUserPaymentAttempts: { address: '' }, addPaymentAttempt: { address: '', zoneType: 'proxy', length: 4 }, consumePaymentAttempt: { address: '', zoneType: 'proxy', length: 4 }, checkPaymentAttempt: { address: '', zoneType: 'proxy', length: 4 },

// Дополнительные 
checkDomainAvailability: { domain: '' }, getDNSRecords: { walletAddress: '' } };

// Тип для всех возможных методов API
type ApiMethod = keyof typeof INITIAL_API_INPUTS;

const AdminPanelPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const [isTestnet, setIsTestnet] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<Record<ApiMethod, any>>({} as Record<ApiMethod, any>);
  const [errors, setErrors] = useState<Record<ApiMethod, string>>({} as Record<ApiMethod, string>);

  // Состояния для каждого API метода с правильной типизацией
  const [apiInputs, setApiInputs] = useState(INITIAL_API_INPUTS);

  // Устанавливаем сеть в apiService
  useEffect(() => {
    apiService.setNetwork(isTestnet);
  }, [isTestnet]);

  // Обработчик изменения инпутов с правильной типизацией
  const handleInputChange = (method: ApiMethod, field: string, value: any) => {
    setApiInputs(prev => ({
      ...prev,
      [method]: {
        ...(prev[method] as any),
        [field]: value
      }
    }));
  };

  // Вызов API метода
  const callApiMethod = async (method: ApiMethod) => {
    setLoading(true);
    setErrors(prev => ({ ...prev, [method]: '' }));
    
    try {
      const inputs = apiInputs[method] as any;
      let result;
      
      switch (method) {
        // Пользователи
        case 'getUser':
          result = await apiService.getUser(inputs.address);
          break;
        case 'getAllUsers':
          result = await apiService.getAllUsers();
          break;
        case 'createUser':
          result = await apiService.createUser(inputs.address, inputs.name);
          break;
        case 'registerOrGetUser':
          result = await apiService.registerOrGetUser(inputs.address, inputs.name);
          break;
        case 'deleteUser': result = await apiService.deleteUser(parseInt(inputs.id)); break;
          
        
        // Зоны
        case 'createZone':
          result = await apiService.createZone({
            name: encodeDomainForChain(inputs.name),
            address: inputs.address,
            collectionAddress: inputs.collectionAddress || undefined,
            wrapperAddress: inputs.wrapperAddress || undefined,
            proxy: inputs.proxy,
            owner: inputs.owner || undefined,
            status: inputs.status,
            zonePrice: inputs.zonePrice
          });
          break;
        case 'updateZoneStatusToInactive':
          result = await apiService.updateZoneStatusToInactive(parseInt(inputs.id));
          break;

        case 'updateZoneAddress':
          result = await apiService.updateZoneAddress(parseInt(inputs.id), inputs.address);
          break;
        case 'updateZoneOwner':
          result = await apiService.updateZoneOwner(parseInt(inputs.id), inputs.owner);
          break;
        case 'updateZoneCollection':
          result = await apiService.updateZoneCollection(inputs.name, inputs.collectionAddress);
          break;
        case 'updateZoneWrapper':
          result = await apiService.updateZoneWrapper(inputs.name, inputs.wrapperAddress);
          break;
        case 'getUserZones':
          result = await apiService.getUserZones(inputs.address, inputs.isTestnet);
          break;
        case 'getAllZones':
          result = await apiService.getAllZones();
          break;
        case 'getZoneByName':
          result = await apiService.getZoneByName(inputs.name);
          break;
        case 'getZoneById':
          result = await apiService.getZoneById(parseInt(inputs.id));
          break;
        case 'deleteZone': // НОВЫЙ
          result = await apiService.deleteZone(parseInt(inputs.id));
          break;
        
        // Субдомены
        case 'createSubdomain':
          result = await apiService.createSubdomain({
            name: encodeDomainForChain(inputs.name),
            address: inputs.address,
            mintPrice: inputs.mintPrice,
            links: inputs.links ? JSON.parse(inputs.links) : undefined,
            zoneId: inputs.zoneId ? parseInt(inputs.zoneId) : undefined,
            owner: inputs.owner || undefined,
            status: inputs.status || 'active',
            auctionEndTime: inputs.auctionEndTime || undefined,
            collectionAddress: inputs.collectionAddress || undefined
          });
          break;
        case 'updateSubdomainStatus':
          result = await apiService.updateSubdomainStatus(parseInt(inputs.id), inputs.status);
          break;
        case 'addBidToSubdomain':
          result = await apiService.addBidToSubdomain(parseInt(inputs.id), {
            bidder: inputs.bidder,
            amount: inputs.amount
          });
          break;
        case 'updateSubdomainAddress':
          result = await apiService.updateSubdomainAddress(parseInt(inputs.id), inputs.address);
          break;
        case 'updateSubdomainOwner':
          result = await apiService.updateSubdomainOwner(parseInt(inputs.id), inputs.ownerAddress);
          break;
        case 'getUserSubdomains':
          result = await apiService.getUserSubdomains(inputs.address, inputs.isTestnet);
          break;
        case 'getZoneSubdomains':
          result = await apiService.getZoneSubdomains(parseInt(inputs.zoneId));
          break;
        case 'getAllSubdomains':
          result = await apiService.getAllSubdomains();
          break;
        case 'getSubdomainByName':
          result = await apiService.getSubdomainByName(inputs.name);
          break;
        case 'getSubdomainsByStatus':
          result = await apiService.getSubdomainsByStatus(inputs.status);
          break;
        case 'deleteSubdomain': // НОВЫЙ
          result = await apiService.deleteSubdomain(parseInt(inputs.id));
          break;
        
        // Чаты
        case 'getChat':
          result = await apiService.getChat(inputs.domain, inputs.userAddress);
          break;
        case 'createChat':
          result = await apiService.createChat(inputs.domain, inputs.userAddress);
          break;
        case 'sendMessage':
          result = await apiService.sendMessage(inputs.domain, {
            text: inputs.text,
            sender: inputs.sender,
            userAddress: inputs.userAddress
          });
          break;
        case 'deleteChat': result = await apiService.deleteChat(parseInt(inputs.id)); break;
        case 'deleteMessage': result = await apiService.deleteMessage(parseInt(inputs.id)); break;
        
        // Статистика
        case 'getStats':
          result = await apiService.getStats();
          break;
        
        // Оплаченные попытки
        case 'getUserPaymentAttempts':
          result = await apiService.getUserPaymentAttempts(inputs.address);
          break;
        case 'addPaymentAttempt':
          result = await apiService.addPaymentAttempt(
            inputs.address, 
            inputs.zoneType, 
            inputs.length
          );
          break;
        case 'consumePaymentAttempt':
          result = await apiService.consumePaymentAttempt(
            inputs.address, 
            inputs.zoneType, 
            inputs.length
          );
          break;
        case 'checkPaymentAttempt':
          result = await apiService.checkPaymentAttempt(
            inputs.address, 
            inputs.zoneType, 
            inputs.length
          );
          break;
        
        // Дополнительные
        case 'checkDomainAvailability':
          result = await apiService.checkDomainAvailability(inputs.domain);
          break;
        case 'getDNSRecords':
          result = await apiService.getDNSRecords(inputs.walletAddress);
          break;
        
        default:
          throw new Error(`Unknown method: ${String(method)}`);
      }
      
      setResults(prev => ({ ...prev, [method]: result }));
    } catch (error: any) {
      setErrors(prev => ({ 
        ...prev, 
        [method]: error.message || 'Unknown error' 
      }));
      console.error(`Error calling ${String(method)}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Рендер инпутов для метода
  const renderInputs = (method: ApiMethod) => {
    const inputs = apiInputs[method] as any;
    const fields = Object.keys(inputs);
    
    return fields.map(field => {
      const value = inputs[field];
      const isBoolean = typeof value === 'boolean';
      const isNumber = typeof value === 'number';
      
      // Специальная обработка для select полей
      if (field === 'zoneType') {
        return (
          <div key={field} style={{ marginBottom: '8px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#D1D5DB' : '#4B5563'
            }}>
              {field}:
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(method, field, e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            >
              <option value="proxy">proxy</option>
              <option value="sbt">sbt</option>
            </select>
          </div>
        );
      }
      
      // Специальная обработка для длины (4-9)
      if (field === 'length') {
        return (
          <div key={field} style={{ marginBottom: '8px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#D1D5DB' : '#4B5563'
            }}>
              {field} (4-9):
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(method, field, parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            >
              {[4, 5, 6, 7, 8, 9].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        );
      }
      
      return (
        <div key={field} style={{ marginBottom: '8px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '4px',
            fontSize: '12px',
            color: currentTheme === 'dark' ? '#D1D5DB' : '#4B5563'
          }}>
            {field}:
          </label>
          
          {isBoolean ? (
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleInputChange(method, field, e.target.checked)}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            />
          ) : isNumber ? (
            <input
              type="number"
              value={value}
              onChange={(e) => handleInputChange(method, field, parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(method, field, e.target.value)}
              placeholder={`Enter ${field}`}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            />
          )}
        </div>
      );
    });
  };

  // Рендер секции API
  const renderApiSection = (title: string, methods: ApiMethod[]) => {
    return (
      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: currentTheme === 'dark' ? '#1F2937' : '#F3F4F6',
        borderRadius: '8px'
      }}>
        <h3 style={{ 
          margin: '0 0 15px 0',
          color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937',
          borderBottom: `2px solid ${currentTheme === 'dark' ? '#FFD700' : '#3B82F6'}`,
          paddingBottom: '5px'
        }}>
          {title}
        </h3>
        
        {methods.map(method => (
          <div key={String(method)} style={{ 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: currentTheme === 'dark' ? '#374151' : '#FFFFFF',
            borderRadius: '6px',
            border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#E5E7EB'}`
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h4 style={{ 
                margin: 0,
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937',
                fontFamily: 'monospace'
              }}>
                {String(method)}
              </h4>
              
              <button
                onClick={() => callApiMethod(method)}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: currentTheme === 'dark' ? '#FFD700' : '#3B82F6',
                  color: currentTheme === 'dark' ? '#000' : '#FFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              >
                {loading ? 'Loading...' : 'Call API'}
              </button>
            </div>
            
            {/* Inputs */}
            <div style={{ marginBottom: '10px' }}>
              {renderInputs(method)}
            </div>
            
            {/* Error */}
            {errors[method] && (
              <div style={{ 
                padding: '8px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                borderRadius: '4px',
                marginBottom: '10px',
                fontSize: '12px'
              }}>
                ❌ Error: {errors[method]}
              </div>
            )}
            
            {/* Result */}
            {results[method] && (
  <div style={{ 
    padding: '10px',
    backgroundColor: currentTheme === 'dark' ? '#111827' : '#ECFDF5',
    borderRadius: '4px',
    border: `1px solid ${currentTheme === 'dark' ? '#374151' : '#A7F3D0'}`,
    maxHeight: '400px', // Увеличили высоту
    overflow: 'auto'
  }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      marginBottom: '5px'
    }}>
      <span style={{ 
        fontSize: '12px',
        color: currentTheme === 'dark' ? '#9CA3AF' : '#059669'
      }}>
        Result:
      </span>
      <button
        onClick={() => {
          const text = JSON.stringify(results[method], null, 2);
          navigator.clipboard.writeText(text);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: currentTheme === 'dark' ? '#9CA3AF' : '#059669',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        📋 Copy
      </button>
    </div>
    <pre style={{ 
      margin: 0,
      fontSize: '11px',
      color: currentTheme === 'dark' ? '#D1D5DB' : '#065F46',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap'
    }}>
      {JSON.stringify(results[method], null, 2)}
    </pre>
    
    {/* ДОБАВЬТЕ ЭТОТ БЛОК ДЛЯ ОТОБРАЖЕНИЯ ДЕТАЛЕЙ ПОЛЬЗОВАТЕЛЯ */}
    {method === 'getUser' && renderUserDetails(results[method], currentTheme)}
  </div>
)}

          </div>
        ))}
      </div>
    );
  };

  // Компонент для управления оплаченными попытками
  const PaymentAttemptsManager = () => {
    const [address, setAddress] = useState('');
    const [zoneType, setZoneType] = useState<'proxy' | 'sbt'>('proxy');
    const [length, setLength] = useState<4 | 5 | 6 | 7 | 8 | 9>(4);
    const [paymentResult, setPaymentResult] = useState<any>(null);
    const [paymentError, setPaymentError] = useState<string>('');
    const [paymentLoading, setPaymentLoading] = useState(false);

    const handlePaymentAction = async (action: 'add' | 'consume' | 'check' | 'getAll') => {
      setPaymentLoading(true);
      setPaymentError('');
      setPaymentResult(null);

      try {
        let result;
        switch (action) {
          case 'add':
            result = await apiService.addPaymentAttempt(address, zoneType, length);
            break;
          case 'consume':
            result = await apiService.consumePaymentAttempt(address, zoneType, length);
            break;
          case 'check':
            result = await apiService.checkPaymentAttempt(address, zoneType, length);
            break;
          case 'getAll':
            result = await apiService.getUserPaymentAttempts(address);
            break;
        }
        
        if (result.success) {
          setPaymentResult(result);
        } else {
          setPaymentError(result.message || 'Unknown error');
        }
      } catch (error: any) {
        setPaymentError(error.message || 'Unknown error');
      } finally {
        setPaymentLoading(false);
      }
    };

    return (
      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: currentTheme === 'dark' ? '#1F2937' : '#F3F4F6',
        borderRadius: '8px'
      }}>
        <h3 style={{ 
          margin: '0 0 15px 0',
          color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937',
          borderBottom: `2px solid ${currentTheme === 'dark' ? '#FFD700' : '#3B82F6'}`,
          paddingBottom: '5px'
        }}>
          💰 Управление оплаченными попытками
        </h3>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#D1D5DB' : '#4B5563'
            }}>
              Адрес пользователя:
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Введите адрес"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#D1D5DB' : '#4B5563'
            }}>
              Тип зоны:
            </label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value as 'proxy' | 'sbt')}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            >
              <option value="proxy">Proxy</option>
              <option value="sbt">SBT</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px',
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#D1D5DB' : '#4B5563'
            }}>
              Длина (4-9 символов):
            </label>
            <select
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value) as any)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: currentTheme === 'dark' ? '#374151' : '#F9FAFB',
                color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
              }}
            >
              {[4, 5, 6, 7, 8, 9].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => handlePaymentAction('getAll')}
              disabled={paymentLoading || !address}
              style={{
                padding: '8px 16px',
                backgroundColor: currentTheme === 'dark' ? '#4B5563' : '#6B7280',
                color: '#FFF',
                border: 'none',
                borderRadius: '4px',
                cursor: paymentLoading ? 'not-allowed' : 'pointer',
                opacity: (paymentLoading || !address) ? 0.6 : 1,
                width: '100%'
              }}
            >
              {paymentLoading ? 'Загрузка...' : 'Получить все попытки'}
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => handlePaymentAction('add')}
            disabled={paymentLoading || !address}
            style={{
              padding: '10px',
              backgroundColor: '#10B981',
              color: '#FFF',
              border: 'none',
              borderRadius: '4px',
              cursor: paymentLoading ? 'not-allowed' : 'pointer',
              opacity: (paymentLoading || !address) ? 0.6 : 1
            }}
          >
            ➕ Добавить попытку
          </button>

          <button
            onClick={() => handlePaymentAction('consume')}
            disabled={paymentLoading || !address}
            style={{
              padding: '10px',
              backgroundColor: '#F59E0B',
              color: '#FFF',
              border: 'none',
              borderRadius: '4px',
              cursor: paymentLoading ? 'not-allowed' : 'pointer',
              opacity: (paymentLoading || !address) ? 0.6 : 1
            }}
          >
            ➖ Списать попытку
          </button>

          <button
            onClick={() => handlePaymentAction('check')}
            disabled={paymentLoading || !address}
            style={{
              padding: '10px',
              backgroundColor: '#3B82F6',
              color: '#FFF',
              border: 'none',
              borderRadius: '4px',
              cursor: paymentLoading ? 'not-allowed' : 'pointer',
              opacity: (paymentLoading || !address) ? 0.6 : 1
            }}
          >
            🔍 Проверить попытку
          </button>

          <button
            onClick={() => {
              setAddress('');
              setZoneType('proxy');
              setLength(4);
              setPaymentResult(null);
              setPaymentError('');
            }}
            style={{
              padding: '10px',
              backgroundColor: '#EF4444',
              color: '#FFF',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Очистить
          </button>
        </div>

        {/* Результат */}
        {paymentError && (
          <div style={{ 
            padding: '12px',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            ❌ Ошибка: {paymentError}
          </div>
        )}

        {paymentResult && (
          <div style={{ 
            padding: '15px',
            backgroundColor: currentTheme === 'dark' ? '#111827' : '#ECFDF5',
            borderRadius: '4px',
            border: `1px solid ${currentTheme === 'dark' ? '#374151' : '#A7F3D0'}`
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span style={{ 
                fontSize: '14px',
                color: currentTheme === 'dark' ? '#9CA3AF' : '#059669',
                fontWeight: '600'
              }}>
                Результат:
              </span>
              <button
                onClick={() => {
                  const text = JSON.stringify(paymentResult, null, 2);
                  navigator.clipboard.writeText(text);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme === 'dark' ? '#9CA3AF' : '#059669',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                📋 Copy
              </button>
            </div>
            <pre style={{ 
              margin: 0,
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#D1D5DB' : '#065F46',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {JSON.stringify(paymentResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '20px',
      minHeight: '100vh',
      backgroundColor: currentTheme === 'dark' ? '#111827' : '#F9FAFB'
    }}>
      {/* Заголовок */}
      <div style={{ 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          margin: '0 0 10px 0',
          color: currentTheme === 'dark' ? '#FFD700' : '#3B82F6',
          fontFamily: 'monospace'
        }}>
          🔧 ADMIN PANEL
        </h1>
        <p style={{ 
          margin: 0,
          color: currentTheme === 'dark' ? '#9CA3AF' : '#6B7280',
          fontSize: '14px'
        }}>
          Database & Blockchain Debug Tools
        </p>
      </div>

      {/* Переключатель сети */}
      <div style={{ 
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: currentTheme === 'dark' ? '#1F2937' : '#FFFFFF',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: `1px solid ${currentTheme === 'dark' ? '#374151' : '#E5E7EB'}`
      }}>
        <div>
          <span style={{ 
            color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937',
            fontWeight: '600'
          }}>
            Network:
          </span>
          <span style={{ 
            marginLeft: '10px',
            color: isTestnet ? '#F59E0B' : '#10B981',
            fontFamily: 'monospace'
          }}>
            {isTestnet ? 'TESTNET' : 'MAINNET'}
          </span>
        </div>
        
        <label style={{ 
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }}>
          <div style={{ 
            position: 'relative',
            width: '50px',
            height: '24px',
            backgroundColor: isTestnet ? '#F59E0B' : '#10B981',
            borderRadius: '12px',
            marginRight: '10px',
            transition: 'background-color 0.3s'
          }}>
            <div style={{ 
              position: 'absolute',
              top: '2px',
              left: isTestnet ? '28px' : '2px',
              width: '20px',
              height: '20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '50%',
              transition: 'left 0.3s'
            }} />
          </div>
          <input
            type="checkbox"
            checked={isTestnet}
            onChange={(e) => setIsTestnet(e.target.checked)}
            style={{ display: 'none' }}
          />
          <span style={{ 
            color: currentTheme === 'dark' ? '#D1D5DB' : '#4B5563',
            fontSize: '14px'
          }}>
            Testnet Mode
          </span>
        </label>
      </div>

      {/* Часть 0: Заявки на действия площадки (деактивация и т.п.) */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{
          margin: '0 0 20px 0',
          color: currentTheme === 'dark' ? '#FFD700' : '#3B82F6',
          borderBottom: `3px solid ${currentTheme === 'dark' ? '#FFD700' : '#3B82F6'}`,
          paddingBottom: '10px',
          fontFamily: 'monospace'
        }}>
          ⏳ PENDING PLATFORM ACTIONS
        </h2>

        <PendingActionsPanel isTestnet={isTestnet} currentTheme={currentTheme} />
      </div>

      {/* Часть 1: Управление оплаченными попытками */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0',
          color: currentTheme === 'dark' ? '#FFD700' : '#3B82F6',
          borderBottom: `3px solid ${currentTheme === 'dark' ? '#FFD700' : '#3B82F6'}`,
          paddingBottom: '10px',
          fontFamily: 'monospace'
        }}>
          💰 PAYMENT ATTEMPTS MANAGEMENT
        </h2>
        
        <PaymentAttemptsManager />
      </div>

      {/* Часть 2: Отладка БД */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0',
          color: currentTheme === 'dark' ? '#FFD700' : '#3B82F6',
          borderBottom: `3px solid ${currentTheme === 'dark' ? '#FFD700' : '#3B82F6'}`,
          paddingBottom: '10px',
          fontFamily: 'monospace'
        }}>
          🗄️ DATABASE DEBUG
        </h2>
        
        {/* Пользователи */}
        {renderApiSection('Users', ['getUser', 'getAllUsers', 'createUser', 'registerOrGetUser', 'deleteUser'])}
        
        {/* Зоны */}
        {renderApiSection('Zones', [
          'createZone', 
          'updateZoneStatusToInactive', 
          'updateZoneAddress',
          'updateZoneCollection', 
          'updateZoneWrapper',
          'getUserZones',
          'getAllZones',
          'getZoneByName',
          'getZoneById',
          'deleteZone', // НОВЫЙ
          'updateZoneOwner' // НОВЫЙ — ручная правка владельца зоны до готовности смартконтракта офферов
        ])}
        
        {/* Субдомены */}
        {renderApiSection('Subdomains', [
                    'createSubdomain',
          'updateSubdomainStatus',
          'addBidToSubdomain',
          'updateSubdomainAddress',
          'updateSubdomainOwner',
          'getUserSubdomains',
          'getZoneSubdomains',
          'getAllSubdomains',
          'getSubdomainByName',
          'getSubdomainsByStatus',
          'deleteSubdomain' // НОВЫЙ
        ])}
        
        {/* Чаты */}
        {renderApiSection('Chats', ['getChat', 'createChat', 'sendMessage', 'deleteChat', 'deleteMessage'])}
        
        {/* Статистика */}
        {renderApiSection('Statistics', ['getStats'])}
        
        {/* Дополнительные */}
        {renderApiSection('Additional', ['checkDomainAvailability', 'getDNSRecords'])}
      </div>

      {/* Часть 3: Отладка блокчейна */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          margin: '0 0 20px 0',
          color: currentTheme === 'dark' ? '#FFD700' : '#3B82F6',
          borderBottom: `3px solid ${currentTheme === 'dark' ? '#FFD700' : '#3B82F6'}`,
          paddingBottom: '10px',
          fontFamily: 'monospace'
        }}>
          ⛓️ BLOCKCHAIN DEBUG
        </h2>
        
        <div style={{ 
          padding: '20px',
          backgroundColor: currentTheme === 'dark' ? '#1F2937' : '#F3F4F6',
          borderRadius: '8px'
        }}>
          <TransactionSender />
        </div>
      </div>

      {/* Информация о текущем состоянии */}
      <div style={{ 
        padding: '20px',
        backgroundColor: currentTheme === 'dark' ? '#1F2937' : '#F3F4F6',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          margin: '0 0 15px 0',
          color: currentTheme === 'dark' ? '#F9FAFB' : '#1F2937'
        }}>
          📊 Статус системы
        </h3>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div style={{ 
            padding: '15px',
            backgroundColor: currentTheme === 'dark' ? '#374151' : '#FFFFFF',
            borderRadius: '6px',
            border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#E5E7EB'}`
          }}>
            <div style={{ 
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#9CA3AF' : '#6B7280',
              marginBottom: '5px'
            }}>
              Сеть
            </div>
            <div style={{ 
              fontSize: '16px',
              color: isTestnet ? '#F59E0B' : '#10B981',
              fontWeight: '600',
              fontFamily: 'monospace'
            }}>
              {isTestnet ? 'TESTNET' : 'MAINNET'}
            </div>
          </div>
          
          {/* <div style={{ 
            padding: '15px',
            backgroundColor: currentTheme === 'dark' ? '#374151' : '#FFFFFF',
            borderRadius: '6px',
            border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#E5E7EB'}`
          }}>
            <div style={{ 
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#9CA3AF' : '#6B7280',
              marginBottom: '5px'
            }}>
              Базовая URL
            </div>
            <div style={{ 
              fontSize: '14px',
              color: currentTheme === 'dark' ? '#D1D5DB' : '#1F2937',
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {apiService.baseUrl}
            </div>
          </div> */}
          
          <div style={{ 
            padding: '15px',
            backgroundColor: currentTheme === 'dark' ? '#374151' : '#FFFFFF',
            borderRadius: '6px',
            border: `1px solid ${currentTheme === 'dark' ? '#4B5563' : '#E5E7EB'}`
          }}>
            <div style={{ 
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#9CA3AF' : '#6B7280',
              marginBottom: '5px'
            }}>
              Статус API
            </div>
            <div style={{ 
              fontSize: '16px',
              color: '#10B981',
              fontWeight: '600'
            }}>
              ✅ Активен
            </div>
          </div>
        </div>
      </div>

      {/* Инструкция */}
      <div style={{ 
        padding: '15px',
        backgroundColor: currentTheme === 'dark' ? '#1F2937' : '#F3F4F6',
        borderRadius: '8px',
        fontSize: '12px',
        color: currentTheme === 'dark' ? '#9CA3AF' : '#6B7280'
      }}>
        <strong>ℹ️ Инструкция:</strong>
        <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
          <li>Используйте <strong>Payment Attempts Management</strong> для управления оплаченными попытками пользователей</li>
          <li>Используйте <strong>Database Debug</strong> для тестирования всех API эндпоинтов</li>
          <li>Используйте <strong>Blockchain Debug</strong> для отправки транзакций в блокчейн</li>
          <li>Новые методы <strong>deleteZone</strong> и <strong>deleteSubdomain</strong> позволяют удалять записи из базы данных</li>
          <li>Все результаты копируются в буфер обмена по нажатию на кнопку 📋 Copy</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanelPage;