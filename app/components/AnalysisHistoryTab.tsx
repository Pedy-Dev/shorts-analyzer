// C:\Users\duawo\Desktop\shorts-analyzer\app\components\AnalysisHistoryTab.tsx
// 분석 기록 탭 - 타 채널 / 내 채널 서브탭 wrapper
'use client';

import { useState } from 'react';
import ExternalChannelHistoryTab from './ExternalChannelHistoryTab';
import OwnChannelHistoryTab from './OwnChannelHistoryTab';

interface AnalysisHistoryTabProps {
  isLoggedIn: boolean;
}

export default function AnalysisHistoryTab({ isLoggedIn }: AnalysisHistoryTabProps) {
  const [currentSubTab, setCurrentSubTab] = useState<'external' | 'own'>('external');

  // 로그인하지 않은 경우
  if (!isLoggedIn) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">분석 기록을 보려면 로그인이 필요합니다</p>
        <button
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          로그인하기
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">분석 기록</h2>
        <p className="text-gray-600">과거에 분석한 채널들의 기록을 확인할 수 있습니다</p>
      </div>

      {/* 서브탭 메뉴 */}
      <div className="flex gap-3 mb-6 border-b">
        <button
          onClick={() => setCurrentSubTab('external')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            currentSubTab === 'external'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔍 타 채널 기록
        </button>
        <button
          onClick={() => setCurrentSubTab('own')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            currentSubTab === 'own'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 내 채널 기록
        </button>
      </div>

      {/* 서브탭 컨텐츠 */}
      {currentSubTab === 'external' ? (
        <ExternalChannelHistoryTab isLoggedIn={isLoggedIn} />
      ) : (
        <OwnChannelHistoryTab isLoggedIn={isLoggedIn} />
      )}
    </div>
  );
}
