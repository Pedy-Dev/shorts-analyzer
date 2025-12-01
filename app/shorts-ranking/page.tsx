'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import ApiKeyModal from '../components/ApiKeyModal';
import ServiceGuideModal from '../components/ServiceGuideModal';
import ShortsCategoryRankingTab from '../components/ShortsCategoryRankingTab';
import Footer from '../components/Footer';

export default function ShortsRankingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceGuideOpen, setIsServiceGuideOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // 로그인 상태 체크
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
        setIsCheckingAuth(false);
      })
      .catch(error => {
        console.error('인증 체크 실패:', error);
        setIsCheckingAuth(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 공통 헤더 */}
      <Header
        activePage="ranking"
        user={user}
        isCheckingAuth={isCheckingAuth}
        onServiceGuideClick={() => setIsServiceGuideOpen(true)}
        onApiKeyClick={() => setIsModalOpen(true)}
      />

      {/* 인기 차트 콘텐츠 */}
      <ShortsCategoryRankingTab />

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
