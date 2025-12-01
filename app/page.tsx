// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import ApiKeyModal from './components/ApiKeyModal';
import ServiceGuideModal from './components/ServiceGuideModal';
import ChannelAnalysisTab from './components/ChannelAnalysisTab';
import MyChannelTab from './components/MyChannelTab';
import AnalysisHistoryTab from './components/AnalysisHistoryTab';
import Header from './components/Header';
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
      {/* 공통 헤더 */}
      <Header
        activePage="analyzer"
        user={user}
        isCheckingAuth={isCheckingAuth}
        onServiceGuideClick={() => setIsServiceGuideOpen(true)}
        onApiKeyClick={() => setIsModalOpen(true)}
      />

      {/* 채널 분석 내부 탭 3개 */}
      {isTabInitialized && currentTab !== null && (
        <div className="bg-white border-b sticky top-[57px] md:top-[65px] z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 md:gap-2 py-3">
              <button
                onClick={() => handleTabChange('analyze')}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base font-medium rounded-lg transition-colors ${
                  currentTab === 'analyze'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                타 채널 분석
              </button>
              <button
                onClick={() => handleTabChange('myChannel')}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base font-medium rounded-lg transition-colors ${
                  currentTab === 'myChannel'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                내 채널 분석
              </button>
              <button
                onClick={() => handleTabChange('history')}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base font-medium rounded-lg transition-colors ${
                  currentTab === 'history'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                분석 기록
              </button>
            </div>
          </div>
        </div>
      )}

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