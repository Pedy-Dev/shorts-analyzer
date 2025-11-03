//\app\components\MyChannelTab.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { Youtube, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { getSubtitle } from '../api/youtube';

export default function MyChannelTab() {
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [myChannelLoading, setMyChannelLoading] = useState(false);
  const [myChannelData, setMyChannelData] = useState<any>(null);
  const [myChannelAnalysis, setMyChannelAnalysis] = useState<any>(null);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [detailedAnalysisLoading, setDetailedAnalysisLoading] = useState(false);
  const [subtitleProgress, setSubtitleProgress] = useState({ current: 0, total: 0 });
  const [selectedCount, setSelectedCount] = useState(20);  // 👈 개수 선택 state

  // 🔥 대본 모달 관련 state
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<{ title: string; script: string } | null>(null);

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

  // Google 로그인 함수
  const handleGoogleLogin = async () => {
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

  // 🔥 대본 모달 열기
  const openScriptModal = (title: string, script: string) => {
    setSelectedScript({ title, script });
    setIsScriptModalOpen(true);
  };

  // 🔥 대본 모달 닫기
  const closeScriptModal = () => {
    setIsScriptModalOpen(false);
    setSelectedScript(null);
  };

  // 🔥 내 채널 영상 불러오기 (자막 포함 + 개수 제한)
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

      // 🔥 선택한 개수만큼만 가져오기
      const limitedVideos = analyticsData.videos.slice(0, selectedCount);
      console.log(`📌 ${selectedCount}개로 제한: ${limitedVideos.length}개 영상`);

      // 🔥 자막 수집 시작!
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

      // 자막이 추가된 영상 데이터로 업데이트
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

  // 채널 성과 정밀 분석 (Gemini)
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
      console.log('🤖 Gemini 정밀 분석 시작...');
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
      console.log('✅ Gemini 분석 완료!');

      // JSON 파싱 처리
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
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Youtube className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            내 채널 분석
          </h2>
          <p className="text-gray-600 mb-6">
            YouTube 계정으로 로그인하여 내 채널의 Shorts 영상을 분석하세요
          </p>

          {authStatus && (
            <div className={`mb-4 p-3 rounded-lg ${authStatus.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
              {authStatus}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoginLoading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors"
          >
            {isLoginLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                <Youtube className="w-5 h-5" />
                Google 계정으로 로그인
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* 현재 채널 정보 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img
                  src={currentChannel.thumbnail}
                  alt={currentChannel.title}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentChannel.title}
                  </h2>
                  <p className="text-gray-600">
                    구독자: {currentChannel.subscriberCount?.toLocaleString() || 'N/A'}명
                  </p>
                </div>
              </div>
              <button
                onClick={handleChannelSwitch}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                채널 전환
              </button>
            </div>

            {/* 🔥 개수 선택 + 분석 버튼 */}
            <div className="flex gap-3">
              <select
                value={selectedCount}
                onChange={(e) => setSelectedCount(Number(e.target.value))}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium"
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
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {myChannelLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    영상 불러오는 중...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    영상 분석 시작
                  </>
                )}
              </button>
            </div>

            {/* 🔥 자막 수집 진행 상황 표시 */}
            {subtitleProgress.total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
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

          {/* 영상 리스트 */}
          {myChannelData && myChannelData.videos && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  📊 영상 분석 결과 ({myChannelData.videos.length}개)
                </h3>

                <button
                  onClick={analyzeChannelPerformance}
                  disabled={true}  // 👈 항상 비활성화
                  className="px-6 py-3 bg-gray-400 text-gray-300 rounded-lg cursor-not-allowed flex items-center gap-2 transition-colors"
                  title="준비 중입니다"  // 👈 마우스 올렸을 때 설명
                >
                  {detailedAnalysisLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      정밀 분석 중...
                    </>
                  ) : (
                    <>
                      🔍 채널 성과 정밀 분석
                    </>
                  )}
                </button>
              </div>

              {/* 영상 테이블 */}
              <div className="overflow-x-auto">
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
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">평균<br />시청시간</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">평균 조회율</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">구독자<br />증가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {myChannelData.videos.map((video: any, index: number) => (
                      <Fragment key={index}>
                        <tr className="hover:bg-gray-50">
                          {/* 영상 정보 */}
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
                                  {/* 🔥 대본 보기 버튼 */}
                                  {video.script && video.script !== '자막이 없습니다' && video.script !== '자막 추출 실패' && (
                                    <>
                                      <span className="text-gray-300">·</span>
                                      <button
                                        onClick={() => openScriptModal(video.title, video.script)}
                                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        📝 대본 보기
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 길이 */}
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">{video.duration}초</p>
                          </td>

                          {/* 조회수 */}
                          <td className="px-4 py-3 text-center">
                            <p className="font-semibold text-gray-900">
                              {video.views?.toLocaleString() || '0'}
                            </p>
                          </td>

                          {/* 유효조회수 */}
                          <td className="px-4 py-3 text-center">
                            <p className="font-semibold text-blue-600">
                              {video.engagedViews?.toLocaleString() || '-'}
                            </p>
                          </td>

                          {/* 좋아요 */}
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.likes.toLocaleString()}
                            </p>
                          </td>

                          {/* 댓글 */}
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.comments.toLocaleString()}
                            </p>
                          </td>

                          {/* 공유 */}
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.shares.toLocaleString()}
                            </p>
                          </td>

                          {/* 평균 시청시간 */}
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.averageViewDuration !== null
                                ? video.averageViewDuration.toFixed(1) + '초'
                                : '-'}
                            </p>
                          </td>

                          {/* 평균 조회율 */}
                          <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">
                              {video.averageViewPercentage !== null
                                ? video.averageViewPercentage.toFixed(1) + '%'
                                : '-'}
                            </p>
                          </td>

                          {/* 구독자 증가 */}
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
            </div>
          )}

          {/* 🔥 대본 모달 */}
          {isScriptModalOpen && selectedScript && (
            <>
              {/* 배경 어둡게 */}
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={closeScriptModal}
              />

              {/* 모달 창 */}
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh]">
                <div className="bg-white rounded-xl shadow-2xl mx-4">
                  {/* 헤더 */}
                  <div className="flex items-start justify-between p-6 border-b">
                    <div className="flex-1 pr-4">
                      <h3 className="text-lg font-bold text-gray-900 break-words">
                        {selectedScript.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">대본</p>
                    </div>
                    <button
                      onClick={closeScriptModal}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* 대본 내용 */}
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <p className="text-gray-800 leading-relaxed break-words whitespace-normal">
                      {selectedScript.script}
                    </p>
                  </div>

                  {/* 닫기 버튼 */}
                  <div className="p-6 border-t">
                    <button
                      onClick={closeScriptModal}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 정밀 분석 결과 */}
          {myChannelAnalysis && (
            <div className="space-y-6">
              {/* Summary */}
              {myChannelAnalysis.summary && myChannelAnalysis.summary.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">📋 종합 요약</h3>
                  <div className="space-y-2">
                    {myChannelAnalysis.summary.map((item: string, i: number) => (
                      <p key={i} className="text-gray-800">• {item}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Videos */}
              {myChannelAnalysis.top_videos && myChannelAnalysis.top_videos.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">🏆 성과 우수 영상</h3>
                  <div className="space-y-4">
                    {myChannelAnalysis.top_videos.map((video: any, i: number) => (
                      <div key={i} className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4">
                        <h4 className="font-bold text-gray-900 mb-2">{video.title}</h4>
                        <div className="grid grid-cols-4 gap-2 mb-2 text-sm">
                          <div className="text-center">
                            <p className="text-xs text-gray-700">CTR</p>
                            <p className="font-bold text-green-600">
                              {(video.key_metrics.ctr_proxy * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-700">시청률</p>
                            <p className="font-bold text-green-600">
                              {(video.key_metrics.avg_view_pct * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-700">참여율</p>
                            <p className="font-bold text-green-600">
                              {(video.key_metrics.engagement_rate * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-700">조회수</p>
                            <p className="font-bold text-green-600">
                              {video.key_metrics.views.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800">
                          <strong>성공 요인:</strong> {video.why_it_worked}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Videos */}
              {myChannelAnalysis.bottom_videos && myChannelAnalysis.bottom_videos.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">📉 개선 필요 영상</h3>
                  <div className="space-y-4">
                    {myChannelAnalysis.bottom_videos.map((video: any, i: number) => (
                      <div key={i} className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4">
                        <h4 className="font-bold text-gray-900 mb-2">{video.title}</h4>
                        <div className="grid grid-cols-4 gap-2 mb-2 text-sm">
                          <div className="text-center">
                            <p className="text-xs text-gray-700">CTR</p>
                            <p className="font-bold text-red-600">
                              {(video.key_metrics.ctr_proxy * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-700">시청률</p>
                            <p className="font-bold text-red-600">
                              {(video.key_metrics.avg_view_pct * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-700">참여율</p>
                            <p className="font-bold text-red-600">
                              {(video.key_metrics.engagement_rate * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-700">조회수</p>
                            <p className="font-bold text-red-600">
                              {video.key_metrics.views.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${video.main_issue === 'entry' ? 'bg-red-200 text-red-800' :
                            video.main_issue === 'completion' ? 'bg-orange-200 text-orange-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                            {video.main_issue === 'entry' ? '진입력' :
                              video.main_issue === 'completion' ? '완주력' : '참여력'} 문제
                          </span>
                        </div>
                        <div className="text-sm text-gray-800">
                          <strong>개선 방안:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {video.fix_suggestions.map((suggestion: string, j: number) => (
                              <li key={j}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experiments */}
              {myChannelAnalysis.experiments_top5 && myChannelAnalysis.experiments_top5.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">💡 실험 제안 TOP 5</h3>
                  <div className="space-y-4">
                    {myChannelAnalysis.experiments_top5.map((exp: any, i: number) => (
                      <div key={i} className="bg-white rounded-lg p-4 border border-indigo-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-2">{exp.name}</h4>
                            <div className="grid md:grid-cols-3 gap-2 text-sm mb-2">
                              <div>
                                <span className="text-gray-700">대상: </span>
                                <span className="font-medium text-gray-900">{exp.target}</span>
                              </div>
                              <div>
                                <span className="text-gray-700">기대 효과: </span>
                                <span className="font-medium text-green-600">{exp.expected_gain}</span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-800">
                              <strong>방법:</strong> {exp.how}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C Adjustment Suggestion */}
              {myChannelAnalysis.c_adjust_suggestion && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">⚙️ 계수 조정 제안</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-gray-700">Delta C:</span>
                      <span className={`text-2xl font-bold ${myChannelAnalysis.c_adjust_suggestion.delta_c > 0 ? 'text-green-600' :
                        myChannelAnalysis.c_adjust_suggestion.delta_c < 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                        {myChannelAnalysis.c_adjust_suggestion.delta_c > 0 ? '+' : ''}
                        {myChannelAnalysis.c_adjust_suggestion.delta_c.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">
                      {myChannelAnalysis.c_adjust_suggestion.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Raw JSON (개발자용 - 나중에 삭제 가능) */}
              <div className="bg-gray-100 rounded-lg p-4">
                <details>
                  <summary className="cursor-pointer font-medium text-gray-900 mb-2">
                    🔧 개발자 모드 (JSON 데이터)
                  </summary>
                  <pre className="text-xs text-gray-800 overflow-x-auto">
                    {JSON.stringify(myChannelAnalysis, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </>
      )
      }
    </div >
  );
}