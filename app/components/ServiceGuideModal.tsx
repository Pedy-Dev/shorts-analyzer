//\app\components\ServiceGuideModal.tsx
'use client';

import { X, CircleHelp } from 'lucide-react';

interface ServiceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServiceGuideModal({ isOpen, onClose }: ServiceGuideModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 배경 어둡게 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* 모달 창 */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl p-6 mx-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CircleHelp className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">서비스 안내</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* 섹션 1: 유튜브 쇼츠 해커가 뭔가요? */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              1️⃣ 유튜브 쇼츠 해커가 뭔가요?
            </h3>
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4">
              <p className="text-gray-800 leading-relaxed mb-3">
                <strong className="text-red-600">유튜브 쇼츠 해커</strong>는 쇼츠 크리에이터를 위한 AI 분석 도구입니다.
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>타 채널 분석:</strong> 성공한 경쟁 채널의 대본 패턴과 제작 전략을 분석합니다</p>
                <p>• <strong>내 채널 분석:</strong> 내 영상들의 성과를 비교하고 구체적인 개선 방법을 제시합니다</p>
              </div>
            </div>
          </div>

          {/* 섹션 2: 어떻게 사용하나요? */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              2️⃣ 어떻게 사용하나요?
            </h3>

            {/* 정보 수집 방식 */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="font-semibold text-blue-900 mb-3">📊 정보 수집 방식</p>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <p className="font-medium text-gray-900 mb-1">▪ 타 채널 분석</p>
                  <p className="pl-4">
                    → 채널 ID 입력 → YouTube API로 최근 영상 수집 → 각 영상의 자막(대본) 추출 → AI 분석
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">▪ 내 채널 분석</p>
                  <p className="pl-4">
                    → Google 로그인 → YouTube Analytics API로 상세 성과 데이터 수집 → 자막 추출 → AI 비교 분석
                  </p>
                </div>
              </div>
            </div>

            {/* 평가 관점 */}
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="font-semibold text-purple-900 mb-3">🎯 평가 관점</p>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>대본 구조:</strong> 첫 3초 훅, 스토리 전개, 감정 유발 요소, 마무리 방식</p>
                <p>• <strong>제목 전략:</strong> 클릭을 유도하는 키워드와 표현 패턴</p>
                <p>• <strong>성과 지표:</strong> 조회수, 시청 지속률, 바이럴 지수, 구독 전환율</p>
                <p>• <strong>트렌드 타이밍:</strong> 어떤 주제가 언제 올라갔고 왜 성공했는지</p>
              </div>
            </div>
          </div>

          {/* 시작하기 버튼 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition"
            >
              ✨ 시작하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}