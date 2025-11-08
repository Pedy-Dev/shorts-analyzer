'use client';

import { useState, useEffect, Fragment } from 'react';
import { Youtube, Loader2, RefreshCw, Search, X, Eye, ThumbsUp, MessageCircle, Share2, Clock, Users } from 'lucide-react';
import { getSubtitle } from '../api/youtube';
import GoogleLoginWarningModal from './GoogleLoginWarningModal';

export default function MyChannelTab() {
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [myChannelLoading, setMyChannelLoading] = useState(false);
  const [myChannelData, setMyChannelData] = useState<any>(null);
  const [myChannelAnalysis, setMyChannelAnalysis] = useState<any>(null);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [detailedAnalysisLoading, setDetailedAnalysisLoading] = useState(false);
  const [subtitleProgress, setSubtitleProgress] = useState({ current: 0, total: 0 });
  const [selectedCount, setSelectedCount] = useState(20);

  // 대본 모달 관련 state
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<{ title: string; script: string } | null>(null);

  // 로그인 경고 모달 관련 state
  const [showLoginWarning, setShowLoginWarning] = useState(false);

  // 로그인 성공 감지
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('auth');

    if (authResult === 'success') {
      setAuthStatus('✅ Google 로그인 성공!');
      window.history.replaceState({}, '', window.location.pathname);
      loadCurrentChannel();
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error');
      if (error === 'access_denied') {
        setAuthStatus('❌ 로그인이 취소되었습니다');
      } else {
        setAuthStatus('❌ 로그인 실패');
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 현재 로그인된 채널 정보 불러오기
  const loadCurrentChannel = async () => {
    try {
      console.log('📌 현재 채널 정보 불러오는 중...');
      const response = await fetch('/api/my-channels');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '채널 정보 불러오기 실패');
      }

      const data = await response.json();
      console.log('✅ 현재 채널:', data.channels[0]);

      if (data.channels.length > 0) {
        setCurrentChannel(data.channels[0]);
      }
    } catch (error: any) {
      console.error('❌ 채널 정보 불러오기 실패:', error);
      alert('채널 정보를 불러올 수 없습니다:\n' + error.message);
    }
  };

  // Google 로그인 함수 (경고 모달 먼저 확인)
  const handleGoogleLogin = async () => {
    const hasSeenWarning = localStorage.getItem('login_warning_shown');

    if (!hasSeenWarning) {
      // 경고 안 본 사람은 모달 먼저 띄우기
      setShowLoginWarning(true);
      return;
    }

    // 이미 본 사람은 바로 로그인 진행
    proceedWithLogin();
  };

  // 실제 로그인 진행 함수
  const proceedWithLogin = async () => {
    setIsLoginLoading(true);
    setAuthStatus('');

    try {
      localStorage.setItem('return_tab', 'myChannel');

      const response = await fetch('/api/auth/google');
      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setAuthStatus('❌ 로그인 URL 생성 실패');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setAuthStatus('❌ 로그인 오류 발생');
    } finally {
      setIsLoginLoading(false);
    }
  };

  // 채널 전환 (재로그인)
  const handleChannelSwitch = () => {
    setCurrentChannel(null);
    setMyChannelData(null);
    setMyChannelAnalysis(null);
    setAuthStatus('');
    handleGoogleLogin();
  };

  // 대본 모달 열기
  const openScriptModal = (title: string, script: string) => {
    setSelectedScript({ title, script });
    setIsScriptModalOpen(true);
  };

  // 대본 모달 닫기
  const closeScriptModal = () => {
    setIsScriptModalOpen(false);
    setSelectedScript(null);
  };

  // 내 채널 영상 불러오기 (자막 포함)
  const loadMyChannelVideos = async () => {
    setMyChannelLoading(true);
    setMyChannelData(null);
    setMyChannelAnalysis(null);
    setSubtitleProgress({ current: 0, total: 0 });

    try {
      console.log('📌 YouTube Analytics 데이터 가져오는 중...');
      const analyticsResponse = await fetch('/api/youtube-analytics');

      if (!analyticsResponse.ok) {
        const errorData = await analyticsResponse.json();
        throw new Error(errorData.error || 'YouTube 데이터 가져오기 실패');
      }

      const analyticsData = await analyticsResponse.json();
      console.log('✅ 데이터 수집 완료:', analyticsData.videos.length + '개 영상');

      const limitedVideos = analyticsData.videos.slice(0, selectedCount);
      console.log(`📌 ${selectedCount}개로 제한: ${limitedVideos.length}개 영상`);

      console.log('📌 자막 수집 중...');
      setSubtitleProgress({ current: 0, total: limitedVideos.length });

      const videosWithSubtitles = [];
      for (let i = 0; i < limitedVideos.length; i++) {
        const video = limitedVideos[i];
        console.log(`[${i + 1}/${limitedVideos.length}] ${video.title} 자막 가져오는 중...`);

        try {
          const subtitle = await getSubtitle(video.video_id);
          videosWithSubtitles.push({
            ...video,
            script: subtitle || '자막이 없습니다',
          });
          console.log(`✅ [${i + 1}/${limitedVideos.length}] 자막 수집 완료`);
        } catch (error) {
          console.error(`❌ [${i + 1}/${limitedVideos.length}] 자막 가져오기 실패:`, error);
          videosWithSubtitles.push({
            ...video,
            script: '자막 추출 실패',
          });
        }

        setSubtitleProgress({ current: i + 1, total: limitedVideos.length });
      }

      console.log('✅ 모든 자막 수집 완료!');

      setMyChannelData({
        ...analyticsData,
        videos: videosWithSubtitles,
      });

    } catch (error: any) {
      console.error('❌ 영상 불러오기 실패:', error);

      if (error.message.includes('로그인')) {
        alert('⚠️ ' + error.message);
      } else {
        alert('❌ 영상을 불러올 수 없습니다:\n' + error.message);
      }
    } finally {
      setMyChannelLoading(false);
      setSubtitleProgress({ current: 0, total: 0 });
    }
  };

  // ⭐ 채널 성과 분석
  const analyzeChannelPerformance = async () => {
    const geminiApiKey = localStorage.getItem('gemini_api_key');

    if (!geminiApiKey) {
      alert('⚠️ Gemini API 키가 필요합니다!\n\n오른쪽 상단의 "⚙️ API 키 설정" 버튼을 눌러 API 키를 입력해주세요.');
      return;
    }

    if (!myChannelData || !myChannelData.videos) {
      alert('⚠️ 먼저 영상 데이터를 불러와주세요.');
      return;
    }

    setDetailedAnalysisLoading(true);
    setMyChannelAnalysis(null);

    try {
      console.log('🤖 채널 성과 분석 시작 (조회수 기준 상위/하위 비교 + 대본 분석)...');
      const analysisResponse = await fetch('/api/analyze-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          videos: myChannelData.videos,
          channelInfo: myChannelData.channel,
        }),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || '분석 실패');
      }

      const analysisResult = await analysisResponse.json();
      console.log('✅ 채널 성과 분석 완료!');

      if (analysisResult.llm_json_ok) {
        setMyChannelAnalysis(analysisResult.llm);
      } else {
        alert('⚠️ JSON 파싱 실패. 원본 텍스트로 표시됩니다.');
        setMyChannelAnalysis({
          summary: [analysisResult.llm_raw || '분석 결과를 표시할 수 없습니다.']
        });
      }

    } catch (error: any) {
      console.error('❌ 분석 실패:', error);
      alert('❌ 분석에 실패했습니다:\n' + error.message);
    } finally {
      setDetailedAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 로그인 섹션 */}
      {!currentChannel ? (
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 text-center">
          <Youtube className="w-14 h-14 md:w-16 md:h-16 text-red-600 mx-auto mb-3 md:mb-4" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
            내 채널 분석
          </h2>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
            YouTube 계정으로 로그인하여 내 채널의 Shorts 영상을 분석하세요
          </p>

          {authStatus && (
            <div className={`mb-3 md:mb-4 p-2.5 md:p-3 rounded-lg text-sm md:text-base ${authStatus.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
              {authStatus}
            </div>
          )}

          {authStatus.includes('✅') ? (
            <div className="flex items-center justify-center gap-2 text-green-600 py-3">
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              <span className="text-sm md:text-base font-medium">채널 정보를 불러오는 중...</span>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={isLoginLoading}
              className="px-5 py-2.5 md:px-6 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors text-sm md:text-base"
            >
              {isLoginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <Youtube className="w-4 h-4 md:w-5 md:h-5" />
                  Google 계정으로 로그인
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 현재 채널 정보 */}
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-3 md:mb-4 gap-3">
              <div className="flex items-center gap-3 md:gap-4">
                <img
                  src={currentChannel.thumbnail}
                  alt={currentChannel.title}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full"
                />
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">
                    {currentChannel.title}
                  </h2>
                  <p className="text-sm md:text-base text-gray-600">
                    구독자: {currentChannel.subscriberCount?.toLocaleString() || 'N/A'}명
                  </p>
                </div>
              </div>
              <button
                onClick={handleChannelSwitch}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base w-full md:w-auto justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                채널 전환
              </button>
            </div>

            {/* 개수 선택 + 분석 버튼 */}
            <div className="flex flex-col md:flex-row gap-3">
              <select
                value={selectedCount}
                onChange={(e) => setSelectedCount(Number(e.target.value))}
                className="px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base font-medium"
                disabled={myChannelLoading}
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={30}>30개</option>
                <option value={40}>40개</option>
                <option value={50}>50개</option>
              </select>

              <button
                onClick={loadMyChannelVideos}
                disabled={myChannelLoading}
                className="flex-1 px-5 py-2.5 md:px-6 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm md:text-base"
              >
                {myChannelLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    영상 불러오는 중...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 md:w-5 md:h-5" />
                    영상 분석 시작
                  </>
                )}
              </button>
            </div>

            {/* 자막 수집 진행 상황 */}
            {subtitleProgress.total > 0 && (
              <div className="mt-3 md:mt-4">
                <div className="flex justify-between text-xs md:text-sm text-gray-600 mb-2">
                  <span>자막 수집 중...</span>
                  <span>{subtitleProgress.current} / {subtitleProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(subtitleProgress.current / subtitleProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ⭐ 성과 분석 버튼 (영상이 있을 때만) */}
          {myChannelData && myChannelData.videos && (
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <button
                onClick={analyzeChannelPerformance}
                disabled={detailedAnalysisLoading}
                className="w-full px-5 py-3 md:px-6 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-base md:text-lg font-bold"
              >
                {detailedAnalysisLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                    채널 성과 분석 중...
                  </>
                ) : (
                  <>
                    🔬 채널 성과 분석
                  </>
                )}
              </button>
            </div>
          )}

          {/* ⭐⭐⭐ 분석 결과 (영상 리스트 위에 표시!) ⭐⭐⭐ */}
          {myChannelAnalysis && (
            <div className="space-y-4 md:space-y-6">
              {/* Summary */}
              {myChannelAnalysis.summary && myChannelAnalysis.summary.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-4 md:p-6 border-2 border-blue-200">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-3 md:mb-4 gap-3">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      📋 핵심 인사이트
                    </h3>
                    <button
                      onClick={() => {
                        const insightText = myChannelAnalysis.summary.join('\n\n');
                        navigator.clipboard.writeText(insightText);
                        alert('📋 핵심 인사이트가 클립보드에 복사되었습니다!');
                      }}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm hover:bg-blue-700 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                      📋 복사하기
                    </button>
                  </div>
                  <div className="space-y-2">
                    {myChannelAnalysis.summary.map((item: string, i: number) => (
                      <p key={i} className="text-gray-800 text-sm md:text-lg leading-relaxed">• {item}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* 상위/하위 그룹 영상 리스트 */}
              {myChannelAnalysis.top_group_videos && myChannelAnalysis.bottom_group_videos && (
                <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 border-2 border-gray-200">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">📊 성과 그룹 비교</h3>

                  <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    {/* 상위 그룹 */}
                    <div className="border-2 border-green-200 rounded-lg p-3 md:p-4">
                      <h4 className="font-bold text-green-600 mb-2 md:mb-3 text-sm md:text-base">✅ 상위 그룹 영상</h4>
                      <div className="space-y-2">
                        {myChannelAnalysis.top_group_videos.map((video: any, i: number) => (
                          <div key={i} className="bg-green-50 p-2 md:p-3 rounded-lg">
                            <p className="font-medium text-gray-900 text-xs md:text-sm mb-1 line-clamp-1">{video.title}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="text-gray-600">조회: {video.views.toLocaleString()}</span>
                              <span className="text-gray-600">유효: {video.engaged_views.toLocaleString()}</span>
                              <span className="font-bold text-green-600">지속: {(video.avg_view_pct * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 하위 그룹 */}
                    <div className="border-2 border-red-200 rounded-lg p-3 md:p-4">
                      <h4 className="font-bold text-red-600 mb-2 md:mb-3 text-sm md:text-base">❌ 하위 그룹 영상</h4>
                      <div className="space-y-2">
                        {myChannelAnalysis.bottom_group_videos.map((video: any, i: number) => (
                          <div key={i} className="bg-red-50 p-2 md:p-3 rounded-lg">
                            <p className="font-medium text-gray-900 text-xs md:text-sm mb-1 line-clamp-1">{video.title}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="text-gray-600">조회: {video.views.toLocaleString()}</span>
                              <span className="text-gray-600">유효: {video.engaged_views.toLocaleString()}</span>
                              <span className="font-bold text-red-600">지속: {(video.avg_view_pct * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 상위 그룹 패턴 */}
              {myChannelAnalysis.top_group_patterns && (
                <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 border-2 border-green-200">
                  <h3 className="text-xl md:text-2xl font-bold text-green-600 mb-3 md:mb-4">✅ 상위 그룹 (조회수 높은 영상들의 공통점)</h3>

                  <div className="space-y-3 md:space-y-4">
                    <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">🎬 첫 3초 패턴</p>
                      <p className="text-gray-800 text-sm md:text-base">{myChannelAnalysis.top_group_patterns.first_3_seconds}</p>
                    </div>

                    <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">📖 스토리 구조</p>
                      <p className="text-gray-800 text-sm md:text-base">{myChannelAnalysis.top_group_patterns.story_structure}</p>
                    </div>

                    <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">💭 감정 유발 요소</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {myChannelAnalysis.top_group_patterns.emotion_triggers.map((emotion: string, i: number) => (
                          <span key={i} className="px-2 py-1 md:px-3 bg-white text-green-700 rounded-full text-xs md:text-sm border border-green-300">
                            {emotion}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">💬 자주 쓰이는 핵심 문구</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {myChannelAnalysis.top_group_patterns.key_phrases.map((phrase: string, i: number) => (
                          <span key={i} className="px-2 py-1 md:px-3 bg-white text-green-700 rounded-lg text-xs md:text-sm border border-green-300 font-medium">
                            "{phrase}"
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">🎯 마무리 방식</p>
                      <p className="text-gray-800 text-sm md:text-base">{myChannelAnalysis.top_group_patterns.ending_style}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 하위 그룹 약점 */}
              {myChannelAnalysis.bottom_group_weaknesses && (
                <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 border-2 border-red-200">
                  <h3 className="text-xl md:text-2xl font-bold text-red-600 mb-3 md:mb-4">⚠️ 하위 그룹 (조회수 낮은 영상들의 문제점)</h3>

                  <div className="space-y-3 md:space-y-4">
                    <div className="bg-red-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">❌ 첫 3초 약점</p>
                      <p className="text-gray-800 text-sm md:text-base">{myChannelAnalysis.bottom_group_weaknesses.first_3_seconds}</p>
                    </div>

                    <div className="bg-red-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">❌ 전개 약점</p>
                      <p className="text-gray-800 text-sm md:text-base">{myChannelAnalysis.bottom_group_weaknesses.story_structure}</p>
                    </div>

                    <div className="bg-red-50 p-3 md:p-4 rounded-lg">
                      <p className="font-bold text-gray-900 mb-2 text-sm md:text-base">❌ 놓치고 있는 요소</p>
                      <ul className="space-y-1.5 md:space-y-2">
                        {myChannelAnalysis.bottom_group_weaknesses.missing_elements.map((element: string, i: number) => (
                          <li key={i} className="text-gray-800 text-sm md:text-base flex items-start gap-2">
                            <span className="text-red-600 mt-0.5">▪</span>
                            <span>{element}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 영상별 상세 분석 - 모바일 최적화 필요 */}
              {myChannelAnalysis.video_analysis && myChannelAnalysis.video_analysis.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg shadow-lg p-4 md:p-6 border-2 border-orange-200">
                  <h3 className="text-xl md:text-2xl font-bold text-orange-600 mb-4 md:mb-6">🎯 영상별 구체적 개선안</h3>
                  <div className="space-y-4 md:space-y-6">
                    {myChannelAnalysis.video_analysis.map((video: any, i: number) => (
                      <div key={i} className="bg-white rounded-lg p-3 md:p-5 border-2 border-orange-300">
                        {/* 제목 + 타입 */}
                        <div className="flex items-start justify-between mb-3 md:mb-4 gap-2">
                          <h4 className="font-bold text-gray-900 text-sm md:text-lg flex-1">{video.title}</h4>
                          <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold whitespace-nowrap ${video.type === '대박형' ? 'bg-yellow-100 text-yellow-800' :
                              video.type === '알고리즘선호형' ? 'bg-blue-100 text-blue-800' :
                                video.type === '숨은보석형' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {video.type}
                          </span>
                        </div>

                        {/* 현재 성과 - 8개 지표 (모바일에서 2x4 그리드) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 mb-3 md:mb-4 text-center text-xs md:text-sm">
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">조회수</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{video.current_performance.views.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">유효조회</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{video.current_performance.engaged_views.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">좋아요</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{video.current_performance.likes.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">댓글</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{video.current_performance.comments.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">공유</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{video.current_performance.shares.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">지속률</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{(video.current_performance.avg_view_pct * 100).toFixed(1)}%</p>
                          </div>
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">바이럴</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{(video.current_performance.viral_index * 100).toFixed(1)}%</p>
                          </div>
                          <div className="bg-gray-50 p-1.5 md:p-2 rounded">
                            <p className="text-xs text-gray-600">구독전환</p>
                            <p className="font-bold text-gray-900 text-xs md:text-base">{(video.current_performance.subscriber_conversion_rate * 100).toFixed(3)}%</p>
                          </div>
                        </div>

                        {/* 진단 */}
                        <div className="mb-3 md:mb-4 p-2 md:p-3 bg-blue-50 rounded-lg">
                          <p className="font-semibold text-blue-900 mb-1 text-xs md:text-base">📊 진단</p>
                          <p className="text-gray-800 text-xs md:text-sm">{video.diagnosis}</p>
                        </div>

                        {/* 시청 지속률 피드백 */}
                        {video.retention_feedback && (
                          <div className="mb-3 md:mb-4 p-2 md:p-3 bg-yellow-50 rounded-lg">
                            <p className="font-semibold text-yellow-900 mb-1 text-xs md:text-base">📈 시청 지속률 피드백</p>
                            <p className="text-gray-800 text-xs md:text-sm">{video.retention_feedback}</p>
                          </div>
                        )}

                        {/* 시작 패턴 분석 */}
                        {video.opening_pattern_analysis && (
                          <div className="mb-3 md:mb-4 p-2 md:p-3 bg-purple-50 rounded-lg">
                            <p className="font-semibold text-purple-900 mb-1 text-xs md:text-base">🎬 시작 패턴 분석</p>
                            <p className="text-gray-800 text-xs md:text-sm">{video.opening_pattern_analysis}</p>
                          </div>
                        )}

                        {/* 주요 문제점 */}
                        <div className="mb-3 md:mb-4">
                          <p className="font-semibold text-gray-900 mb-1.5 md:mb-2 text-xs md:text-base">🚨 주요 문제점</p>
                          <ul className="space-y-1">
                            {video.main_issues.map((issue: string, j: number) => (
                              <li key={j} className="text-gray-700 text-xs md:text-sm flex items-start gap-1.5 md:gap-2">
                                <span className="text-red-500 mt-0.5">▪</span>
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 대본 개선안 - 모바일에서 세로 배치 */}
                        <div className="space-y-2 md:space-y-3">
                          <p className="font-semibold text-gray-900 text-xs md:text-base">📝 대본 개선안</p>
                          {video.script_improvements.map((improvement: any, j: number) => (
                            <div key={j} className="bg-orange-50 p-3 md:p-4 rounded-lg">
                              <p className="font-semibold text-orange-900 mb-2 md:mb-3 text-xs md:text-sm">
                                [{improvement.section}]
                              </p>

                              <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 mb-2 md:mb-3">
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">❌ 현재 대본</p>
                                  <p className="text-xs md:text-sm text-gray-800 bg-white p-2 md:p-3 rounded border-l-4 border-red-400">
                                    "{improvement.current_script}"
                                  </p>
                                </div>
                                <div className="mt-2 md:mt-0">
                                  <p className="text-xs text-gray-600 mb-1">✅ 개선 대본</p>
                                  <p className="text-xs md:text-sm text-gray-800 bg-white p-2 md:p-3 rounded border-l-4 border-green-400 font-medium">
                                    "{improvement.improved_script}"
                                  </p>
                                </div>
                              </div>

                              <div className="bg-white p-2 md:p-3 rounded">
                                <p className="text-xs text-gray-600 mb-1">💡 개선 이유</p>
                                <p className="text-xs md:text-sm text-gray-700">{improvement.why}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 예상 효과 */}
                        <div className="mt-3 md:mt-4 p-2 md:p-3 bg-green-50 rounded-lg">
                          <p className="text-xs md:text-sm text-green-800">
                            <strong>📈 예상 효과:</strong> {video.expected_result}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 실행 계획 */}
              {myChannelAnalysis.action_plan && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-lg p-4 md:p-6 border-2 border-purple-200">
                  <h3 className="text-xl md:text-2xl font-bold text-purple-600 mb-3 md:mb-4">📋 실행 계획</h3>
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-lg">
                        1
                      </div>
                      <div className="flex-1 bg-white p-3 md:p-4 rounded-lg">
                        <p className="font-bold text-red-600 mb-1.5 md:mb-2 text-sm md:text-base">🔥 지금 당장</p>
                        <p className="text-gray-800 text-xs md:text-base">{myChannelAnalysis.action_plan.immediate}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-lg">
                        2
                      </div>
                      <div className="flex-1 bg-white p-3 md:p-4 rounded-lg">
                        <p className="font-bold text-orange-600 mb-1.5 md:mb-2 text-sm md:text-base">📅 이번 주 내</p>
                        <p className="text-gray-800 text-xs md:text-base">{myChannelAnalysis.action_plan.short_term}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-lg">
                        3
                      </div>
                      <div className="flex-1 bg-white p-3 md:p-4 rounded-lg">
                        <p className="font-bold text-blue-600 mb-1.5 md:mb-2 text-sm md:text-base">🎯 한 달 안에</p>
                        <p className="text-gray-800 text-xs md:text-base">{myChannelAnalysis.action_plan.long_term}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 영상 테이블 (분석 결과 아래에 표시) - 반응형 적용 */}
          {myChannelData && myChannelData.videos && (
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                📊 영상 데이터 ({myChannelData.videos.length}개)
              </h3>

              {/* 데스크탑용 테이블 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">영상</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">길이</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">조회수</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">유효조회수</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">좋아요</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">댓글</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">공유</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">평균<br />조회율</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">구독자<br />증가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {myChannelData.videos.map((video: any, index: number) => (
                      <Fragment key={index}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-20 h-14 object-cover rounded flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-xs line-clamp-2">
                                  {video.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-gray-500">
                                    {video.days_since_upload}일 전
                                  </p>
                                  {video.script && video.script !== '자막이 없습니다' && video.script !== '자막 추출 실패' && (
                                    <>
                                      <span className="text-gray-300">·</span>
                                      <button
                                        onClick={() => openScriptModal(video.title, video.script)}
                                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        📄 대본 보기
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">{video.duration}초</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="font-semibold text-gray-900">
                              {video.views?.toLocaleString() || '0'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="font-semibold text-blue-600">
                              {video.engagedViews?.toLocaleString() || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.likes.toLocaleString()}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.comments.toLocaleString()}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.shares.toLocaleString()}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.averageViewPercentage !== null
                                ? video.averageViewPercentage.toFixed(1) + '%'
                                : '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.subscribersGained > 0 ? '+' : ''}
                              {video.subscribersGained}
                            </p>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일용 카드 레이아웃 */}
              <div className="md:hidden space-y-3">
                {myChannelData.videos.map((video: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                    {/* 썸네일과 제목 */}
                    <div className="flex gap-3 mb-3">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-28 h-20 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                          {video.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{video.days_since_upload}일 전</span>
                          <span>·</span>
                          <span>{video.duration}초</span>
                        </div>
                      </div>
                    </div>

                    {/* 핵심 지표 (2x2 그리드) */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white border border-gray-200 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                          <Eye className="w-3 h-3 text-gray-900" />
                          <span>조회수</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {video.views?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                          <Eye className="w-3 h-3 text-blue-600" />
                          <span>유효조회</span>
                        </div>
                        <p className="text-sm font-bold text-blue-600">
                          {video.engagedViews?.toLocaleString() || '-'}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                          <ThumbsUp className="w-3 h-3 text-green-600" />
                          <span>좋아요</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {video.likes.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>시청지속률</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {video.averageViewPercentage !== null
                            ? video.averageViewPercentage.toFixed(1) + '%'
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {/* 추가 정보 (접을 수 있는 섹션) */}
                    <details className="text-xs border-t pt-2">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium py-1 flex items-center justify-between">
                        <span>더보기</span>
                        <span className="text-gray-400">▼</span>
                      </summary>
                      <div className="mt-2 space-y-2 pt-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1 text-gray-600">
                            <MessageCircle className="w-3 h-3" />
                            <span>댓글</span>
                          </div>
                          <span className="font-medium text-gray-900">{video.comments.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Share2 className="w-3 h-3" />
                            <span>공유</span>
                          </div>
                          <span className="font-medium text-gray-900">{video.shares.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users className="w-3 h-3" />
                            <span>구독자 증가</span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {video.subscribersGained > 0 ? '+' : ''}
                            {video.subscribersGained}
                          </span>
                        </div>
                      </div>
                    </details>

                    {/* 대본 보기 버튼 */}
                    {video.script && video.script !== '자막이 없습니다' && video.script !== '자막 추출 실패' && (
                      <button
                        onClick={() => openScriptModal(video.title, video.script)}
                        className="w-full mt-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        📄 대본 보기
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 대본 모달 */}
          {isScriptModalOpen && selectedScript && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={closeScriptModal}
              />
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh]">
                <div className="bg-white rounded-xl shadow-2xl mx-4">
                  <div className="flex items-start justify-between p-4 md:p-6 border-b">
                    <div className="flex-1 pr-4">
                      <h3 className="text-base md:text-lg font-bold text-gray-900 break-words">
                        {selectedScript.title}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">대본</p>
                    </div>
                    <button
                      onClick={closeScriptModal}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
                    >
                      <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                  <div className="p-4 md:p-6 overflow-y-auto max-h-[60vh]">
                    <p className="text-gray-800 text-sm md:text-base leading-relaxed break-words whitespace-normal">
                      {selectedScript.script}
                    </p>
                  </div>
                  <div className="p-4 md:p-6 border-t">
                    <button
                      onClick={closeScriptModal}
                      className="w-full py-2.5 md:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm md:text-base font-medium transition"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* 로그인 경고 모달 - 항상 렌더링됨 */}
      <GoogleLoginWarningModal
        isOpen={showLoginWarning}
        onClose={() => setShowLoginWarning(false)}
        onConfirm={() => {
          setShowLoginWarning(false);
          proceedWithLogin();
        }}
      />
    </div>
  );
}