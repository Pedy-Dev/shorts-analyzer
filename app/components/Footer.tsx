// app/components/Footer.tsx
'use client';

import Link from 'next/link';
import { Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Powered by - 모바일에서 세로 배치, 줄바꿈 허용 */}
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          {/* YouTube 브랜딩 - 모바일에서 중앙 정렬, 줄바꿈 허용 */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-600 text-center sm:text-left">
            <div className="flex items-center gap-1">
              <Youtube className="w-4 h-4 text-red-600" />
              <span className="text-xs sm:text-sm">Powered by</span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-1 text-xs sm:text-sm">
              <a
                href="https://developers.google.com/youtube/v3"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline font-medium"
              >
                YouTube Data API
              </a>
              <span>,</span>
              <a
                href="https://developers.google.com/youtube/analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline font-medium"
              >
                Analytics API
              </a>
              <span>,</span>
              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline font-medium"
              >
                Gemini AI
              </a>
            </div>
          </div>

          {/* 정책 링크 - 모바일에서 줄바꿈 허용 */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600">
            <Link
              href="/privacy"
              className="hover:text-gray-900 hover:underline transition-colors"
            >
              개인정보처리방침
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <Link
              href="/terms"
              className="hover:text-gray-900 hover:underline transition-colors"
            >
              서비스 이용약관
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 hover:underline transition-colors"
            >
              앱 권한 관리
            </a>
          </div>
        </div>

        {/* 저작권 및 면책 */}
        <div className="mt-4 pt-4 border-t border-gray-100 text-center text-[11px] sm:text-xs text-gray-500">
          <p className="mb-1">
            © 2025 유튜브 쇼츠 해커 (Beta). All rights reserved.
          </p>
          <p className="text-gray-400">
            본 서비스는{' '}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              YouTube 이용약관
            </a>
            {' '}및{' '}
            <a
              href="http://www.google.com/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Google 개인정보처리방침
            </a>
            을 준수합니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
