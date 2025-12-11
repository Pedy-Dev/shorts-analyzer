// app/privacy/page.tsx
'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>홈으로</span>
            </Link>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="유튜브 쇼츠 해커" width={24} height={24} className="w-6 h-6" />
              <h1 className="text-xl font-bold text-gray-900">개인정보처리방침</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          {/* 한글 버전 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">개인정보처리방침 (Privacy Policy)</h2>

            <div className="space-y-6 text-gray-700">
              <div>
                <p className="text-sm text-gray-500 mb-4">최종 업데이트: 2025년 11월</p>
                <p className="mb-4">
                  유튜브 쇼츠 해커(이하 "서비스")는 사용자의 개인정보를 소중히 여기며,
                  관련 법령을 준수합니다. 본 개인정보처리방침은 서비스가 수집하는 정보와
                  그 사용 방법에 대해 설명합니다.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. 수집하는 정보</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>1.1 Google 계정 정보 (로그인 시)</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>이름 (Google 계정 이름)</li>
                    <li>이메일 주소</li>
                    <li>프로필 사진</li>
                    <li>Google 계정 고유 ID</li>
                  </ul>

                  <p className="mt-4"><strong>1.2 YouTube 채널 정보 (내 채널 분석 시)</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>YouTube 채널 ID 및 이름</li>
                    <li>채널 썸네일</li>
                    <li>OAuth 액세스 토큰 (YouTube API 접근용)</li>
                  </ul>

                  <p className="mt-4"><strong>1.3 YouTube API 데이터 (분석 시에만)</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>공개 채널 정보 (채널명, 썸네일, 구독자 수)</li>
                    <li>공개 영상 정보 (제목, 조회수, 좋아요, 댓글, 영상 길이)</li>
                    <li>YouTube Analytics 데이터 (내 채널 분석 시: 시청 시간, 참여율, 구독 전환율)</li>
                  </ul>

                  <p className="mt-4"><strong>1.4 사용자 제공 정보</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>YouTube Data API 키 (타 채널 분석 시, 브라우저 로컬에만 저장)</li>
                    <li>Gemini API 키 (선택적, 브라우저 로컬에만 저장)</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. 정보 사용 목적</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>사용자 계정 생성 및 인증</li>
                  <li>YouTube Shorts 영상 성과 분석</li>
                  <li>AI 기반 컨텐츠 개선 가이드라인 생성</li>
                  <li>분석 기록 저장 및 관리 (로그인 사용자 전용)</li>
                  <li>서비스 품질 개선</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. YouTube API 서비스 사용</h3>
                <div className="ml-4 space-y-2">
                  <p>
                    본 서비스는 <strong>YouTube API Services</strong>를 사용합니다.
                  </p>

                  <p className="mt-3"><strong>API 키 사용 방식:</strong></p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>
                      <strong>서버 API 키 우선 사용:</strong> 타 채널 분석 시 서버가 보유한 YouTube Data API 키를 먼저 사용합니다.
                    </li>
                    <li>
                      <strong>사용자 API 키 폴백:</strong> 서버 API 할당량이 초과된 경우, 사용자가 제공한 API 키를 사용합니다 (선택사항).
                    </li>
                    <li>
                      <strong>향후 변경 사항:</strong> YouTube API 할당량 증가 승인 시, 사용자 API 키 입력이 불필요해집니다.
                    </li>
                  </ul>

                  <p className="mt-3"><strong>데이터 처리:</strong></p>
                  <ul className="list-disc ml-6 space-y-2 mt-2">
                    <li>
                      YouTube API를 통해 수집된 데이터는 <strong>분석 목적으로만 일시적으로 사용</strong>되며,
                      원본 YouTube 데이터는 서버에 영구 저장하지 않습니다.
                    </li>
                    <li>
                      분석 결과 요약 정보만 저장됩니다 (영상 제목, 조회수, AI 분석 결과).
                    </li>
                    <li>
                      YouTube API 사용과 관련하여
                      <a
                        href="https://www.youtube.com/t/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline ml-1"
                      >
                        YouTube 이용약관
                      </a>
                      과
                      <a
                        href="http://www.google.com/policies/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline ml-1"
                      >
                        Google 개인정보처리방침
                      </a>
                      이 적용됩니다.
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. 정보 저장 및 보안</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>OAuth 토큰:</strong> httpOnly 쿠키로 안전하게 저장 (7일간 유효)</li>
                  <li><strong>API 키:</strong> 사용자 브라우저 로컬스토리지에만 저장 (서버 전송 안 함)</li>
                  <li><strong>분석 기록:</strong> Supabase 데이터베이스에 암호화되어 저장</li>
                  <li><strong>개인정보:</strong> SSL/TLS 암호화 통신으로 전송</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5. 제3자 제공</h3>
                <p className="mb-2">본 서비스는 다음의 경우를 제외하고 사용자 정보를 제3자에게 제공하지 않습니다:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>사용자의 명시적 동의가 있는 경우</li>
                  <li>법령에 의해 요구되는 경우</li>
                </ul>
                <p className="mt-3"><strong>사용하는 외부 서비스:</strong></p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Google Cloud Platform (OAuth 인증, YouTube API)</li>
                  <li>Google Gemini AI (AI 분석, API 키 사용 시에만)</li>
                  <li>Supabase (데이터베이스)</li>
                  <li>Vercel (호스팅)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">6. 사용자 권리</h3>
                <p className="mb-2">사용자는 다음의 권리를 가집니다:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong>YouTube API 접근 권한 취소:</strong> Google 계정 설정에서 언제든지
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:underline ml-1"
                    >
                      앱 권한 관리
                    </a>
                    를 통해 취소 가능
                  </li>
                  <li><strong>계정 삭제:</strong> 설정에서 계정 삭제 가능 (모든 분석 기록 함께 삭제)</li>
                  <li><strong>분석 기록 삭제:</strong> 개별 분석 기록을 언제든지 삭제 가능</li>
                  <li><strong>로그아웃:</strong> 언제든지 로그아웃 가능 (쿠키 삭제됨)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">7. 쿠키 사용</h3>
                <p className="mb-2">본 서비스는 다음 쿠키를 사용합니다:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-1 rounded">user_id</code>: 로그인 세션 유지 (7일)</li>
                  <li>쿠키는 인증 목적으로만 사용되며, 광고 추적에 사용되지 않습니다</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8. 개인정보 보유 기간</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>계정 정보: 회원 탈퇴 시까지</li>
                  <li>분석 기록: 사용자가 삭제할 때까지 (또는 계정 탈퇴 시)</li>
                  <li>OAuth 토큰: 7일 (자동 갱신) 또는 로그아웃 시</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">9. 문의</h3>
                <p>
                  개인정보 관련 문의사항은 아래로 연락주시기 바랍니다:
                </p>
                <p className="mt-2 text-gray-600">
                  이메일: duawoals3078@gmail.com
                </p>
              </div>
            </div>
          </section>

          {/* 영문 버전 */}
          <section className="pt-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy (English)</h2>

            <div className="space-y-6 text-gray-700">
              <div>
                <p className="text-sm text-gray-500 mb-4">Last Updated: November 2025</p>
                <p className="mb-4">
                  YouTube Shorts Analyzer ("Service") values your privacy and complies with applicable laws.
                  This Privacy Policy explains what information we collect and how we use it.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>1.1 Google Account Information (when you sign in)</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Name (Google account name)</li>
                    <li>Email address</li>
                    <li>Profile picture</li>
                    <li>Google account unique ID</li>
                  </ul>

                  <p className="mt-4"><strong>1.2 YouTube Channel Information (for My Channel analysis)</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>YouTube channel ID and name</li>
                    <li>Channel thumbnail</li>
                    <li>OAuth access tokens (for YouTube API access)</li>
                  </ul>

                  <p className="mt-4"><strong>1.3 YouTube API Data (during analysis only)</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Public channel information (channel name, thumbnail, subscriber count)</li>
                    <li>Public video information (title, views, likes, comments, duration)</li>
                    <li>YouTube Analytics data (for My Channel: watch time, engagement, subscriber conversion)</li>
                  </ul>

                  <p className="mt-4"><strong>1.4 User-Provided Information</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>YouTube Data API key (for external channel analysis, stored locally only)</li>
                    <li>Gemini API key (optional, stored locally only)</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Information</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>User account creation and authentication</li>
                  <li>YouTube Shorts performance analysis</li>
                  <li>AI-powered content improvement guidelines generation</li>
                  <li>Analysis history storage and management (for logged-in users)</li>
                  <li>Service quality improvement</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. YouTube API Services Usage</h3>
                <div className="ml-4 space-y-2">
                  <p>
                    This Service uses <strong>YouTube API Services</strong>.
                  </p>

                  <p className="mt-3"><strong>API Key Usage:</strong></p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>
                      <strong>Server API Key (Primary):</strong> For external channel analysis, we primarily use our server's YouTube Data API key.
                    </li>
                    <li>
                      <strong>User API Key (Fallback):</strong> When our server API quota is exceeded, the user-provided API key is used (optional).
                    </li>
                    <li>
                      <strong>Future Changes:</strong> Once our YouTube API quota increase request is approved, user-provided API keys will no longer be necessary.
                    </li>
                  </ul>

                  <p className="mt-3"><strong>Data Processing:</strong></p>
                  <ul className="list-disc ml-6 space-y-2 mt-2">
                    <li>
                      Data collected via YouTube API is <strong>used temporarily for analysis purposes only</strong>.
                      Raw YouTube data is not permanently stored on our servers.
                    </li>
                    <li>
                      Only analysis result summaries are stored (video titles, view counts, AI analysis results).
                    </li>
                    <li>
                      YouTube API usage is subject to
                      <a
                        href="https://www.youtube.com/t/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline ml-1"
                      >
                        YouTube Terms of Service
                      </a>
                      and
                      <a
                        href="http://www.google.com/policies/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline ml-1"
                      >
                        Google Privacy Policy
                      </a>.
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Data Storage & Security</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>OAuth tokens:</strong> Securely stored in httpOnly cookies (valid for 7 days)</li>
                  <li><strong>API keys:</strong> Stored in browser localStorage only (never sent to server)</li>
                  <li><strong>Analysis history:</strong> Encrypted and stored in Supabase database</li>
                  <li><strong>Personal information:</strong> Transmitted via SSL/TLS encryption</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Third-Party Sharing</h3>
                <p className="mb-2">We do not share user information with third parties except:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>With explicit user consent</li>
                  <li>When required by law</li>
                </ul>
                <p className="mt-3"><strong>External services we use:</strong></p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Google Cloud Platform (OAuth authentication, YouTube API)</li>
                  <li>Google Gemini AI (AI analysis, only when API key is provided)</li>
                  <li>Supabase (database)</li>
                  <li>Vercel (hosting)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Your Rights</h3>
                <p className="mb-2">You have the following rights:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong>Revoke YouTube API access:</strong> You can revoke access anytime via
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:underline ml-1"
                    >
                      Google Account App Permissions
                    </a>
                  </li>
                  <li><strong>Delete account:</strong> Delete your account from settings (all analysis history will be deleted)</li>
                  <li><strong>Delete analysis history:</strong> Delete individual analysis records anytime</li>
                  <li><strong>Sign out:</strong> Sign out anytime (cookies will be deleted)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Cookies</h3>
                <p className="mb-2">This Service uses the following cookies:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-1 rounded">user_id</code>: Login session maintenance (7 days)</li>
                  <li>Cookies are used for authentication purposes only, not for advertising tracking</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Data Retention Period</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Account information: Until account deletion</li>
                  <li>Analysis history: Until user deletion (or account deletion)</li>
                  <li>OAuth tokens: 7 days (auto-renewed) or until sign-out</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">9. Contact Us</h3>
                <p>
                  For privacy-related inquiries, please contact:
                </p>
                <p className="mt-2 text-gray-600">
                  Email: duawoals3078@gmail.com
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
