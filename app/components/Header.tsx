'use client';

import Link from 'next/link';
import { Youtube, CircleHelp, BarChart3 } from 'lucide-react';
import UserMenu from './UserMenu';

interface HeaderProps {
  activePage: 'analyzer' | 'ranking';
  user: any;
  isCheckingAuth: boolean;
  onServiceGuideClick: () => void;
  onApiKeyClick: () => void;
}

export default function Header({
  activePage,
  user,
  isCheckingAuth,
  onServiceGuideClick,
  onApiKeyClick,
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        {/* 상단: 로고 + 메인 네비 + 보조 메뉴 */}
        <div className="flex items-center justify-between">
          {/* 왼쪽: 로고 + 메인 네비게이션 */}
          <div className="flex items-center gap-4 md:gap-8">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2">
              <Youtube className="w-6 md:w-7 h-6 md:h-7 text-red-600" />
              <span className="text-lg md:text-xl font-bold text-gray-900 hidden sm:inline">
                유튜브 쇼츠 해커
              </span>
            </Link>

            {/* 메인 네비게이션 2개 */}
            <nav className="flex items-center gap-1 md:gap-2">
              {/* 채널 분석 */}
              <Link
                href="/"
                className={`px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base font-medium rounded-lg transition-colors ${
                  activePage === 'analyzer'
                    ? 'font-semibold text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                채널 분석
              </Link>

              {/* 인기 차트 */}
              <Link
                href="/shorts-ranking"
                className={`px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activePage === 'ranking'
                    ? 'font-semibold text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 size={16} className="hidden sm:inline" />
                <span>인기 차트</span>
              </Link>
            </nav>
          </div>

          {/* 오른쪽: 보조 메뉴 */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={onServiceGuideClick}
              className="p-2 md:px-3 md:py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="서비스 안내"
            >
              <CircleHelp size={18} className="md:hidden" />
              <span className="hidden md:flex items-center gap-1.5 text-sm">
                <CircleHelp size={16} />
                안내
              </span>
            </button>
            <button
              onClick={onApiKeyClick}
              className="p-2 md:px-3 md:py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="API 키 설정"
            >
              <span className="md:hidden">⚙️</span>
              <span className="hidden md:flex items-center gap-1.5 text-sm">
                ⚙️ API 키
              </span>
            </button>

            {/* 로그인/프로필 */}
            {!isCheckingAuth && (
              user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => window.location.href = '/login'}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm md:text-base font-medium transition-colors"
                >
                  로그인
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
