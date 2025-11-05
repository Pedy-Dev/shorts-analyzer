'use client';

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function ApiGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            <span>돌아가기</span>
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🔑 API 키 발급 가이드
        </h1>
        <p className="text-lg text-gray-600 mb-12">
          YouTube Shorts Hacker를 사용하기 위해 필요한 두 개의 API 키를 발급받는 방법을 안내합니다.
        </p>

        {/* YouTube API 섹션 */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-3xl font-bold">
              📺 YouTube Data API v3 발급
            </h2>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-8 space-y-12">
            {/* 1단계: 프로젝트 만들기 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm">
                  1
                </span>
                Google Cloud Console 접속 및 프로젝트 만들기
              </h3>

              <Image
                src="/youtube/you1.jpg"
                alt="사용자 인증 정보"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">https://console.cloud.google.com</a> 접속<br />
                  • 좌측 메뉴에서 <strong>"API 및 서비스"</strong> → <strong>"사용자 인증 정보"</strong> 클릭<br />
                  • 상단 <strong>"프로젝트 만들기"</strong> 버튼 클릭
                </p>
              </div>

              <Image
                src="/youtube/you2.jpg"
                alt="프로젝트 만들기"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  • 프로젝트 이름 입력 (예: "My Project 91094")<br />
                  • <strong>"만들기"</strong> 버튼 클릭
                </p>
              </div>
            </div>

            {/* 2단계: YouTube Data API 활성화 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm">
                  2
                </span>
                YouTube Data API v3 활성화
              </h3>

              <Image
                src="/youtube/you3.jpg"
                alt="API 라이브러리"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • 좌측 메뉴에서 <strong>"라이브러리"</strong> 클릭
                </p>
              </div>

              <Image
                src="/youtube/you4.jpg"
                alt="YouTube Data API v3 검색"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • 검색창에 <strong>"YouTube Data API v3"</strong> 검색
                </p>
              </div>

              <Image
                src="/youtube/you5.jpg"
                alt="YouTube Data API v3 사용"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • <strong>"YouTube Data API v3"</strong> 클릭<br />
                  • <strong>"사용"</strong> 버튼 클릭
                </p>
              </div>

              <Image
                src="/youtube/you6.jpg"
                alt="API 활성화 확인"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800">
                  ✅ API가 활성화되었습니다!<br />
                  이제 API 키를 만들 차례입니다.
                </p>
              </div>
            </div>

            {/* 3단계: API 키 만들기 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm">
                  3
                </span>
                API 키 만들기
              </h3>

              <Image
                src="/youtube/you7.jpg"
                alt="사용자 인증 정보 만들기"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • 다시 좌측 메뉴에서 <strong>"사용자 인증 정보"</strong> 클릭<br />
                  • 상단 <strong>"+ 사용자 인증 정보 만들기"</strong> 클릭<br />
                  • <strong>"API 키"</strong> 선택
                </p>
              </div>

              <Image
                src="/youtube/you8.jpg"
                alt="API 키 생성 화면"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • <strong>"API 키"</strong> 팝업이 뜹니다
                </p>
              </div>
            </div>

            {/* 4단계: API 키 제한 설정 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm">
                  4
                </span>
                API 키 제한 설정 (중요!)
              </h3>

              <Image
                src="/youtube/you9.jpg"
                alt="키 제한 설정"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
                <p className="text-yellow-800 font-semibold mb-2">⚠️ 중요한 설정!</p>
                <p className="text-yellow-700">
                  • 애플리케이션 제한사항: <strong>"없음"</strong> 선택<br />
                  • API 제한사항: <strong>"키 제한"</strong> 선택
                </p>
              </div>

              <Image
                src="/youtube/you10.jpg"
                alt="YouTube Data API v3 선택"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • 필터 검색창에서 <strong>"YouTube Data API v3"</strong> 체크<br />
                  • 하단 <strong>"확인"</strong> 버튼 클릭
                </p>
              </div>

              <Image
                src="/youtube/you11.jpg"
                alt="API 키 복사"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800">
                  ✅ <strong>YouTube API 키 생성 완료!</strong><br />
                  오른쪽 <strong>복사 버튼</strong>을 눌러 API 키를 복사하세요.<br />
                  (AIza로 시작하는 긴 문자열)
                </p>
              </div>
            </div>
          </div>
        </section>

               {/* Gemini API 섹션 */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-3xl font-bold">
              🤖 Gemini API 발급
            </h2>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-8 space-y-12">
            {/* 1단계: Google AI Studio 접속 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">
                  1
                </span>
                Google AI Studio 접속
              </h3>

              <Image
                src="/gemini/ge1.jpg"
                alt="Google AI Studio"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  • <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">https://aistudio.google.com/app/apikey</a> 접속<br />
                  • 우측 상단 <strong>"API 키 만들기"</strong> 버튼 클릭
                </p>
              </div>
            </div>

            {/* 2단계: 프로젝트 만들기 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">
                  2
                </span>
                프로젝트 생성
              </h3>

              <Image
                src="/gemini/ge2.jpg"
                alt="Create project"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • 키 이름 지정 (예: "아무거나 상관 없음 !")<br />
                  • 가져온 프로젝트 선택 드롭다운에서 <strong>"+ Create project"</strong> 클릭
                </p>
              </div>

              <Image
                src="/gemini/ge3.jpg"
                alt="새 프로젝트 만들기"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  • 프로젝트 이름 입력 (예: "abcd")<br />
                  • <strong>"프로젝트 만들기"</strong> 버튼 클릭
                </p>
              </div>
            </div>

            {/* 3단계: API 키 생성 완료 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">
                  3
                </span>
                API 키 생성
              </h3>

              <Image
                src="/gemini/ge4.jpg"
                alt="프로젝트 생성 완료"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">
                  • 프로젝트가 생성되면 다시 <strong>"키 만들기"</strong> 버튼 클릭<br />
                  • 방금 만든 프로젝트 선택 (예: "abcd")
                </p>
              </div>

              <Image
                src="/gemini/ge5.jpg"
                alt="키 생성 완료"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <p className="text-green-800">
                  ✅ API 키가 생성되었습니다!
                </p>
              </div>

              <Image
                src="/gemini/ge6.jpg"
                alt="API 키 복사"
                width={800}
                height={500}
                className="w-full rounded-lg border border-gray-200 mb-4"
              />

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800">
                  <strong>복사 버튼</strong>을 눌러 API 키를 복사하세요.<br />
                  (AIza로 시작하는 긴 문자열)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 완료 섹션 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-lg text-center">
          <h2 className="text-3xl font-bold mb-4">🎉 모든 준비 완료!</h2>
          <p className="text-lg mb-6">
            이제 두 개의 API 키를 YouTube Shorts Hacker에 입력하고<br />
            채널 분석을 시작하세요!
          </p>
          <button
            onClick={() => window.close()}
            className="bg-white text-green-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition"
          >
            ← 돌아가서 API 키 입력하기
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p>💡 API 키는 브라우저에만 저장되며, 절대 서버로 전송되지 않습니다.</p>
          <p className="mt-2">모든 API는 무료로 발급받을 수 있습니다.</p>
        </div>
      </footer>
    </div>
  );
}