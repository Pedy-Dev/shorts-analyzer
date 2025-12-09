'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CircleHelp, BarChart3 } from 'lucide-react';
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
  // 현재 페이지 경로를 returnUrl로 설정
  const getLoginUrl = () => {
    if (activePage === 'ranking') {
      return '/login?returnUrl=/shorts-ranking';
    }
    return '/login';
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        {/* 모바일: 2줄, md 이상: 1줄 */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {/* 왼쪽 영역: 로고 + 메인 네비 (md 이상에서 한 줄) */}
          <div className="flex items-center justify-between md:justify-start md:gap-6">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="유튜브 쇼츠 해커"
                width={28}
                height={28}
                className="w-6 h-6 md:w-7 md:h-7"
              />
              <span className="text-lg md:text-xl font-bold text-gray-900 hidden md:inline">
                유튜브 쇼츠 해커
              </span>
            </Link>

            {/* 메인 네비 - md 이상에서만 로고 옆에 표시 */}
            <nav className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                className={`px-4 py-2 text-base font-medium rounded-lg transition-colors ${
                  activePage === 'analyzer'
                    ? 'font-semibold text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                채널 분석
              </Link>
              <Link
                href="/shorts-ranking"
                className={`px-4 py-2 text-base font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activePage === 'ranking'
                    ? 'font-semibold text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 size={16} />
                <span>인기 차트</span>
              </Link>
            </nav>

            {/* 오른쪽: 보조 메뉴 + 유저 메뉴 (모바일에서만 이 위치) */}
            <div className="flex md:hidden items-center gap-1">
              <button
                onClick={onServiceGuideClick}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="서비스 안내"
              >
                <CircleHelp size={18} />
              </button>
              <button
                onClick={onApiKeyClick}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="API 키 설정"
              >
                <span>⚙️</span>
              </button>
              {!isCheckingAuth && (
                user ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => window.location.href = getLoginUrl()}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    로그인
                  </button>
                )
              )}
            </div>
          </div>

          {/* 오른쪽 영역: 보조 메뉴 (md 이상에서만) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onServiceGuideClick}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="서비스 안내"
            >
              <span className="flex items-center gap-1.5 text-sm">
                <CircleHelp size={16} />
                안내
              </span>
            </button>
            <button
              onClick={onApiKeyClick}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="API 키 설정"
            >
              <span className="flex items-center gap-1.5 text-sm">
                ⚙️ API 키
              </span>
            </button>
            {!isCheckingAuth && (
              user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => window.location.href = getLoginUrl()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-base font-medium transition-colors"
                >
                  로그인
                </button>
              )
            )}
          </div>

          {/* 모바일 2줄차: 메인 네비 */}
          <nav className="flex md:hidden w-full gap-1">
            <Link
              href="/"
              className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activePage === 'analyzer'
                  ? 'font-semibold text-red-600 bg-red-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              채널 분석
            </Link>
            <Link
              href="/shorts-ranking"
              className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
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
      </div>
    </header>
  );
}
