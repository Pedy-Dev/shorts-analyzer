// app/components/Footer.tsx
'use client';

import Link from 'next/link';
import { Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* YouTube 브랜딩 */}
          <div className="flex items-center gap-2 text-gray-600">
            <Youtube className="w-5 h-5 text-red-600" />
            <span className="text-sm">
              Powered by{' '}
              <a
                href="https://developers.google.com/youtube/v3"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline font-medium"
              >
                YouTube Data API
              </a>
              {', '}
              <a
                href="https://developers.google.com/youtube/analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline font-medium"
              >
                YouTube Analytics API
              </a>
              {' and '}
              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline font-medium"
              >
                Google Gemini AI
              </a>
            </span>
          </div>

          {/* 정책 링크 */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <Link
              href="/privacy"
              className="hover:text-gray-900 hover:underline transition-colors"
            >
              개인정보처리방침
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/terms"
              className="hover:text-gray-900 hover:underline transition-colors"
            >
              서비스 이용약관
            </Link>
            <span className="text-gray-300">|</span>
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
        <div className="mt-4 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
          <p className="mb-2">
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
