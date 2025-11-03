//\app\page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Youtube } from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import ChannelAnalysisTab from './components/ChannelAnalysisTab';
import MyChannelTab from './components/MyChannelTab';

export default function ChannelAnalyzer() {
  const [currentTab, setCurrentTab] = useState<'analyze' | 'myChannel'>('analyze');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 👇 이 부분 전체 추가
  useEffect(() => {
    // URL에서 auth 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('auth');

    // 로그인 성공했을 때
    if (authResult === 'success') {
      // localStorage에서 돌아갈 탭 확인
      const returnTab = localStorage.getItem('return_tab');
      if (returnTab === 'myChannel') {
        setCurrentTab('myChannel');
        localStorage.removeItem('return_tab'); // 사용 후 삭제
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Youtube Shorts Hacker</h1>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              ⚙️ API 키 설정
            </button>
          </div>

          {/* 탭 메뉴 */}
          <div className="flex gap-4 mt-4 border-b">
            <button
              onClick={() => setCurrentTab('analyze')}
              className={`px-4 py-2 font-medium transition-colors ${currentTab === 'analyze'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              타 채널 분석
            </button>
            <button
              onClick={() => setCurrentTab('myChannel')}
              className={`px-4 py-2 font-medium transition-colors ${currentTab === 'myChannel'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              내 채널 분석
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentTab === 'analyze' ? (
          <ChannelAnalysisTab />
        ) : (
          <MyChannelTab />
        )}
      </div>

      {/* API 키 설정 모달 */}
      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}