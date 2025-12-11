'use client';

import { useState } from 'react';
import { Search, Loader2, Calendar, Clock, Eye, ThumbsUp, MessageCircle, Tag, Info } from 'lucide-react';
import { getChannelId, getChannelShorts, formatDate, getSubtitle } from '../api/youtube';
import ChannelAnalysisView from './ChannelAnalysisView';
import type { VideoSummary } from '../types/analysis';

interface ChannelAnalysisTabProps {
  isLoggedIn: boolean;
}

export default function ChannelAnalysisTab({ isLoggedIn }: ChannelAnalysisTabProps) {
  const [channelUrl, setChannelUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [generatedGuideline, setGeneratedGuideline] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [analysisHistoryId, setAnalysisHistoryId] = useState<string | null>(null); // DB 저장된 record ID

  // 영상 스냅샷 (실시간 화면 = DB 저장 = 히스토리 화면 1:1 일치)
  const [topVideosSummary, setTopVideosSummary] = useState<VideoSummary[]>([]);
  const [bottomVideosSummary, setBottomVideosSummary] = useState<VideoSummary[]>([]);

  const [selectedCount, setSelectedCount] = useState(20);
  const [expandedTags, setExpandedTags] = useState<{ [key: string]: boolean }>({});

  // 영상 리스트 정렬 기준
  const [sortBy, setSortBy] = useState<'latest' | 'views' | 'likes' | 'comments'>('latest');

  // 채널 검색 관련 상태
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleTags = (videoId: string) => {
    setExpandedTags(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  // 채널 검색 함수
  const handleSearchChannels = async () => {
    const query = channelUrl.trim();
    if (!query) {
      alert('채널 URL 또는 채널명을 입력해주세요!');
      return;
    }

    // URL 형식이면 바로 분석, 아니면 검색
    if (query.includes('youtube.com') || query.includes('youtu.be') || query.startsWith('@')) {
      handleAnalyze();
      return;
    }

    const youtubeApiKey = localStorage.getItem('youtube_api_key') || '';

    // 채널명으로 검색
    setSearching(true);
    setSearchResults([]);
    setHasSearched(false);

    try {
      console.log('🔍 채널 검색 중:', query);
      const response = await fetch('/api/search-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, apiKey: youtubeApiKey })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '채널 검색 실패');
      }

      if (data.channels && data.channels.length > 0) {
        // 검색어와 정확히 일치하는 채널만 필터링
        const normalizedQuery = query.toLowerCase().trim();
        const exactMatches = data.channels.filter((channel: any) => {
          const channelTitle = channel.title.toLowerCase().trim();
          return channelTitle === normalizedQuery;
        });

        if (exactMatches.length > 0) {
          setSearchResults(exactMatches);
          console.log(`✅ ${exactMatches.length}개 정확히 일치하는 채널 발견`);
        } else {
          setSearchResults([]);
          console.log('⚠️ 정확히 일치하는 채널이 없습니다');
        }
      } else {
        setSearchResults([]);
      }
      setHasSearched(true);
    } catch (error: any) {
      console.error('❌ 채널 검색 오류:', error);
      alert('채널 검색 중 오류가 발생했습니다:\n' + error.message);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  };

  // 검색 결과에서 채널 선택
  const handleSelectChannel = (channelId: string) => {
    const newUrl = `https://www.youtube.com/channel/${channelId}`;
    setChannelUrl(newUrl);
    setSearchResults([]);
    setHasSearched(false);
    // URL을 직접 전달하여 분석 시작
    handleAnalyze(newUrl);
  };

  // 영상 리스트 정렬 함수
  const getSortedVideos = () => {
    const videosCopy = [...videos];

    switch (sortBy) {
      case 'latest':
        // 최신순 (날짜 기준 내림차순)
        return videosCopy.sort((a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      case 'views':
        // 조회수 기준 내림차순
        return videosCopy.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'likes':
        // 좋아요 기준 내림차순
        return videosCopy.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'comments':
        // 댓글 기준 내림차순
        return videosCopy.sort((a, b) => (b.comments || 0) - (a.comments || 0));
      default:
        return videosCopy;
    }
  };

  const calculateTitleStats = (videoList: any[]) => {
    // 7일 이상 경과한 영상만 필터링 (분석할 때와 동일한 조건)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const matureVideos = videoList.filter((v: any) => {
      const publishedDate = new Date(v.publishedAt);
      return publishedDate <= sevenDaysAgo;
    });

    // 성과 점수로 정렬
    const videosWithScore = matureVideos.map((v: any) => {
      const views = v.views || 0;
      const likes = v.likes || 0;
      const comments = v.comments || 0;
      const likeRate = views > 0 ? likes / views : 0;
      const commentRate = views > 0 ? comments / views : 0;
      const score = (views / 10000) * 0.5 + (likeRate * 100) * 0.3 + (commentRate * 100) * 0.2;
      return { ...v, performanceScore: score };
    });

    const sorted = videosWithScore.sort((a, b) => b.performanceScore - a.performanceScore);

    // 상위 30%, 하위 30%
    const topCount = Math.ceil(sorted.length * 0.3);
    const bottomCount = Math.ceil(sorted.length * 0.3);
    const topVideos = sorted.slice(0, topCount);
    const bottomVideos = sorted.slice(-bottomCount);

    // 제목 글자수 평균 계산
    const topAvgLength = Math.round(
      topVideos.reduce((sum, v) => sum + v.title.length, 0) / topVideos.length
    );
    const bottomAvgLength = Math.round(
      bottomVideos.reduce((sum, v) => sum + v.title.length, 0) / bottomVideos.length
    );

    return {
      top_avg_length: topAvgLength,
      bottom_avg_length: bottomAvgLength
    };
  };

  const calculateStats = () => {
    if (videos.length === 0) return null;

    const successCount = videos.filter(v => v.script !== '자막이 없습니다' && v.script !== '자막 추출 실패').length;
    const failCount = videos.length - successCount;

    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);
    const totalTags = videos.reduce((sum, v) => sum + v.tags, 0);
    const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0);

    return {
      total: videos.length,
      success: successCount,
      fail: failCount,
      avgViews: Math.round(totalViews / videos.length),
      avgLikes: Math.round(totalLikes / videos.length),
      avgComments: Math.round(totalComments / videos.length),
      avgTags: Math.round(totalTags / videos.length),
      avgDuration: Math.round(totalDuration / videos.length),
    };
  };

  const handleAnalyze = async (urlOverride?: string) => {
    // 로그인 체크
    if (!isLoggedIn) {
      alert('⚠️ 로그인이 필요한 기능입니다.\n\n상단의 로그인 버튼을 눌러 먼저 로그인해주세요.');
      return;
    }

    const targetUrl = urlOverride || channelUrl;

    if (!targetUrl.trim()) {
      alert('채널 URL을 입력해주세요!');
      return;
    }

    const youtubeApiKey = localStorage.getItem('youtube_api_key') || '';

    setLoading(true);
    setVideos([]);
    setAnalysisResult(null);
    setGeneratedGuideline('');
    setProgress({ current: 0, total: 0 });

    try {
      console.log('📌 채널 ID 추출 중...');

      let channelId;
      try {
        channelId = await getChannelId(targetUrl, youtubeApiKey);
      } catch (error: any) {
        throw error;
      }

      if (!channelId) {
        throw new Error('유효한 채널 URL이 아닙니다. URL 형식을 확인해주세요.');
      }

      console.log('✅ 채널 ID:', channelId);

      console.log('📌 Shorts 영상 목록 가져오는 중...');
      const shortsList = await getChannelShorts(channelId, youtubeApiKey, selectedCount);
      if (shortsList.length === 0) {
        throw new Error('Shorts 영상을 찾을 수 없습니다');
      }
      console.log(`✅ ${shortsList.length}개 Shorts 발견`);

      console.log('📌 자막 수집 중...');
      setProgress({ current: 0, total: shortsList.length });

      const videosWithSubtitles = [];
      for (let i = 0; i < shortsList.length; i++) {
        const video = shortsList[i];
        console.log(`[${i + 1}/${shortsList.length}] ${video.title} 자막 가져오는 중...`);

        try {
          const subtitle = await getSubtitle(video.id);
          videosWithSubtitles.push({
            id: video.id,
            title: video.title,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            tags: video.tags,
            tagList: video.tagList || [],
            duration: video.duration,
            publishedAt: video.publishedAt,
            thumbnail: video.thumbnail,
            channelTitle: video.channelTitle,
            channelThumbnail: video.channelThumbnail,
            subscriberCount: video.subscriberCount,  // 구독자 수
            script: subtitle || '자막이 없습니다',
          });
          console.log(`✅ [${i + 1}/${shortsList.length}] 자막 수집 완료`);
        } catch (error) {
          console.error(`❌ [${i + 1}/${shortsList.length}] 자막 가져오기 실패:`, error);
          videosWithSubtitles.push({
            id: video.id,
            title: video.title,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            tags: video.tags,
            tagList: video.tagList || [],
            duration: video.duration,
            publishedAt: video.publishedAt,
            thumbnail: video.thumbnail,
            channelTitle: video.channelTitle,
            channelThumbnail: video.channelThumbnail,
            subscriberCount: video.subscriberCount,  // 구독자 수
            script: '자막 추출 실패',
          });
        }

        setProgress({ current: i + 1, total: shortsList.length });
      }

      console.log('✅ 모든 자막 수집 완료!');
      setVideos(videosWithSubtitles);

    } catch (error: any) {
      console.error('❌ 오류 발생:', error);

      if (error.message?.includes('API 키')) {
        alert(error.message);
      } else if (error.message?.includes('채널 URL')) {
        alert(error.message);
      } else {
        alert('오류가 발생했습니다: ' + error.message);
      }
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const analyzeStructure = async () => {
    if (videos.length === 0) {
      alert('먼저 채널 분석을 완료해주세요!');
      return;
    }

    setScriptLoading(true);
    setAnalysisResult(null);

    try {
      console.log('📊 채널 컨텐츠 분석 시작...');

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: videos,
          mode: 'analyze',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '구조 분석 실패');
      }

      const data = await response.json();
      console.log('✅ 구조 분석 완료!');

      let parsedResult;
      try {
        let jsonText = data.result;

        if (typeof jsonText === 'string') {
          const match = jsonText.match(/\{[\s\S]*\}/);
          if (match) {
            jsonText = match[0];
          }
        }

        parsedResult = typeof jsonText === 'string'
          ? JSON.parse(jsonText)
          : jsonText;
      } catch (e) {
        console.error('JSON 파싱 실패:', e);
        setAnalysisResult({
          error: 'JSON 파싱 실패',
          raw: data.result
        });
        return;
      }

      parsedResult._meta = {
        analyzedCount: data.analyzedCount,
        totalCount: data.totalCount,
        excludedCount: data.excludedCount,
        filterInfo: data.metadata?.filterInfo
      };

      // 제목 통계를 직접 계산해서 덮어쓰기
      if (parsedResult.title_analysis) {
        const titleStats = calculateTitleStats(videos);

        if (parsedResult.title_analysis.top_patterns) {
          parsedResult.title_analysis.top_patterns.avg_length = titleStats.top_avg_length;
        }

        if (parsedResult.title_analysis.bottom_patterns) {
          parsedResult.title_analysis.bottom_patterns.avg_length = titleStats.bottom_avg_length;
        }

        console.log('✅ 제목 통계 재계산 완료:', titleStats);
      }

      setAnalysisResult(parsedResult);

      // ⭐ 상위/하위 영상 요약 데이터 생성 (실시간 화면과 히스토리 화면 1:1 일치를 위해)
      console.log('📊 상위/하위 영상 스냅샷 생성 중...');
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const matureVideos = videos.filter((v: any) => {
        const publishedDate = new Date(v.publishedAt);
        return publishedDate <= sevenDaysAgo;
      });

      // 성과 점수로 정렬
      const videosWithScore = matureVideos.map((v: any) => {
        const views = v.views || 0;
        const likes = v.likes || 0;
        const comments = v.comments || 0;
        const likeRate = views > 0 ? likes / views : 0;
        const commentRate = views > 0 ? comments / views : 0;
        const score = (views / 10000) * 0.5 + (likeRate * 100) * 0.3 + (commentRate * 100) * 0.2;
        return { ...v, performanceScore: score };
      });

      const sorted = videosWithScore.sort((a, b) => b.performanceScore - a.performanceScore);

      // 상위 30%, 하위 30%
      const topCount = Math.ceil(sorted.length * 0.3);
      const bottomCount = Math.ceil(sorted.length * 0.3);
      const topVideos = sorted.slice(0, topCount);
      const bottomVideos = sorted.slice(-bottomCount);

      // DB 저장용 요약 데이터 (히스토리 화면에서 그대로 사용)
      const topSummary: VideoSummary[] = topVideos.map((v: any) => ({
        videoId: v.id,
        title: v.title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        likeRate: v.views > 0 ? (v.likes / v.views) * 100 : 0,
        publishedAt: v.publishedAt,
        thumbnail: v.thumbnail,
        duration: v.duration,
        performanceScore: v.performanceScore,
      }));

      const bottomSummary: VideoSummary[] = bottomVideos.map((v: any) => ({
        videoId: v.id,
        title: v.title,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        likeRate: v.views > 0 ? (v.likes / v.views) * 100 : 0,
        publishedAt: v.publishedAt,
        thumbnail: v.thumbnail,
        duration: v.duration,
        performanceScore: v.performanceScore,
      }));

      console.log(`✅ 상위 ${topSummary.length}개, 하위 ${bottomSummary.length}개 영상 스냅샷 생성 완료`);

      // ⭐ State에 저장 (화면 표시용)
      setTopVideosSummary(topSummary);
      setBottomVideosSummary(bottomSummary);

      try {
        // 전체 영상 통계 계산 (화면에 표시되는 것과 동일)
        const channelStats = calculateStats();

        const saveResponse = await fetch('/api/save-analysis-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // userId는 서버에서 쿠키로부터 가져오므로 제거
            channelId: channelUrl.split('@')[1]?.split('/')[0] || channelUrl, // URL에서 채널 ID 추출
            channelTitle: videos[0]?.channelTitle || null, // API에서 받은 채널명 사용
            channelThumbnail: videos[0]?.channelThumbnail || null, // 채널 썸네일도 추가
            subscriberCount: videos[0]?.subscriberCount || 0, // 구독자 수
            isOwnChannel: false,
            videoCount: data.analyzedCount,
            analysisResult: parsedResult,  // 파싱된 결과
            analysisRaw: data.result,      // Gemini 원본 응답 (하이브리드 저장)
            videoTitles: videos.map((v: any) => v.title), // 영상 제목 배열
            // ⭐ 추가: 상위/하위 영상 스냅샷 (실시간 화면과 히스토리 화면 1:1 일치)
            topVideosSummary: topSummary,
            bottomVideosSummary: bottomSummary,
            // ⭐ 전체 영상 통계 (화면에 표시되는 수치)
            channelStats: channelStats,
          }),
        });

        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          console.log('✅ DB 저장 완료! 카테고리:', saveData.category);

          // 👉 DB record ID 저장 (나중에 가이드 업데이트할 때 사용)
          if (saveData.data?.id) {
            setAnalysisHistoryId(saveData.data.id);
            console.log('💾 분석 기록 ID 저장:', saveData.data.id);
          }
        } else {
          console.error('⚠️ DB 저장 실패 (분석 결과는 정상 표시됨)');
        }
      } catch (saveError) {
        console.error('⚠️ DB 저장 중 오류 (분석 결과는 정상 표시됨):', saveError);
        // DB 저장 실패해도 분석 결과는 보여줌
      }

    } catch (error: any) {

      console.error('❌ 구조 분석 실패:', error);
      alert('구조 분석 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setScriptLoading(false);
    }
  };

  const generateGuideline = async () => {
    if (!analysisResult || analysisResult.error) {
      alert('먼저 채널 컨텐츠 분석을 완료해주세요!');
      return;
    }

    setScriptLoading(true);
    setGeneratedGuideline('');

    try {
      console.log('📋 가이드 생성 시작...');

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: videos,
          mode: 'guideline',
          analysisResult: JSON.stringify(analysisResult),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '가이드 생성 실패');
      }

      const data = await response.json();
      console.log('✅ 가이드 생성 완료!');

      // 1) 완성된 summary 만들기 (프론트 상태 + DB 공용)
      const updatedSummary = {
        ...(analysisResult || {}),
        contentGuideline: data.result,
        // schemaVersion 없으면 v1_external로 기본 세팅
        schemaVersion: analysisResult?.schemaVersion || 'v1_external',
      };

      // 화면 상태 업데이트
      setGeneratedGuideline(data.result);
      setAnalysisResult(updatedSummary);

      // 2) DB에 summary 전체 + guideline_length 저장 (analysisHistoryId가 있을 때만)
      if (analysisHistoryId) {
        try {
          const updateResponse = await fetch(`/api/analysis-history/${analysisHistoryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              analysis_summary: updatedSummary,
              guideline_length: data.result.length,
            }),
          });

          if (updateResponse.ok) {
            console.log('✅ 가이드 DB 업데이트 완료!');
          } else {
            console.error('⚠️ 가이드 DB 업데이트 실패 (화면 표시는 정상)');
          }
        } catch (updateError) {
          console.error('⚠️ 가이드 DB 업데이트 중 오류:', updateError);
        }
      } else {
        console.warn('⚠️ 분석 기록 ID가 없어 가이드를 DB에 저장하지 못했습니다.');
      }

    } catch (error: any) {
      console.error('❌ 가이드 생성 실패:', error);
      alert('가이드 생성 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setScriptLoading(false);
    }
  };

  const stats = calculateStats();

  return (
    <>
      {/* 채널 검색 섹션 */}
      <div className="mt-6 rounded-2xl border border-gray-300 bg-white p-4 shadow-md mb-6 md:mb-8">
        {/* 헤더 영역 */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50">
            <Search className="h-4 w-4 text-red-500" />
          </div>
          <span className="text-sm font-bold text-gray-900">채널 검색</span>
          <span className="ml-1 font-semibold text-xs text-gray-400">
            쇼츠 성과를 분석해요
          </span>
        </div>

        {/* 검색 툴바 영역 */}
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          {/* 인풋 */}
          <div className="relative flex-1">
            <input
              type="text"
              value={channelUrl}
              onChange={(e) => {
                setChannelUrl(e.target.value);
                setHasSearched(false);
                setSearchResults([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading && !searching) {
                  handleSearchChannels();
                }
              }}
              placeholder="채널명 또는 채널 URL 입력"
              className="h-11 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 pr-9 text-sm text-gray-900
                         placeholder:text-gray-400
                         focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100
                         disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || searching}
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* 영상 개수 + 버튼 */}
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-xs text-gray-700 font-medium">
              영상 개수
            </label>
            <select
              value={selectedCount}
              onChange={(e) => setSelectedCount(Number(e.target.value))}
              className="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900
                         focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100
                         disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || searching}
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={30}>30개</option>
              <option value={40}>40개</option>
              <option value={50}>50개</option>
            </select>

            <button
              type="button"
              onClick={handleSearchChannels}
              disabled={loading || searching}
              className="flex h-11 items-center gap-1 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white
                         shadow-sm hover:bg-red-600 active:bg-red-700
                         disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>검색 중...</span>
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>검색/분석</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 검색 결과 */}
        {hasSearched && (
          <div className="mt-4 border-t pt-4">
            {searchResults.length > 0 ? (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">🔍 검색 결과 ({searchResults.length}개)</h3>
                <div className="space-y-2">
                  {searchResults.map((channel: any) => (
                    <div
                      key={channel.channelId}
                      onClick={() => handleSelectChannel(channel.channelId)}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
                    >
                      <img
                        src={channel.thumbnail}
                        alt={channel.title}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                          {channel.title}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-600">
                          구독자 {channel.subscriberCount >= 10000
                            ? `${(channel.subscriberCount / 10000).toFixed(1)}만`
                            : channel.subscriberCount.toLocaleString()}명
                        </p>
                      </div>
                      <div className="text-blue-600 flex-shrink-0">
                        <Search className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-1">검색 결과가 없습니다</p>
                <p className="text-sm text-gray-500">정확한 채널명을 입력했는지 확인해주세요</p>
              </div>
            )}
          </div>
        )}

        {progress.total > 0 && (
          <div className="mt-3 md:mt-4">
            <div className="flex justify_between text-xs md:text-sm text-gray-600 mb-2">
              <span>데이터 수집 중...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 면책조항 - 분석 결과 상단 */}
      {stats && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800">
            ⚠️ 아래 분석 지표는 본 서비스에서 자체적으로 계산한 것으로, YouTube 공식 지표가 아닙니다.
          </p>
        </div>
      )}

      {/* 기본 통계 */}
      {stats && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
            📊 분석 결과
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">처리 영상</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats.total}개</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">자막 수집 성공</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">{stats.success}개</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">자막 수집 실패</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600">{stats.fail}개</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">평균 조회수</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-600">{stats.avgViews.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">평균 좋아요</p>
              <p className="text-2xl md:text-3xl font-bold text-orange-600">{stats.avgLikes.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">평균 댓글</p>
              <p className="text-2xl md:text-3xl font-bold text-cyan-600">{stats.avgComments.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">평균 태그</p>
              <p className="text-2xl md:text-3xl font-bold text-pink-600">{stats.avgTags}개</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">평균 길이</p>
              <p className="text-2xl md:text-3xl font-bold text-indigo-600">{stats.avgDuration}초</p>
            </div>
          </div>
        </div>
      )}

      {/* 분석 버튼 / 가이드 버튼 섹션 */}
      {videos.length > 0 && (() => {
        // 7일 이상 경과한 영상 수 계산
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const matureVideos = videos.filter((v: any) => {
          const publishedDate = new Date(v.publishedAt);
          return publishedDate <= sevenDaysAgo;
        });
        const matureCount = matureVideos.length;
        const totalCount = videos.length;
        const recentCount = totalCount - matureCount;

        return (
          <>
            {/* 분석 가능 영상 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
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

            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">📋 콘텐츠 제작 가이드 생성</h2>

              <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
                수집된 {videos.filter(v => v.script !== '자막이 없습니다' && v.script !== '자막 추출 실패').length}개 대본을 3단계로 분석하여 맞춤 가이드를 생성합니다.
              </p>

              <button
                onClick={analyzeStructure}
                disabled={scriptLoading || matureCount < 10}
                className="w-full py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm md:text-base font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3 md:mb-4"
              >
                {scriptLoading && !analysisResult && !generatedGuideline ? (
                  <>
                    <Loader2 className="w-4 md:w-5 h-4 md:h-5 animate-spin" />
                    채널 컨텐츠를 분석하고 있습니다...
                  </>
                ) : (
                  <>
                    📊 1단계: 채널 컨텐츠 분석하기
                    {matureCount >= 10 && (
                      <span className="text-xs md:text-sm opacity-90">
                        ({matureCount}개 영상)
                      </span>
                    )}
                  </>
                )}
              </button>
              {matureCount < 10 && (
                <p className="text-xs md:text-sm text-red-600 text-center mb-3 md:mb-4">
                  ⚠️ 분석하려면 7일 이상 경과한 영상이 최소 10개 필요합니다 (현재: {matureCount}개)
                </p>
              )}

              <button
                onClick={generateGuideline}
                disabled={scriptLoading || !analysisResult || analysisResult.error}
                className="w-full py-2.5 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm md:text-base font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {scriptLoading && analysisResult && !generatedGuideline ? (
                  <>
                    <Loader2 className="w-4 md:w-5 h-4 md:h-5 animate-spin" />
                    콘텐츠 제작 가이드를 생성하고 있습니다...
                  </>
                ) : (
                  <>
                    ✨ 2단계: 콘텐츠 제작 가이드 생성하기
                  </>
                )}
              </button>
            </div>
          </>
        );
      })()}

      {/* 외부 채널 분석 결과 뷰 (공용 컴포넌트) */}
      {analysisResult && !analysisResult.error && (
        <ChannelAnalysisView
          analysisResult={analysisResult}
          topVideosSummary={topVideosSummary}
          bottomVideosSummary={bottomVideosSummary}
        />
      )}

      {/* 분석 오류 */}
      {analysisResult && analysisResult.error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 md:p-6 rounded">
          <h3 className="text-lg md:text-xl font-bold text-red-800 mb-2">⚠️ 분석 오류</h3>
          <p className="text-red-700 mb-4 text-sm md:text-base">{analysisResult.error}</p>
          {analysisResult.raw && (
            <details>
              <summary className="cursor-pointer text-xs md:text-sm text-red-600 hover:text-red-800">
                원본 응답 보기
              </summary>
              <pre className="mt-2 text-xs bg-white p-3 rounded overflow-auto max-h-60">
                {analysisResult.raw}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* 생성된 가이드 출력 */}
      {generatedGuideline && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-lg p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-3 md:mb-4 gap-2">
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">✅ 콘텐츠 제작 가이드</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedGuideline);
                alert('가이드가 클립보드에 복사되었습니다!');
              }}
              className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg text-xs md:text-sm hover:bg-purple-700"
            >
              📋 전체 복사
            </button>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4 whitespace-pre-wrap text-xs md:text-sm text-gray-800 leading-relaxed max-h-96 overflow-y-auto">
            {generatedGuideline}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 이 가이드와 AI 프롬프트 템플릿을 활용하여 해당 채널 스타일의 대본을 생성할 수 있습니다.
          </p>
        </div>
      )}

      {/* 수집된 영상 리스트 */}
      {videos.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-4 gap-3">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              📹 수집된 영상 ({videos.length}개)
            </h2>

            {/* 정렬 드롭다운 */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-gray-600 whitespace-nowrap">
                정렬:
              </label>
              <select
                id="sort-select"
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

          <div className="space-y-3 md:space-y-4">
            {getSortedVideos().map((video, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
                  {/* 썸네일 - 클릭 시 유튜브 쇼츠로 이동 */}
                  <a
                    href={`https://www.youtube.com/shorts/${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-full md:w-40 h-40 md:h-28 flex-shrink-0 rounded overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={video.thumbnail || '/default-thumbnail.jpg'}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover 오버레이 */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <span className="text-white font-semibold text-sm md:text-base">
                        ▶ 영상보기
                      </span>
                    </div>
                  </a>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-gray-900 mb-2 md:mb-3 line-clamp-2 text-sm md:text-base">
                      {video.title}
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 mb-2 md:mb-3">
                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Eye className="w-3 md:w-4 h-3 md:h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{video.views.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <ThumbsUp className="w-3 md:w-4 h-3 md:h-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{video.likes.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <MessageCircle className="w-3 md:w-4 h-3 md:h-4 text-orange-600 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{video.comments.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Clock className="w-3 md:w-4 h-3 md:h-4 text-purple-600 flex-shrink-0" />
                        <span className="text-gray-700">{video.duration}초</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Calendar className="w-3 md:w-4 h-3 md:h-4 text-gray-600 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{formatDate(video.publishedAt)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs md:text-sm">
                        <Tag className="w-3 md:w-4 h-3 md:h-4 text-pink-600 flex-shrink-0" />
                        <button
                          onClick={() => toggleTags(video.id)}
                          className="text-gray-700 hover:text-pink-600 transition-colors truncate"
                        >
                          {video.tags}개
                        </button>
                      </div>
                    </div>

                    {expandedTags[video.id] && video.tagList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 md:mb-3 p-2 bg-pink-50 rounded">
                        {video.tagList.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-white text-pink-700 text-xs rounded border border-pink-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <details className="text-xs md:text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                        📄 자막 보기
                      </summary>
                      <p className="mt-2 text-gray-700 whitespace-pre-wrap p-2 md:p-3 bg-gray-50 rounded max-h-40 overflow-y-auto text-xs">
                        {video.script}
                      </p>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
