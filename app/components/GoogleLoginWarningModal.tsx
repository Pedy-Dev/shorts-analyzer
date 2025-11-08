//\app\components\GoogleLoginWarningModal.tsx
'use client';

import { useState } from 'react';
import { X, AlertTriangle, Shield } from 'lucide-react';

interface GoogleLoginWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function GoogleLoginWarningModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: GoogleLoginWarningModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem('login_warning_shown', 'true');
    }
    onConfirm();
  };

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
              <AlertTriangle className="text-yellow-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">⚠️ 베타 테스트 안내</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* 경고 내용 */}
          <div className="bg-yellow-50 rounded-lg p-4 mb-6 border-2 border-yellow-200">
            <p className="text-gray-800 leading-relaxed mb-4">
              Google 로그인 시 <strong className="text-yellow-800">"확인되지 않은 앱"</strong> 경고가 나타날 수 있습니다.
            </p>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="font-semibold text-gray-900 mb-3">✅ 안전하게 진행하는 방법:</p>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>1.</strong> "고급" 버튼을 클릭하세요</p>
                <p><strong>2.</strong> "안전하지 않은 페이지로 이동" 링크를 클릭하세요</p>
                <p><strong>3.</strong> 엑세스 할 수 있는 항목 선택 "모두 선택" 해주세요</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
              <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-blue-900 mb-1">🔐 안심하세요:</p>
                <p>이 앱은 <strong>정식 Google OAuth</strong>를 사용합니다.<br />
                베타 테스트 기간이라 Google 검증 절차 진행 중입니다.</p>
              </div>
            </div>
          </div>

          {/* 다시 보지 않기 체크박스 */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">다시 보지 않기</span>
            </label>
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
              onClick={handleConfirm}
              className="flex-1 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-pink-700 transition"
            >
              확인하고 로그인
            </button>
          </div>
        </div>
      </div>
    </>
  );
}