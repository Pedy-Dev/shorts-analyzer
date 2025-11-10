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
  const [geminiKey, setGeminiKey] = useState('');

  // 모달 열릴 때 저장된 키 불러오기
  useEffect(() => {
    if (isOpen) {
      const savedYoutubeKey = localStorage.getItem('youtube_api_key') || '';
      const savedGeminiKey = localStorage.getItem('gemini_api_key') || '';
      setYoutubeKey(savedYoutubeKey);
      setGeminiKey(savedGeminiKey);
    }
  }, [isOpen]);

  // 저장 버튼
  const handleSave = () => {
    if (!youtubeKey.trim() || !geminiKey.trim()) {
      alert('⚠️ 두 개의 API 키를 모두 입력해주세요!');
      return;
    }

    // localStorage에 저장
    localStorage.setItem('youtube_api_key', youtubeKey.trim());
    localStorage.setItem('gemini_api_key', geminiKey.trim());

    alert('✅ API 키가 저장되었습니다!');
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

      {/* 모달 창 */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg">
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

          {/* 설명 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              🔒 API 키는 <strong>브라우저에만</strong> 저장되며, 서버로 전송되지 않습니다.<br />
              💡 두 API 모두 <strong className="text-red-500">무료</strong>로 발급 및 사용 할 수 있습니다!
            </p>
          </div>

          {/* YouTube API 입력 */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                YouTube Data API Key
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
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 font-medium"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 YouTube 영상 정보와 자막을 가져오는데 사용됩니다.
            </p>
          </div>

          {/* Gemini API 입력 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
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
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-gray-900 font-medium"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 대본 분석 및 제작 지침 생성에 사용됩니다.
            </p>
          </div>

          {/* 발급 방법 안내 링크 */}
          <div className="mt-4 text-center">
            <button
              onClick={() => window.open('/api-guide', '_blank')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              📘 API 발급 방법 보기 →
            </button>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition"
            >
              💾 저장하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}