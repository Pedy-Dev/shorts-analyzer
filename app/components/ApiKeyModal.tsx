//\app\components\ApiKeyModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Key, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [youtubeKey, setYoutubeKey] = useState('');

  // 모달 열릴 때 저장된 키 불러오기
  useEffect(() => {
    if (isOpen) {
      const savedYoutubeKey = localStorage.getItem('youtube_api_key') || '';
      setYoutubeKey(savedYoutubeKey);
    }
  }, [isOpen]);

  // 저장 버튼
  const handleSave = () => {
    // YouTube 키는 선택사항 - 없어도 저장 가능
    if (youtubeKey.trim()) {
      localStorage.setItem('youtube_api_key', youtubeKey.trim());
      alert('✅ 개인 API 키가 저장되었습니다!');
    } else {
      // 키 제거 (서버 API만 사용)
      localStorage.removeItem('youtube_api_key');
      alert('✅ 서버 API를 사용합니다!');
    }
    onClose();
  };

  // 모달이 열려있지 않으면 아무것도 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <>
      {/* 배경 어둡게 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* 모달 창 - 사이트 내 팝업 형태 */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl p-6 mx-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Key className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">API 키 설정</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* 수정된 설명 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              🔐 <strong>기본적으로 사이트에 등록된 API를 사용합니다.</strong><br />
              ⚡ 사용량이 많아 제한이 걸릴 경우, 본인의 API를 입력하세요.<br />
              💯 <strong className="text-green-600">API는 100% 무료이니 걱정하지 마세요!</strong>
            </p>
          </div>

          {/* YouTube API 입력 (선택사항) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                YouTube Data API Key 
                <span className="text-xs font-normal text-gray-500 ml-2">(선택사항)</span>
              </label>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                발급 링크
                <ExternalLink size={12} />
              </a>
            </div>
            <input
              type="text"
              value={youtubeKey}
              onChange={(e) => setYoutubeKey(e.target.value)}
              placeholder="비워두면 서버 API를 사용합니다"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 font-medium"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 YouTube 영상 정보와 자막 가져오기 기능에 사용됩니다.<br />
              💡 비워두시면 사이트 기본 API를 사용합니다.
            </p>
          </div>

          {/* 발급 방법 안내 링크 (더 작게) */}
          <div className="text-center mb-4">
            <button
              onClick={() => window.open('/api-guide', '_blank')}
              className="text-xs text-gray-600 hover:text-blue-600 underline"
            >
              API 발급이 처음이신가요? 가이드 보기 →
            </button>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
            >
              {youtubeKey.trim() ? '💾 저장하기' : '✅ 확인'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}