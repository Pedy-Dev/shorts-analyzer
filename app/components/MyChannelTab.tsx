//\app\components\MyChannelTab.tsx

'use client';

import { useState, useEffect, Fragment } from 'react';
import { Youtube, Loader2, RefreshCw, Search, X, Eye, ThumbsUp, Clock, CheckCircle2, TrendingUp, AlertTriangle, Lightbulb, Target, BookOpen, Zap, Award, BarChart3 } from 'lucide-react';
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

  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<{ title: string; script: string } | null>(null);

  const [showLoginWarning, setShowLoginWarning] = useState(false);

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

  const handleGoogleLogin = async () => {
    const hasSeenWarning = localStorage.getItem('login_warning_shown');

    if (!hasSeenWarning) {
      setShowLoginWarning(true);
      return;
    }

    proceedWithLogin();
  };

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

  const handleChannelSwitch = () => {
    setCurrentChannel(null);
    setMyChannelData(null);
    setMyChannelAnalysis(null);
    setAuthStatus('');
    handleGoogleLogin();
  };

  const openScriptModal = (title: string, script: string) => {
    setSelectedScript({ title, script });
    setIsScriptModalOpen(true);
  };

  const closeScriptModal = () => {
    setIsScriptModalOpen(false);
    setSelectedScript(null);
  };

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
      console.log('🤖 채널 성과 분석 시작...');
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
          executive_summary: {
            key_findings: [analysisResult.llm_raw || '분석 결과를 표시할 수 없습니다.']
          }
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

          {/* ⭐ 새로운 분석 결과 UI ⭐ */}

          {/* 5단계 분석 프레임워크 설명 */}
<div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-5 md:p-6">
  <div className="flex items-center gap-3 mb-4">
    <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
    <h3 className="text-xl md:text-2xl font-bold text-gray-900">5단계 채널 정밀 분석</h3>
  </div>
  <p className="text-sm md:text-base text-gray-700 mb-4">
    이 분석은 다음 5단계를 기반으로 채널을 정밀 진단합니다:
  </p>
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
    {/* 1단계 - 파란색 */}
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
        <p className="font-bold text-sm">알고리즘 노출</p>
      </div>
      <p className="text-xs opacity-90">조회수</p>
    </div>
    
    {/* 2단계 - 주황색 */}
    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 bg-white text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
        <p className="font-bold text-sm">후킹 성공</p>
      </div>
      <p className="text-xs opacity-90">이탈 vs 시청</p>
    </div>
    
    {/* 3단계 - 초록색 */}
    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 bg-white text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
        <p className="font-bold text-sm">시청 완주</p>
      </div>
      <p className="text-xs opacity-90">끝까지 봄</p>
    </div>
    
    {/* 4단계 - 보라색 */}
    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 bg-white text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
        <p className="font-bold text-sm">상호작용</p>
      </div>
      <p className="text-xs opacity-90">좋아요/댓글</p>
    </div>
    
    {/* 5단계 - 분홍색 */}
    <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-lg p-4 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 bg-white text-pink-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
        <p className="font-bold text-sm">구독 전환</p>
      </div>
      <p className="text-xs opacity-90">구독 클릭</p>
    </div>
  </div>
  <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
    <p className="text-xs md:text-sm text-blue-800">
      💡 각 단계별 상위 vs 하위 그룹 차이를 분석하여 정확한 문제점을 진단합니다.
    </p>
  </div>
</div>

          {myChannelAnalysis && (
            <div className="space-y-4 md:space-y-6">
              
              {/* 1. 핵심 요약 */}
              {myChannelAnalysis.executive_summary && (
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-2xl p-5 md:p-7">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-7 h-7 md:w-8 md:h-8" />
                    <h3 className="text-2xl md:text-3xl font-black">한눈에 보는 핵심</h3>
                  </div>
                  <div className="space-y-3">
                    {myChannelAnalysis.executive_summary.key_findings?.map((finding: string, i: number) => (
                      <p key={i} className="text-base md:text-lg font-medium leading-relaxed">
                        • {finding}
                      </p>
                    ))}
                  </div>
                  {myChannelAnalysis.executive_summary.next_video_formula && (
                    <div className="mt-5 bg-white/20 backdrop-blur-sm rounded-lg p-4 border-2 border-white/30">
                      <p className="text-yellow-300 font-bold mb-2 text-sm md:text-base">🎯 다음 영상 성공 공식</p>
                      <p className="text-lg md:text-xl font-bold">{myChannelAnalysis.executive_summary.next_video_formula}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. 주제 인사이트 (뭘 만들지) */}
              {myChannelAnalysis.content_analysis && (
                <div className="bg-white rounded-xl shadow-lg border-2 border-emerald-200 p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <Target className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">1. 주제 인사이트: 뭘 만들지?</h3>
                  </div>

                  {/* 소재별 성과 */}
                  {myChannelAnalysis.content_analysis.by_topic && (
                    <div className="mb-6">
                      <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        소재별 성과
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {myChannelAnalysis.content_analysis.by_topic.topics?.map((topic: any, i: number) => (
                          <div key={i} className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-bold text-gray-900 text-base md:text-lg">{topic.topic}</p>
                                <p className="text-xs md:text-sm text-gray-600">{topic.video_count}개 영상</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                topic.type === '안정형' ? 'bg-blue-100 text-blue-700' :
                                topic.type === '알고리즘선호형' ? 'bg-orange-100 text-orange-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {topic.type}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3 text-xs md:text-sm">
                              <div className="bg-white rounded p-2">
                                <p className="text-gray-600 mb-1">조회수</p>
                                <p className="font-bold text-gray-900">{topic.performance.avg_views.toLocaleString()}</p>
                              </div>
                              <div className="bg-white rounded p-2">
                                <p className="text-gray-600 mb-1">시청률</p>
                                <p className="font-bold text-gray-900">{(topic.performance.avg_retention * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                              💡 {topic.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 각도별 성과 */}
                  {myChannelAnalysis.content_analysis.by_angle && (
                    <div className="mb-6">
                      <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-emerald-600" />
                        각도별 성과 ({myChannelAnalysis.content_analysis.by_angle.topic})
                      </h4>
                      <div className="space-y-3">
                        {myChannelAnalysis.content_analysis.by_angle.angles?.map((angle: any, i: number) => (
                          <div key={i} className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-emerald-300 transition">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-bold text-gray-900">{angle.angle}</p>
                              <span className="text-xs font-bold text-emerald-600">{angle.video_count}개</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                              <div className="bg-gray-50 rounded p-2">
                                <p className="text-gray-600">조회수</p>
                                <p className="font-bold text-gray-600">{angle.avg_views.toLocaleString()}</p>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <p className="text-gray-600 ">시청률</p>
                                <p className="font-bold text-gray-600">{(angle.avg_retention * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                            <p className="text-xs md:text-sm text-gray-700 mb-1">
                              <span className="font-medium text-green-600">✅ 강점:</span> {angle.strength}
                            </p>
                            {angle.weakness && (
                              <p className="text-xs md:text-sm text-gray-700 mb-1">
                                <span className="font-medium text-red-600">❌ 약점:</span> {angle.weakness}
                              </p>
                            )}
                            <p className="text-xs md:text-sm text-gray-700">
                              <span className="font-medium text-blue-600">💡 전략:</span> {angle.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                      {myChannelAnalysis.content_analysis.by_angle.best_angle && (
                        <div className="mt-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-4 border-2 border-emerald-400">
                          <p className="font-bold text-emerald-900 mb-1">🏆 최적 각도</p>
                          <p className="text-gray-800 font-medium">{myChannelAnalysis.content_analysis.by_angle.best_angle}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 제목 전략 */}
                  {myChannelAnalysis.content_analysis.by_title && (
                    <div>
                      <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        제목 전략
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <p className="font-bold text-green-900 mb-3">✅ 잘되는 제목 패턴</p>
                          <p className="text-sm text-gray-700 mb-2">평균 길이: {myChannelAnalysis.content_analysis.by_title.top_patterns.avg_length}자</p>
                          <p className="text-sm text-gray-700 mb-3">톤: {myChannelAnalysis.content_analysis.by_title.top_patterns.tone}</p>
                          {myChannelAnalysis.content_analysis.by_title.top_patterns.common_structures?.map((struct: any, i: number) => (
                            <div key={i} className="bg-white rounded p-3 mb-2">
                              <p className="text-sm font-bold text-gray-900 mb-1">{struct.structure} ({struct.frequency}회)</p>
                              <p className="text-xs text-gray-600 mb-1">예: "{struct.example}"</p>
                              <p className="text-xs text-green-700">💡 {struct.why_works}</p>
                            </div>
                          ))}
                          {myChannelAnalysis.content_analysis.by_title.top_patterns.power_keywords && (
                            <div className="mt-3">
                              <p className="text-sm font-bold text-gray-900 mb-2">파워 키워드:</p>
                              <div className="flex flex-wrap gap-2">
                                {myChannelAnalysis.content_analysis.by_title.top_patterns.power_keywords.map((kw: any, i: number) => (
                                  <span key={i} className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-bold">
                                    {kw.keyword} ({kw.frequency})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <p className="font-bold text-red-900 mb-3">❌ 안되는 제목 패턴</p>
                          <p className="text-sm text-gray-700 mb-3">평균 길이: {myChannelAnalysis.content_analysis.by_title.bottom_patterns.avg_length}자</p>
                          {myChannelAnalysis.content_analysis.by_title.bottom_patterns.common_problems?.map((prob: any, i: number) => (
                            <div key={i} className="bg-white rounded p-3 mb-2">
                              <p className="text-sm font-bold text-gray-900 mb-1">{prob.problem}</p>
                              {prob.examples && (
                                <p className="text-xs text-gray-600 mb-1">예: {prob.examples.join(', ')}</p>
                              )}
                              <p className="text-xs text-red-700">❌ {prob.why_fails}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {myChannelAnalysis.content_analysis.by_title.optimal_formula && (
                        <div className="mt-4 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-4 border-2 border-yellow-400">
                          <p className="font-bold text-yellow-900 mb-2">🎯 최적 제목 공식</p>
                          <p className="text-gray-800 font-medium mb-1">구조: {myChannelAnalysis.content_analysis.by_title.optimal_formula.structure}</p>
                          <p className="text-gray-800 font-medium mb-1">길이: {myChannelAnalysis.content_analysis.by_title.optimal_formula.length}</p>
                          <p className="text-sm text-gray-700">
                            필수 요소: {myChannelAnalysis.content_analysis.by_title.optimal_formula.must_include?.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. 패턴 진단 (왜 안됐는지) */}
              {myChannelAnalysis.funnel_analysis && (
                <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">2. 패턴 진단: 왜 안됐는지?</h3>
                  </div>

                  {/* 5단계 깔때기 */}
                  <div className="space-y-3 mb-6">
                    {/* Stage 2: 진지한 시청 */}
                    {myChannelAnalysis.funnel_analysis.stage_2_engagement && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">2</span>
                          진지한 시청 전환율
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">상위 그룹</p>
                            <p className="text-lg font-bold text-green-600">
                              {(myChannelAnalysis.funnel_analysis.stage_2_engagement.top_group_engaged_rate * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">하위 그룹</p>
                            <p className="text-lg font-bold text-red-600">
                              {(myChannelAnalysis.funnel_analysis.stage_2_engagement.bottom_group_engaged_rate * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">💡 {myChannelAnalysis.funnel_analysis.stage_2_engagement.gap}</p>
                      </div>
                    )}

                    {/* Stage 3: 시청 완주 */}
                    {myChannelAnalysis.funnel_analysis.stage_3_retention && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">3</span>
                          시청 완주율
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">상위 그룹</p>
                            <p className="text-lg font-bold text-green-600">
                              {(myChannelAnalysis.funnel_analysis.stage_3_retention.top_group_avg_retention * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">하위 그룹</p>
                            <p className="text-lg font-bold text-red-600">
                              {(myChannelAnalysis.funnel_analysis.stage_3_retention.bottom_group_avg_retention * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">💡 {myChannelAnalysis.funnel_analysis.stage_3_retention.gap}</p>
                      </div>
                    )}

                    {/* Stage 5: 구독 전환 */}
                    {myChannelAnalysis.funnel_analysis.stage_5_subscription && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">5</span>
                          구독 전환율
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">상위 그룹</p>
                            <p className="text-lg font-bold text-green-600">
                              {(myChannelAnalysis.funnel_analysis.stage_5_subscription.top_group_sub_conv * 100).toFixed(3)}%
                            </p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">하위 그룹</p>
                            <p className="text-lg font-bold text-red-600">
                              {(myChannelAnalysis.funnel_analysis.stage_5_subscription.bottom_group_sub_conv * 100).toFixed(3)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">💡 {myChannelAnalysis.funnel_analysis.stage_5_subscription.gap}</p>
                      </div>
                    )}
                  </div>

                  {/* 최우선 개선 포인트 */}
                  {myChannelAnalysis.funnel_analysis.biggest_gap_stage && (
                    <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-lg p-4 border-2 border-red-400">
                      <p className="font-bold text-red-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        최우선 개선 포인트
                      </p>
                      <p className="text-gray-800 font-medium mb-1">{myChannelAnalysis.funnel_analysis.biggest_gap_stage}</p>
                      <p className="text-sm text-gray-700">{myChannelAnalysis.funnel_analysis.priority_fix}</p>
                    </div>
                  )}

                  {/* 시청 완주력 분석 */}
                  {myChannelAnalysis.retention_analysis && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="font-bold text-gray-900 mb-3">📊 시청 완주력 분석</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-green-600 mb-2">✅ 잘되는 영상</p>
                          <p className="text-xs text-gray-700 mb-1">평균 길이: {myChannelAnalysis.retention_analysis.top_group.avg_length}초</p>
                          <p className="text-xs text-gray-700 mb-1">평균 시청률: {(myChannelAnalysis.retention_analysis.top_group.avg_retention * 100).toFixed(1)}%</p>
                          <p className="text-xs text-gray-700">패턴: {myChannelAnalysis.retention_analysis.top_group.pattern}</p>
                        </div>
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-red-600 mb-2">❌ 안되는 영상</p>
                          <p className="text-xs text-gray-700 mb-1">평균 길이: {myChannelAnalysis.retention_analysis.bottom_group.avg_length}초</p>
                          <p className="text-xs text-gray-700 mb-1">평균 시청률: {(myChannelAnalysis.retention_analysis.bottom_group.avg_retention * 100).toFixed(1)}%</p>
                          <p className="text-xs text-gray-700">문제: {myChannelAnalysis.retention_analysis.bottom_group.pattern}</p>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded p-3 border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">💡 핵심 인사이트</p>
                        <p className="text-xs text-gray-700 mb-1">{myChannelAnalysis.retention_analysis.critical_insight}</p>
                        <p className="text-xs font-bold text-blue-700">최적 길이: {myChannelAnalysis.retention_analysis.optimal_length}</p>
                      </div>
                    </div>
                  )}

                  {/* 구독 트리거 */}
                  {myChannelAnalysis.subscription_trigger && (
                    <div className="mt-6 bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="font-bold text-green-900 mb-3 flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        구독 전환 트리거
                      </p>
                      <div className="space-y-2 mb-3">
                        {myChannelAnalysis.subscription_trigger.key_findings?.map((finding: string, i: number) => (
                          <p key={i} className="text-sm text-gray-700">• {finding}</p>
                        ))}
                      </div>
                      {myChannelAnalysis.subscription_trigger.subscription_formula && (
                        <div className="bg-white rounded p-3 border border-green-300">
                          <p className="text-xs font-bold text-green-900 mb-1">✅ 구독 유도 공식</p>
                          <p className="text-sm text-gray-800">{myChannelAnalysis.subscription_trigger.subscription_formula}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. 실행 가이드 (다음엔 어떻게) */}
              {myChannelAnalysis.next_video_blueprint && (
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl shadow-2xl p-5 md:p-7">
                  <div className="flex items-center gap-3 mb-5">
                    <Lightbulb className="w-7 h-7 md:w-8 md:h-8" />
                    <h3 className="text-2xl md:text-3xl font-black">3. 실행 가이드: 다음엔 어떻게?</h3>
                  </div>

                  {/* 소재 선정 */}
                  {myChannelAnalysis.next_video_blueprint.topic_selection && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
                      <p className="font-bold text-yellow-300 mb-3 text-lg">📌 소재 선정</p>
                      <div className="space-y-2 text-sm md:text-base">
                        <p className="font-medium">✅ 1순위: {myChannelAnalysis.next_video_blueprint.topic_selection.primary}</p>
                        <p className="font-medium">✅ 2순위: {myChannelAnalysis.next_video_blueprint.topic_selection.secondary}</p>
                        <p className="font-medium">❌ 피하기: {myChannelAnalysis.next_video_blueprint.topic_selection.avoid}</p>
                      </div>
                    </div>
                  )}

                  {/* 제목 공식 */}
                  {myChannelAnalysis.next_video_blueprint.title_formula && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
                      <p className="font-bold text-yellow-300 mb-3 text-lg">✏️ 제목 전략</p>
                      <div className="space-y-2 text-sm md:text-base">
                        <p><span className="font-medium">구조:</span> {myChannelAnalysis.next_video_blueprint.title_formula.structure}</p>
                        <p><span className="font-medium">길이:</span> {myChannelAnalysis.next_video_blueprint.title_formula.length}</p>
                        {myChannelAnalysis.next_video_blueprint.title_formula.must_keywords && (
                          <p><span className="font-medium">필수 키워드:</span> {myChannelAnalysis.next_video_blueprint.title_formula.must_keywords.join(', ')}</p>
                        )}
                        <div className="bg-white/20 rounded p-3 mt-2">
                          <p className="text-xs opacity-80 mb-1">예시</p>
                          <p className="font-bold text-base md:text-lg">"{myChannelAnalysis.next_video_blueprint.title_formula.example}"</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 대본 구조 */}
                  {myChannelAnalysis.next_video_blueprint.script_structure && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
                      <p className="font-bold text-yellow-300 mb-3 text-lg">📝 대본 구조</p>
                      <div className="space-y-2 text-sm md:text-base">
                        <p><span className="font-medium">오프닝:</span> {myChannelAnalysis.next_video_blueprint.script_structure.opening}</p>
                        <p><span className="font-medium">전개:</span> {myChannelAnalysis.next_video_blueprint.script_structure.development}</p>
                        <p><span className="font-medium">마무리:</span> {myChannelAnalysis.next_video_blueprint.script_structure.ending}</p>
                        <p className="font-bold text-yellow-300">⏱️ 최적 길이: {myChannelAnalysis.next_video_blueprint.script_structure.optimal_length}</p>
                      </div>
                    </div>
                  )}

                  {/* 목표 지표 */}
                  {myChannelAnalysis.next_video_blueprint.target_metrics && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <p className="font-bold text-yellow-300 mb-3 text-lg">🎯 목표 지표</p>
                      <div className="grid grid-cols-3 gap-2 text-xs md:text-sm">
                        <div className="bg-white/20 rounded p-2 text-center">
                          <p className="opacity-80 mb-1">진지한 시청</p>
                          <p className="font-bold">{myChannelAnalysis.next_video_blueprint.target_metrics.engaged_rate}</p>
                        </div>
                        <div className="bg-white/20 rounded p-2 text-center">
                          <p className="opacity-80 mb-1">시청 완주</p>
                          <p className="font-bold">{myChannelAnalysis.next_video_blueprint.target_metrics.retention}</p>
                        </div>
                        <div className="bg-white/20 rounded p-2 text-center">
                          <p className="opacity-80 mb-1">구독 전환</p>
                          <p className="font-bold">{myChannelAnalysis.next_video_blueprint.target_metrics.sub_conversion}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. 체크리스트 */}
              {myChannelAnalysis.checklist && (
                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-gray-700" />
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">제작 전 필수 체크리스트</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myChannelAnalysis.checklist.topic && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">📌</span>
                          소재
                        </p>
                        <div className="space-y-2">
                          {myChannelAnalysis.checklist.topic.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs md:text-sm text-gray-700">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {myChannelAnalysis.checklist.angle && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">🎯</span>
                          각도
                        </p>
                        <div className="space-y-2">
                          {myChannelAnalysis.checklist.angle.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs md:text-sm text-gray-700">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {myChannelAnalysis.checklist.title && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">✏️</span>
                          제목
                        </p>
                        <div className="space-y-2">
                          {myChannelAnalysis.checklist.title.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs md:text-sm text-gray-700">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {myChannelAnalysis.checklist.script && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">📝</span>
                          대본
                        </p>
                        <div className="space-y-2">
                          {myChannelAnalysis.checklist.script.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs md:text-sm text-gray-700">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 영상 테이블 */}
          {myChannelData && myChannelData.videos && (
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                📊 영상 데이터 ({myChannelData.videos.length}개)
              </h3>

              {/* 데스크탑 테이블 */}
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
                                        📄 대본
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

              {/* 모바일 카드 */}
              <div className="md:hidden space-y-3">
                {myChannelData.videos.map((video: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
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

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white border border-gray-200 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                          <Eye className="w-3 h-3" />
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
                          <ThumbsUp className="w-3 h-3" />
                          <span>좋아요</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {video.likes.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                          <Clock className="w-3 h-3" />
                          <span>시청률</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {video.averageViewPercentage !== null
                            ? video.averageViewPercentage.toFixed(1) + '%'
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {video.script && video.script !== '자막이 없습니다' && video.script !== '자막 추출 실패' && (
                      <button
                        onClick={() => openScriptModal(video.title, video.script)}
                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
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