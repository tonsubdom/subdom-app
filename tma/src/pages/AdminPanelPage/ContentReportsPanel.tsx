// src/pages/AdminPanelPage/ContentReportsPanel.tsx
//
// Очередь жалоб на контент ("🚩 Скрыть контент" под паблик-уведомлениями о
// смене профиля/DNS-записей, см. tgBot-sqlite.ts handleContentReport) —
// показывает только домены, набравшие reportCount >= 5 (юзер прямо просил
// не шуметь единичными жалобами). Сам контент тут не редактируется — это
// просто список "на что жаловались", решение (модерация/деактивация зоны)
// принимается вручную владельцем площадки по месту (см. PendingActionsPanel
// для деактивации зоны).

import React, { useEffect, useState } from 'react';
import { apiService } from '@/services/api';

interface ContentReport {
  id: number;
  domain: string;
  reportCount: number;
  status: string;
  firstReportedAt: string;
  lastReportedAt: string | null;
  adminNotifiedAt: string | null;
}

interface ContentReportsPanelProps {
  isTestnet: boolean;
  currentTheme: string;
}

export const ContentReportsPanel: React.FC<ContentReportsPanelProps> = ({ currentTheme }) => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const isDark = currentTheme === 'dark';

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiService.getContentReports(5);
      setReports(result.success ? result.data || [] : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dismiss = async (report: ContentReport) => {
    setReviewingId(report.id);
    try {
      await apiService.reviewContentReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } finally {
      setReviewingId(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: '14px',
    borderRadius: '8px',
    background: isDark ? '#1F2937' : '#FFFFFF',
    border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
    marginBottom: '10px',
    fontSize: '13px',
    color: isDark ? '#F9FAFB' : '#1F2937',
  };

  const siteUrl = (domain: string) => `https://${domain}`;

  return (
    <div>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
            background: 'transparent',
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontSize: '12px',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Обновление...' : '🔄 Обновить'}
        </button>
        <span style={{ fontSize: '12px', color: isDark ? '#9CA3AF' : '#6B7280' }}>
          {reports.length === 0 ? 'Нет жалоб с 5+ репортами' : `Требуют внимания: ${reports.length}`}
        </span>
      </div>

      {reports.map((report) => (
        <div key={report.id} style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '10px' }}>
            <div>
              <strong>Домен:</strong>{' '}
              <a href={siteUrl(report.domain)} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#FFD700' : '#3B82F6' }}>
                {report.domain}
              </a>
            </div>
            <div><strong>🚩 Жалоб:</strong> {report.reportCount}</div>
            <div><strong>Первая жалоба:</strong> {new Date(report.firstReportedAt).toLocaleString('ru-RU')}</div>
            {report.lastReportedAt && (
              <div><strong>Последняя:</strong> {new Date(report.lastReportedAt).toLocaleString('ru-RU')}</div>
            )}
          </div>

          <button
            onClick={() => dismiss(report)}
            disabled={reviewingId === report.id}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: reviewingId === report.id ? '#6B7280' : '#4CAF50',
              color: 'white',
              fontWeight: 700,
              fontSize: '13px',
              cursor: reviewingId === report.id ? 'default' : 'pointer',
            }}
          >
            {reviewingId === report.id ? 'Сохранение...' : '✅ Разобрался, убрать из очереди'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default ContentReportsPanel;
