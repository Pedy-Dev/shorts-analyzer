//\app\components\MyChannelTab.tsx

'use client';

import { useState, useEffect, Fragment } from 'react';
import { Youtube, Loader2, RefreshCw, Search, X, Eye, ThumbsUp, Clock, BarChart3, Award, Info, BookOpen, TrendingUp } from 'lucide-react';
import { getSubtitle } from '../api/youtube';
import GoogleLoginWarningModal from './GoogleLoginWarningModal';
import MyChannelAnalysisView from './MyChannelAnalysisView';

interface MyChannelTabProps {
  isLoggedIn: boolean;
}

export default function MyChannelTab({ isLoggedIn }: MyChannelTabProps) {
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

  // 영상 리스트 정렬 기준
  const [sortBy, setSortBy] = useState<'latest' | 'views' | 'likes' | 'comments'>('latest');

  // v2: 시점별 데이터 (48h/7d) 기능 재도입 예정
  // const [timepoint, setTimepoint] = useState<'current' | '48h' | '7d'>('current');

  // 👇 Phase 3: 여러 채널 관리
  const [connectedChannels, setConnectedChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  useEffect(() => {
    // 로그인되어 있으면 자동으로 채널 정보 로드
    if (isLoggedIn) {
      loadConnectedChannels();
    }
  }, [isLoggedIn]);

  const loadConnectedChannels = async () => {
    try {
      console.log('📌 연결된 채널 목록 로딩 시작...');
      const response = await fetch('/api/my-channels/list');

      // 디버깅: 응답 상태 확인
      console.log('📌 API 응답 상태:', response.status, response.statusText);

      const data = await response.json();

      // 디버깅: 전체 응답 데이터
      console.log('📌 전체 응답 데이터:', data);

      if (data.success && data.channels && data.channels.length > 0) {
        console.log(`✅ ${data.channels.length}개 채널 로드 완료:`);

        // 디버깅: 각 채널 정보 상세 출력
        data.channels.forEach((ch: any, idx: number) => {
          console.log(`  [${idx + 1}] ${ch.youtube_channel_title} (ID: ${ch.youtube_channel_id}, is_default: ${ch.is_default})`);
        });

        setConnectedChannels(data.channels);

        // 기본 채널 자동 선택
        const defaultChannel = data.channels.find((ch: any) => ch.is_default) || data.channels[0];
        setSelectedChannelId(defaultChannel.id);

        // 기존 currentChannel 형식으로도 저장 (호환성)
        setCurrentChannel({
          id: defaultChannel.youtube_channel_id,
          title: defaultChannel.youtube_channel_title,
          thumbnail: defaultChannel.youtube_channel_thumbnail,
        });

        console.log('✅ 기본 채널 선택:', defaultChannel.youtube_channel_title);
      } else {
        console.log('⚠️ 연결된 채널 없음 또는 오류:', {
          success: data.success,
          channelsLength: data.channels?.length,
          error: data.error
        });
        setConnectedChannels([]);
        setCurrentChannel(null);
      }
    } catch (error) {
      console.error('❌ 채널 목록 로딩 실패:', error);
      setConnectedChannels([]);
      setCurrentChannel(null);
    }
  };


  const handleGoogleLogin = async () => {
    // 로그인 체크
    if (!isLoggedIn) {
      alert('⚠️ 먼저 사이트에 로그인해주세요.\n\n상단의 로그인 버튼을 눌러 로그인한 후 내 채널을 연결할 수 있습니다.');
      return;
    }

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
      // YouTube 권한 요청 (type=youtube)
      const response = await fetch('/api/auth/google?type=youtube');
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

  // 👇 Phase 3: 채널 선택 변경 핸들러
  const handleChannelChange = (channelId: string) => {
    const selected = connectedChannels.find(ch => ch.id === channelId);
    if (selected) {
      setSelectedChannelId(channelId);
      setCurrentChannel({
        id: selected.youtube_channel_id,
        title: selected.youtube_channel_title,
        thumbnail: selected.youtube_channel_thumbnail,
      });
      // 분석 데이터 초기화 (다른 채널이므로)
      setMyChannelData(null);
      setMyChannelAnalysis(null);
      console.log('✅ 채널 전환:', selected.youtube_channel_title);
    }
  };

  const openScriptModal = (title: string, script: string) => {
    setSelectedScript({ title, script });
    setIsScriptModalOpen(true);
  };

  // v2: 시점별 메트릭 선택 기능 재도입 예정
  // const getMetricsForTimepoint = (video: any) => {
  //   if (timepoint === '48h') return video.metrics_48h;
  //   else if (timepoint === '7d') return video.metrics_7d;
  //   else return video.metrics_current;
  // };

  // v1: 현재는 metrics_current만 사용
  const getMetricsForTimepoint = (video: any) => {
    return video.metrics_current;
  };

  // 영상 리스트 정렬 함수
  const getSortedVideos = () => {
    if (!myChannelData || !myChannelData.videos) return [];

    const videosCopy = [...myChannelData.videos];

    switch (sortBy) {
      case 'latest':
        // 최신순 (days_since_upload 기준 오름차순 - 작은 값이 최신)
        return videosCopy.sort((a, b) => a.days_since_upload - b.days_since_upload);
      case 'views':
        // 🆕 선택된 시점의 조회수 기준 내림차순
        return videosCopy.sort((a, b) => {
          const metricsA = getMetricsForTimepoint(a);
          const metricsB = getMetricsForTimepoint(b);
          return (metricsB?.views || 0) - (metricsA?.views || 0);
        });
      case 'likes':
        // 🆕 선택된 시점의 좋아요 기준 내림차순
        return videosCopy.sort((a, b) => {
          const metricsA = getMetricsForTimepoint(a);
          const metricsB = getMetricsForTimepoint(b);
          return (metricsB?.likes || 0) - (metricsA?.likes || 0);
        });
      case 'comments':
        // 🆕 선택된 시점의 댓글 기준 내림차순
        return videosCopy.sort((a, b) => {
          const metricsA = getMetricsForTimepoint(a);
          const metricsB = getMetricsForTimepoint(b);
          return (metricsB?.comments || 0) - (metricsA?.comments || 0);
        });
      default:
        return videosCopy;
    }
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
      // ⭐ 선택된 채널 ID를 함께 전송
      const analyticsResponse = await fetch('/api/youtube-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelRecordId: selectedChannelId,  // user_channels 테이블의 ID
        }),
      });

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


    if (!myChannelData || !myChannelData.videos) {
      alert('⚠️ 먼저 영상 데이터를 불러와주세요.');
      return;
    }

    // 🆕 7일 이상 경과한 영상만 필터링 (days_since_upload 기준)
    const matureVideos = myChannelData.videos.filter((v: any) => {
      const days = v.days_since_upload ?? 0;  // 값 없으면 0일 취급
      return days >= 7;
    });

    console.log(`📊 전체 영상: ${myChannelData.videos.length}개`);
    console.log(`📊 7일 이상 경과: ${matureVideos.length}개`);
    console.log(`⏰ 제외된 최근 영상: ${myChannelData.videos.length - matureVideos.length}개`);

    if (matureVideos.length < 10) {
      alert(`⚠️ 분석 가능한 영상이 부족합니다.\n\n7일 이상 경과한 영상: ${matureVideos.length}개\n최소 필요: 10개\n\n최근 ${myChannelData.videos.length - matureVideos.length}개 영상은 성과 데이터가 안정화되지 않아 제외됩니다.`);
      return;
    }

    setDetailedAnalysisLoading(true);
    setMyChannelAnalysis(null);

    try {
      console.log('�� 채널 성과 분석 시작...');
      const analysisResponse = await fetch('/api/analyze-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videos: matureVideos,  // 🆕 7일 이상 경과한 영상만 전송
          channelInfo: myChannelData.channel,
          channelRecordId: selectedChannelId,  // ⭐ 채널 ID 추가
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

      // ⭐ Archive v1: 내 채널 분석 기록 저장 (타 채널과 동일한 방식)
      try {
        // 상위/하위 영상 요약
        const sortedVideos = [...(myChannelData.videos || [])].sort((a, b) =>
          (b.engagedViews || 0) - (a.engagedViews || 0)
        );
        const topCount = Math.ceil(sortedVideos.length * 0.3);
        const topVideos = sortedVideos.slice(0, topCount);
        const bottomVideos = sortedVideos.slice(-topCount);

        const saveResponse = await fetch('/api/save-analysis-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // 채널 정보
            channelId: currentChannel?.id || '',
            channelTitle: currentChannel?.title || '',
            channelThumbnail: currentChannel?.thumbnail || '',
            subscriberCount: myChannelData.channel?.subscriberCount || 0,
            isOwnChannel: true,  // ⭐ 내 채널 분석

            // 메타데이터
            ytCategory: myChannelData.channel?.category || 'Unknown',
            creatorCategory: 'Unknown',  // 나중에 AI 분류 추가
            videoCount: myChannelData.videos?.length || 0,

            // ⭐ 타 채널 방식과 동일: 전체 분석 결과 저장
            analysisResult: analysisResult.llm || {},  // 전체 JSON
            analysisRaw: null,  // 내 채널 분석은 Gemini 원본 응답 없음

            topVideosSummary: topVideos.map(v => ({
              videoId: v.video_id,
              title: v.title,
              views: v.views || 0,
              likes: v.likes || 0,
              comments: v.comments || 0,
              likeRate: (v.likes / (v.views || 1)) * 100 || 0,
              duration: v.duration || 0,
              engagedViews: v.engagedViews || 0,
              averageViewPercentage: v.metrics_current?.averageViewPercentage || 0
            })),

            bottomVideosSummary: bottomVideos.map(v => ({
              videoId: v.video_id,
              title: v.title,
              views: v.views || 0,
              likes: v.likes || 0,
              comments: v.comments || 0,
              likeRate: (v.likes / (v.views || 1)) * 100 || 0,
              duration: v.duration || 0,
              engagedViews: v.engagedViews || 0,
              averageViewPercentage: v.metrics_current?.averageViewPercentage || 0
            }))
          }),
        });

        const saveData = await saveResponse.json();

        if (saveResponse.ok && saveData.success) {
          console.log('✅ 내 채널 분석 기록 저장 완료:', {
            id: saveData.data?.id,
            category: saveData.category
          });
        } else {
          console.error('❌ 분석 기록 저장 실패:', saveData.error);
        }
      } catch (saveError) {
        console.error('❌ 분석 기록 저장 중 오류:', saveError);
        // 저장 실패해도 분석 결과는 정상적으로 표시
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
            내 채널 데이터를 분석하려면 분석하고자 하는 유튜브 계정을 연결해주세요.
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
                  채널 연결 중...
                </>
              ) : (
                <>
                  <Youtube className="w-4 h-4 md:w-5 md:h-5" />
                  내 채널 불러오기
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-3 md:mb-4 gap-3">
              <div className="flex items-center gap-3 md:gap-4 flex-1">
                <img
                  src={currentChannel.thumbnail}
                  alt={currentChannel.title}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full"
                />
                <div className="flex-1">
                  {/* 👇 Phase 3: 여러 채널이 있으면 드롭다운, 없으면 제목만 */}
                  {connectedChannels.length > 1 ? (
                    <>
                      <label className="text-xs text-gray-500 mb-1 block">분석할 채널 선택</label>
                      <select
                        value={selectedChannelId || ''}
                        onChange={(e) => handleChannelChange(e.target.value)}
                        className="text-lg md:text-xl font-bold text-gray-900 border-2 border-gray-200 rounded-lg px-3 py-1 w-full max-w-md hover:border-red-400 focus:border-red-500 focus:outline-none transition-colors"
                      >
                        {connectedChannels.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.youtube_channel_title} {ch.is_default ? '⭐' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        총 {connectedChannels.length}개 채널 연결됨
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg md:text-xl font-bold text-gray-900">
                        {currentChannel.title}
                      </h2>
                      <p className="text-sm md:text-base text-gray-600">
                        구독자: {currentChannel.subscriberCount?.toLocaleString() || 'N/A'}명
                      </p>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={handleChannelSwitch}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base w-full md:w-auto justify-center whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                + 다른 채널 연결
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
                  <span>데이터 수집 중...</span>
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

          {myChannelData && myChannelData.videos && (() => {
            // 분석 가능한 영상 수 계산 (days_since_upload 기준)
            const matureCount = myChannelData.videos.filter((v: any) => {
              const days = v.days_since_upload ?? 0;
              return days >= 7;
            }).length;
            const totalCount = myChannelData.videos.length;
            const recentCount = totalCount - matureCount;

            return (
              <>
                {/* 분석 가능 영상 안내 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                  <div className="flex items-start gap-2 md:gap-3">
                    <Info className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm md:text-base font-medium text-blue-900">
                        분석 대상: <span className="font-bold">{matureCount}개</span> / 전체 {totalCount}개
                      </p>
                      <p className="text-xs md:text-sm text-blue-700 mt-1">
                        게시 7일 이상 경과한 영상만 분석하여 더 정확한 인사이트를 제공합니다
                        {recentCount > 0 && ` (최근 ${recentCount}개 영상 제외)`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 채널 정밀 분석 버튼 */}
                <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                  <button
                    onClick={analyzeChannelPerformance}
                    disabled={detailedAnalysisLoading || matureCount < 10}
                    className="w-full px-5 py-3 md:px-6 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-base md:text-lg font-bold"
                  >
                    {detailedAnalysisLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                        채널 정밀 분석 중...
                      </>
                    ) : (
                      <>
                        📊 채널 정밀 분석
                        {matureCount >= 10 && (
                          <span className="text-xs md:text-sm opacity-90">
                            ({matureCount}개 영상)
                          </span>
                        )}
                      </>
                    )}
                  </button>
                  {matureCount < 10 && (
                    <p className="text-xs md:text-sm text-red-600 text-center mt-2">
                      ⚠️ 분석하려면 7일 이상 경과한 영상이 최소 10개 필요합니다 (현재: {matureCount}개)
                    </p>
                  )}
                </div>
              </>
            );
          })()}

          {/* ⭐ 분석 결과 UI (공용 컴포넌트 사용) ⭐ */}
          {myChannelAnalysis && (
            <MyChannelAnalysisView analysisData={myChannelAnalysis} />
          )}

          {/* 영상 테이블 */}
          {myChannelData && myChannelData.videos && (
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-4 gap-3">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                  📊 영상 데이터 ({myChannelData.videos.length}개)
                </h3>

                {/* v2: 시점별 데이터 선택 드롭다운 재도입 예정 */}
                {/* <div className="flex items-center gap-3 flex-wrap"> */}
                  {/* 시점 선택 */}
                  {/* <div className="flex items-center gap-2">
                    <label htmlFor="timepoint-select" className="text-sm text-gray-600 whitespace-nowrap">
                      시점:
                    </label>
                    <select
                      id="timepoint-select"
                      value={timepoint}
                      onChange={(e) => setTimepoint(e.target.value as 'current' | '48h' | '7d')}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="current">🔴 현재</option>
                      <option value="48h">⏱️ 48시간 후</option>
                      <option value="7d">📅 7일 후</option>
                    </select>
                  </div> */}

                <div className="flex items-center gap-3 flex-wrap">
                  {/* 정렬 선택 */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="my-channel-sort-select" className="text-sm text-gray-600 whitespace-nowrap">
                      정렬:
                    </label>
                    <select
                      id="my-channel-sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'latest' | 'views' | 'likes' | 'comments')}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="latest">📅 최신순</option>
                      <option value="views">👁️ 조회수 순</option>
                      <option value="likes">👍 좋아요 순</option>
                      <option value="comments">💬 댓글 순</option>
                    </select>
                  </div>
                </div>
              </div>

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
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">공유수</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">평균<br />시청시간</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">평균<br />조회율</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">구독자<br />증가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getSortedVideos().map((video: any, index: number) => {
                      // 🆕 선택된 시점의 메트릭 가져오기
                      const metrics = getMetricsForTimepoint(video);

                      return (
                        <Fragment key={index}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-3">
                                {/* 썸네일 - 클릭 시 유튜브 쇼츠로 이동 */}
                                <a
                                  href={`https://www.youtube.com/shorts/${video.video_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative w-20 h-14 flex-shrink-0 rounded overflow-hidden group cursor-pointer"
                                >
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                  />
                                  {/* Hover 오버레이 */}
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                                    <span className="text-white font-semibold text-xs">
                                      ▶
                                    </span>
                                  </div>
                                </a>
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
                                {metrics?.views?.toLocaleString() || '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="font-semibold text-blue-600">
                                {metrics?.engagedViews?.toLocaleString() || '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="text-gray-700">
                                {metrics?.likes?.toLocaleString() || '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="text-gray-700">
                                {metrics?.comments?.toLocaleString() || '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="text-gray-700">
                                {metrics?.shares?.toLocaleString() || '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="text-gray-700">
                                {metrics?.averageViewDuration ? Math.round(metrics.averageViewDuration) + '초' : '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="text-gray-700">
                                {metrics?.averageViewPercentage !== null && metrics?.averageViewPercentage !== undefined
                                  ? metrics.averageViewPercentage.toFixed(1) + '%'
                                  : '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="text-gray-700">
                                {metrics?.subscribersGained !== null && metrics?.subscribersGained !== undefined
                                  ? (metrics.subscribersGained > 0 ? '+' : '') + metrics.subscribersGained
                                  : '-'}
                              </p>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden space-y-3">
                {getSortedVideos().map((video: any, index: number) => {
                  // 🆕 선택된 시점의 메트릭 가져오기
                  const metrics = getMetricsForTimepoint(video);

                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex gap-3 mb-3">
                        {/* 썸네일 - 클릭 시 유튜브 쇼츠로 이동 */}
                        <a
                          href={`https://www.youtube.com/shorts/${video.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative w-28 h-20 flex-shrink-0 rounded overflow-hidden group cursor-pointer"
                        >
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          {/* Hover 오버레이 */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                            <span className="text-white font-semibold text-sm">
                              ▶ 영상보기
                            </span>
                          </div>
                        </a>
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
                        {/* 1. 조회수 - 회색 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <Eye className="w-3 h-3 text-gray-500" />
                            <span>조회수</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.views?.toLocaleString() || '-'}
                          </p>
                        </div>

                        {/* 2. 유효조회 - 파란색 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <Eye className="w-3 h-3 text-blue-500" />
                            <span>유효조회</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.engagedViews?.toLocaleString() || '-'}
                          </p>
                        </div>

                        {/* 3. 좋아요 - 핑크 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <ThumbsUp className="w-3 h-3 text-pink-500" />
                            <span>좋아요</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.likes?.toLocaleString() || '-'}
                          </p>
                        </div>

                        {/* 4. 댓글 - 주황 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <BookOpen className="w-3 h-3 text-orange-500" />
                            <span>댓글</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.comments?.toLocaleString() || '-'}
                          </p>
                        </div>

                        {/* 5. 공유수 - 청록 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <TrendingUp className="w-3 h-3 text-teal-500" />
                            <span>공유수</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.shares?.toLocaleString() || '-'}
                          </p>
                        </div>

                        {/* 6. 시청시간 - 남색 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            <span>시청시간</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.averageViewDuration ? Math.round(metrics.averageViewDuration) + '초' : '-'}
                          </p>
                        </div>

                        {/* 7. 시청률 - 초록 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <BarChart3 className="w-3 h-3 text-green-500" />
                            <span>시청률</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.averageViewPercentage !== null && metrics?.averageViewPercentage !== undefined
                              ? metrics.averageViewPercentage.toFixed(1) + '%'
                              : '-'}
                          </p>
                        </div>

                        {/* 8. 구독증가 - 보라 */}
                        <div className="bg-white border border-gray-200 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-0.5">
                            <Award className="w-3 h-3 text-purple-500" />
                            <span>구독증가</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">
                            {metrics?.subscribersGained !== null && metrics?.subscribersGained !== undefined
                              ? (metrics.subscribersGained > 0 ? '+' : '') + metrics.subscribersGained
                              : '-'}
                          </p>
                        </div>
                      </div>

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
                  );
                })}
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