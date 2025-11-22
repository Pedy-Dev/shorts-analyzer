// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Youtube, CircleHelp } from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import ServiceGuideModal from './components/ServiceGuideModal';
import ChannelAnalysisTab from './components/ChannelAnalysisTab';
import MyChannelTab from './components/MyChannelTab';
import AnalysisHistoryTab from './components/AnalysisHistoryTab';
import UserMenu from './components/UserMenu';
import Footer from './components/Footer'; 

export default function ChannelAnalyzer() {
  const [currentTab, setCurrentTab] = useState<'analyze' | 'myChannel' | 'history' | null>(null);
  const [isTabInitialized, setIsTabInitialized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceGuideOpen, setIsServiceGuideOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 탭 변경 시 localStorage에 저장하는 핸들러
  const handleTabChange = (tab: 'analyze' | 'myChannel' | 'history') => {
    setCurrentTab(tab);
    localStorage.setItem('currentTab', tab);
  };

  useEffect(() => {
    // localStorage에서 저장된 탭 먼저 복원
    const savedTab = localStorage.getItem('currentTab');
    if (savedTab === 'analyze' || savedTab === 'myChannel' || savedTab === 'history') {
      setCurrentTab(savedTab);
    } else {
      // 저장된 게 없으면 기본값은 'analyze'
      setCurrentTab('analyze');
    }

    // 탭 초기화 완료 표시
    setIsTabInitialized(true);

    // 로그인 상태 체크 (리다이렉트 없이)
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
        setIsCheckingAuth(false);

        // URL에서 파라미터 확인
        const urlParams = new URLSearchParams(window.location.search);
        const authResult = urlParams.get('auth');
        const youtubeConnected = urlParams.get('youtube_connected');

        // YouTube 채널 연동 완료 시
        if (youtubeConnected === 'true') {
          handleTabChange('myChannel');
          // URL 파라미터 제거 (깔끔하게)
          window.history.replaceState({}, '', window.location.pathname);
        }
        // 사이트 로그인 성공했을 때
        else if (authResult === 'success') {
          // localStorage에서 돌아갈 탭 확인
          const returnTab = localStorage.getItem('return_tab');
          if (returnTab === 'myChannel') {
            handleTabChange('myChannel');
            localStorage.removeItem('return_tab'); // 사용 후 삭제
          }
          // URL 파라미터 제거
          window.history.replaceState({}, '', window.location.pathname);
        }
      })
      .catch(error => {
        console.error('인증 체크 실패:', error);
        setIsCheckingAuth(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      {/* Header - 모바일 2줄, PC 1줄 레이아웃 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          {/* 모바일: 2줄 레이아웃, PC: 1줄 레이아웃 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            {/* 첫째 줄: 로고와 타이틀 */}
            <div className="flex items-center gap-2 mb-2 md:mb-0">
              <Youtube className="w-6 md:w-8 h-6 md:h-8 text-red-600" />
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">유튜브 쇼츠 해커 (Beta)</h1>
            </div>

            {/* 둘째 줄: 버튼들 - 모바일에서는 오른쪽 정렬 */}
            <div className="flex items-center gap-2 justify-end">
              {/* 로그인 상태에 따라 UserMenu 또는 로그인 버튼 표시 */}
              {!isCheckingAuth && (
                user ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5 md:gap-2 transition-colors text-sm md:text-base font-medium"
                  >
                    <span className="whitespace-nowrap">로그인</span>
                  </button>
                )
              )}

              <button
                onClick={() => setIsServiceGuideOpen(true)}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1.5 md:gap-2 transition-colors text-sm md:text-base"
              >
                <CircleHelp size={16} className="text-red-600 md:w-[18px] md:h-[18px]" />
                <span className="whitespace-nowrap">서비스 안내</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1.5 md:gap-2 transition-colors text-sm md:text-base"
              >
                <span className="text-sm md:text-base">⚙️</span>
                <span className="whitespace-nowrap">API 키 설정</span>
              </button>
            </div>
          </div>

          {/* 탭 메뉴 */}
          {isTabInitialized && currentTab !== null && (
            <div className="flex gap-3 md:gap-4 mt-3 md:mt-4 border-b">
              <button
                onClick={() => handleTabChange('analyze')}
                className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors ${currentTab === 'analyze'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                타 채널 분석
              </button>
              <button
                onClick={() => handleTabChange('myChannel')}
                className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors ${currentTab === 'myChannel'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                내 채널 분석
              </button>
              <button
                onClick={() => handleTabChange('history')}
                className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors ${currentTab === 'history'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                📚 분석 기록
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      {isTabInitialized && currentTab !== null ? (
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
          {currentTab === 'analyze' ? (
            <ChannelAnalysisTab isLoggedIn={!!user} />
          ) : currentTab === 'myChannel' ? (
            <MyChannelTab isLoggedIn={!!user} />
          ) : (
            <AnalysisHistoryTab isLoggedIn={!!user} />
          )}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          로딩 중...
        </div>
      )}

      {/* 서비스 안내 모달 */}
      <ServiceGuideModal
        isOpen={isServiceGuideOpen}
        onClose={() => setIsServiceGuideOpen(false)}
      />

      {/* API 키 설정 모달 */}
      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}