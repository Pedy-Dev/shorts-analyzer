// app/terms/page.tsx
'use client';

import { Youtube, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
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
              <Youtube className="w-6 h-6 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900">서비스 이용약관</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          {/* 한글 버전 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">서비스 이용약관 (Terms of Service)</h2>

            <div className="space-y-6 text-gray-700">
              <div>
                <p className="text-sm text-gray-500 mb-4">최종 업데이트: 2024년 11월</p>
                <p className="mb-4">
                  본 약관은 유튜브 쇼츠 해커(이하 "서비스") 이용에 관한 조건을 규정합니다.
                  서비스를 이용함으로써 귀하는 본 약관에 동의하는 것으로 간주됩니다.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. 서비스 소개</h3>
                <p>
                  유튜브 쇼츠 해커는 YouTube Shorts 콘텐츠 크리에이터를 위한 성과 분석 및
                  AI 기반 컨텐츠 개선 가이드 제공 서비스입니다.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. 서비스 이용 자격</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>만 14세 이상의 개인</li>
                  <li>Google 계정 보유자 (내 채널 분석 기능 이용 시)</li>
                  <li>YouTube Data API 키 보유자 (타 채널 분석 기능 이용 시)</li>
                  <li>본 약관에 동의한 자</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. 사용자 계정</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>3.1 계정 생성</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Google OAuth를 통한 로그인만 지원합니다</li>
                    <li>하나의 Google 계정당 하나의 서비스 계정이 생성됩니다</li>
                    <li>계정 정보는 정확하고 최신 상태로 유지되어야 합니다</li>
                  </ul>

                  <p className="mt-4"><strong>3.2 계정 보안</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>사용자는 계정 보안에 대한 책임이 있습니다</li>
                    <li>계정 도용 또는 무단 사용이 의심되는 경우 즉시 연락해주시기 바랍니다</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. YouTube API 서비스 사용</h3>
                <div className="ml-4 space-y-2">
                  <p>
                    본 서비스는 YouTube API Services를 사용하며, 다음 정책을 준수합니다:
                  </p>
                  <ul className="list-disc ml-6 space-y-2 mt-2">
                    <li>
                      <a
                        href="https://www.youtube.com/t/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline"
                      >
                        YouTube 이용약관
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline"
                      >
                        YouTube API Services Terms of Service
                      </a>
                    </li>
                    <li>
                      <a
                        href="http://www.google.com/policies/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline"
                      >
                        Google 개인정보처리방침
                      </a>
                    </li>
                  </ul>
                  <p className="mt-4">
                    귀하는 언제든지 Google 계정 설정에서
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:underline ml-1"
                    >
                      앱 권한 관리
                    </a>
                    를 통해 본 서비스의 YouTube 데이터 접근 권한을 취소할 수 있습니다.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5. 사용자 의무</h3>
                <p className="mb-2">사용자는 다음 행위를 하여서는 안 됩니다:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>타인의 개인정보 무단 수집 또는 사용</li>
                  <li>서비스의 정상적인 운영을 방해하는 행위</li>
                  <li>허위 정보 입력 또는 타인의 정보를 도용하는 행위</li>
                  <li>YouTube API 할당량을 고의로 소진시키는 행위</li>
                  <li>분석 결과를 무단으로 재판매하는 행위</li>
                  <li>법령 또는 공서양속에 위반되는 행위</li>
                  <li>자동화된 스크립트를 통한 무분별한 API 호출</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">6. 서비스 제공</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>6.1 제공 서비스</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>타 채널 Shorts 성과 분석</li>
                    <li>내 채널 Shorts 상세 분석 (YouTube Analytics 포함)</li>
                    <li>AI 기반 컨텐츠 개선 가이드라인 생성</li>
                    <li>분석 기록 저장 및 관리</li>
                  </ul>

                  <p className="mt-4"><strong>6.2 서비스 변경 및 중단</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>서비스는 사전 통지 없이 기능을 추가, 변경, 중단할 수 있습니다</li>
                    <li>시스템 점검, 서버 장애 등으로 인한 일시적 중단이 있을 수 있습니다</li>
                    <li>서비스는 베타 단계이며, 예고 없이 변경될 수 있습니다</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">7. 지적 재산권</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>서비스 및 관련 소프트웨어의 저작권은 서비스 제공자에게 있습니다</li>
                  <li>YouTube 데이터의 저작권은 각 콘텐츠 소유자에게 있습니다</li>
                  <li>AI 분석 결과는 참고용이며, 사용자가 자유롭게 활용할 수 있습니다</li>
                  <li>분석 대상 영상의 저작권은 원 제작자에게 있습니다</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8. 면책 조항</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong>AI 분석 결과의 정확성:</strong> AI가 생성한 가이드라인은 참고용이며,
                    실제 성과를 보장하지 않습니다
                  </li>
                  <li>
                    <strong>YouTube API 할당량:</strong> YouTube API의 일일 할당량 초과로 인한
                    서비스 이용 제한에 대해 책임지지 않습니다
                  </li>
                  <li>
                    <strong>제3자 서비스:</strong> Google, YouTube, Gemini AI 등 제3자 서비스의
                    중단 또는 오류에 대해 책임지지 않습니다
                  </li>
                  <li>
                    <strong>데이터 손실:</strong> 베타 서비스 특성상 데이터 손실 가능성이 있으며,
                    중요한 데이터는 별도로 백업하시기 바랍니다
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">9. 개인정보 보호</h3>
                <p>
                  개인정보 처리에 관한 사항은
                  <Link href="/privacy" className="text-red-600 hover:underline ml-1">
                    개인정보처리방침
                  </Link>
                  을 참조하시기 바랍니다.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">10. 계약 해지</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>10.1 사용자의 해지</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>언제든지 계정 설정에서 계정을 삭제할 수 있습니다</li>
                    <li>계정 삭제 시 모든 분석 기록이 영구 삭제됩니다</li>
                  </ul>

                  <p className="mt-4"><strong>10.2 서비스의 해지</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>본 약관 위반 시 사전 통지 없이 계정이 정지될 수 있습니다</li>
                    <li>6개월 이상 미사용 계정은 삭제될 수 있습니다</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">11. 분쟁 해결</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>본 약관은 대한민국 법률에 따라 해석됩니다</li>
                  <li>서비스 이용과 관련한 분쟁은 서비스 제공자 소재지 법원을 관할 법원으로 합니다</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">12. 문의</h3>
                <p>
                  서비스 이용 관련 문의사항은 아래로 연락주시기 바랍니다:
                </p>
                <p className="mt-2 text-gray-600">
                  이메일: duawoals3078@gmail.com
                </p>
              </div>
            </div>
          </section>

          {/* 영문 버전 */}
          <section className="pt-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Terms of Service (English)</h2>

            <div className="space-y-6 text-gray-700">
              <div>
                <p className="text-sm text-gray-500 mb-4">Last Updated: November 2024</p>
                <p className="mb-4">
                  These Terms of Service ("Terms") govern your use of YouTube Shorts Analyzer ("Service").
                  By using the Service, you agree to these Terms.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Service Description</h3>
                <p>
                  YouTube Shorts Analyzer is a performance analysis and AI-powered content improvement guideline service
                  for YouTube Shorts creators.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Eligibility</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Individuals aged 14 or older</li>
                  <li>Google account holders (for My Channel analysis)</li>
                  <li>YouTube Data API key holders (for external channel analysis)</li>
                  <li>Those who agree to these Terms</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. User Account</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>3.1 Account Creation</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Sign-in via Google OAuth only</li>
                    <li>One Service account per Google account</li>
                    <li>Account information must be accurate and up-to-date</li>
                  </ul>

                  <p className="mt-4"><strong>3.2 Account Security</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Users are responsible for account security</li>
                    <li>Contact us immediately if unauthorized access is suspected</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. YouTube API Services Usage</h3>
                <div className="ml-4 space-y-2">
                  <p>
                    This Service uses YouTube API Services and complies with:
                  </p>
                  <ul className="list-disc ml-6 space-y-2 mt-2">
                    <li>
                      <a
                        href="https://www.youtube.com/t/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline"
                      >
                        YouTube Terms of Service
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://developers.google.com/youtube/terms/api-services-terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline"
                      >
                        YouTube API Services Terms of Service
                      </a>
                    </li>
                    <li>
                      <a
                        href="http://www.google.com/policies/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline"
                      >
                        Google Privacy Policy
                      </a>
                    </li>
                  </ul>
                  <p className="mt-4">
                    You can revoke this Service's access to your YouTube data anytime via
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:underline ml-1"
                    >
                      Google Account App Permissions
                    </a>.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">5. User Responsibilities</h3>
                <p className="mb-2">Users must not:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Collect or use others' personal information without permission</li>
                  <li>Interfere with normal Service operations</li>
                  <li>Provide false information or impersonate others</li>
                  <li>Intentionally exhaust YouTube API quotas</li>
                  <li>Resell analysis results without authorization</li>
                  <li>Violate laws or public morals</li>
                  <li>Make excessive API calls via automated scripts</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Service Provision</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>6.1 Services Offered</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>External channel Shorts performance analysis</li>
                    <li>My channel detailed analysis (with YouTube Analytics)</li>
                    <li>AI-powered content improvement guidelines</li>
                    <li>Analysis history storage and management</li>
                  </ul>

                  <p className="mt-4"><strong>6.2 Service Changes & Interruptions</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>We may add, modify, or discontinue features without prior notice</li>
                    <li>Temporary interruptions may occur due to system maintenance or server issues</li>
                    <li>This is a beta service and may change without notice</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Intellectual Property</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Service and software copyrights belong to the Service provider</li>
                  <li>YouTube data copyrights belong to respective content owners</li>
                  <li>AI analysis results are for reference and can be freely used by users</li>
                  <li>Analyzed video copyrights belong to original creators</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Disclaimer</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong>AI Analysis Accuracy:</strong> AI-generated guidelines are for reference only
                    and do not guarantee actual performance
                  </li>
                  <li>
                    <strong>YouTube API Quotas:</strong> We are not responsible for service limitations
                    due to YouTube API daily quota exceeded
                  </li>
                  <li>
                    <strong>Third-Party Services:</strong> We are not responsible for interruptions or errors
                    in third-party services (Google, YouTube, Gemini AI, etc.)
                  </li>
                  <li>
                    <strong>Data Loss:</strong> As a beta service, data loss is possible.
                    Please backup important data separately
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">9. Privacy</h3>
                <p>
                  For information on personal data processing, please refer to our
                  <Link href="/privacy" className="text-red-600 hover:underline ml-1">
                    Privacy Policy
                  </Link>.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">10. Termination</h3>
                <div className="ml-4 space-y-2">
                  <p><strong>10.1 User Termination</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>You can delete your account anytime from settings</li>
                    <li>All analysis history will be permanently deleted upon account deletion</li>
                  </ul>

                  <p className="mt-4"><strong>10.2 Service Termination</strong></p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Accounts may be suspended without notice for Terms violations</li>
                    <li>Inactive accounts (6+ months) may be deleted</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">11. Dispute Resolution</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>These Terms are governed by the laws of the Republic of Korea</li>
                  <li>Disputes shall be subject to the jurisdiction of courts in the Service provider's location</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">12. Contact Us</h3>
                <p>
                  For service-related inquiries, please contact:
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
