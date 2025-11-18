'use client';

import { useState } from 'react';
import { Search, Loader2, Calendar, Clock, Eye, ThumbsUp, MessageCircle, Tag } from 'lucide-react';
import { getChannelId, getChannelShorts, formatDate, getSubtitle } from '../api/youtube';

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

  const [selectedCount, setSelectedCount] = useState(20);
  const [expandedTags, setExpandedTags] = useState<{ [key: string]: boolean }>({});

  const toggleTags = (videoId: string) => {
    setExpandedTags(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  const calculateTitleStats = (videoList: any[]) => {
    // 3일 이상 경과한 영상만 필터링 (분석할 때와 동일한 조건)
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

    const matureVideos = videoList.filter((v: any) => {
      const publishedDate = new Date(v.publishedAt);
      return publishedDate <= threeDaysAgo;
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

  const handleAnalyze = async () => {
    // 로그인 체크
    if (!isLoggedIn) {
      alert('⚠️ 로그인이 필요한 기능입니다.\n\n상단의 로그인 버튼을 눌러 먼저 로그인해주세요.');
      return;
    }

    if (!channelUrl.trim()) {
      alert('채널 URL을 입력해주세요!');
      return;
    }

    const youtubeApiKey = localStorage.getItem('youtube_api_key');
    if (!youtubeApiKey) {
      alert('⚠️ YouTube API 키가 필요합니다!\n\n오른쪽 상단의 "⚙️ API 키 설정" 버튼을 눌러 YouTube API 키를 입력해주세요.');
      return;
    }

    setLoading(true);
    setVideos([]);
    setAnalysisResult(null);
    setGeneratedGuideline('');
    setProgress({ current: 0, total: 0 });

    try {
      console.log('📌 채널 ID 추출 중...');

      let channelId;
      try {
        channelId = await getChannelId(channelUrl, youtubeApiKey);
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

      try {
        // 임시로 localStorage에서 userId 가져오기 (나중에 구글 로그인 연동 후 실제 userId로 변경)
        const tempUserId = localStorage.getItem('temp_user_id') || 'anonymous_' + Date.now();
        localStorage.setItem('temp_user_id', tempUserId);

        const saveResponse = await fetch('/api/save-analysis-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: tempUserId,
            channelId: channelUrl.split('@')[1]?.split('/')[0] || channelUrl, // URL에서 채널 ID 추출
            channelTitle: videos[0]?.title?.split(' ')[0] || '알 수 없는 채널', // 임시로 첫 영상 제목에서 채널명 추정
            isOwnChannel: false,
            videoCount: data.analyzedCount,
            analysisResult: parsedResult,
            videoTitles: videos.map((v: any) => v.title), // 영상 제목 배열
          }),
        });

        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          console.log('✅ DB 저장 완료! 카테고리:', saveData.category);
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
      setGeneratedGuideline(data.result);

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
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">채널 URL 입력</h2>
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <input
            type="text"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="(예: https://www.youtube.com/@channelname)"
            className="flex-1 px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base font-medium"
            disabled={loading}
          />
          <div className="flex items-center gap-2">
            <select
              value={selectedCount}
              onChange={(e) => setSelectedCount(Number(e.target.value))}
              className="px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg text-gray-900 text-sm md:text-base font-medium"
              disabled={loading}
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={30}>30개</option>
              <option value={40}>40개</option>
              <option value={50}>50개</option>
            </select>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-4 md:px-6 py-2 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm md:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 md:w-5 h-4 md:h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Search className="w-4 md:w-5 h-4 md:h-5" />
                  분석하기
                </>
              )}
            </button>
          </div>
        </div>

        {progress.total > 0 && (
          <div className="mt-3 md:mt-4">
            <div className="flex justify-between text-xs md:text-sm text-gray-600 mb-2">
              <span>영상 수집 중...</span>
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
              <p className="text-xs md:text-sm text-gray-600 mb-1">성공</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">{stats.success}개</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-1">실패</p>
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

      {videos.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">📋 콘텐츠 제작 가이드 생성</h2>

          <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
            수집된 {videos.filter(v => v.script !== '자막이 없습니다' && v.script !== '자막 추출 실패').length}개 대본을 3단계로 분석하여 맞춤 가이드를 생성합니다.
          </p>

          <button
            onClick={analyzeStructure}
            disabled={scriptLoading}
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
              </>
            )}
          </button>

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
      )}

      {analysisResult && !analysisResult.error && (
        <div className="space-y-4 md:space-y-6">
          {analysisResult._meta && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 rounded">
              <p className="text-xs md:text-sm text-yellow-800">
                <strong>📊 분석 기준:</strong> {analysisResult._meta.filterInfo}
                {analysisResult._meta.excludedCount > 0 && (
                  <span className="ml-2">
                    (최근 {analysisResult._meta.excludedCount}개 영상은 게시 후 3일 미만으로 제외됨)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* 상위 vs 하위 영상 핵심 차이 */}
          {analysisResult.summary_differences && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 md:p-6 shadow-lg">
              <h3 className="text-xl md:text-2xl font-bold mb-4">
                ⚡ 상위 vs 하위 영상 핵심 차이
              </h3>
              <div className="space-y-3">
                <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                  <h4 className="font-bold text-yellow-300 mb-1">1️⃣ 주제 특성</h4>
                  <p className="text-white">{analysisResult.summary_differences.topic_difference}</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                  <h4 className="font-bold text-yellow-300 mb-1">2️⃣ 제목 전략</h4>
                  <p className="text-white">{analysisResult.summary_differences.title_difference}</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                  <h4 className="font-bold text-yellow-300 mb-1">3️⃣ 대본 전략</h4>
                  <p className="text-white">{analysisResult.summary_differences.script_difference}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-4 md:p-6 shadow-lg">
            <h3 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2">
              🎯 채널 핵심 정체성
            </h3>
            <p className="text-base md:text-lg">
              {analysisResult.channel_summary || '분석 중...'}
            </p>
          </div>

          {/* 주제 특성 섹션 */}
          {analysisResult.topic_characteristics && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
                1️⃣ 주제 특성
              </h3>

              {/* 주제 카테고리 분포 */}
              {analysisResult.topic_characteristics.main_categories && analysisResult.topic_characteristics.main_categories.length > 0 && (
                <div className="mb-4 md:mb-6">
                  <h4 className="font-bold text-gray-800 mb-3">주제 카테고리 분포</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analysisResult.topic_characteristics.main_categories.map((cat: any, i: number) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-indigo-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-indigo-900">{cat.category}</span>
                          <span className="text-xs md:text-sm bg-indigo-500 text-white px-2 py-1 rounded">
                            {(cat.ratio * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{cat.description}</p>
                        <p className="text-xs text-indigo-700">평균 조회수: {cat.avg_views?.toLocaleString() || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 성공한 주제들 */}
              {analysisResult.topic_characteristics.successful_topics && analysisResult.topic_characteristics.successful_topics.length > 0 && (
                <div className="mb-4 md:mb-6">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-green-600">✅</span> 성과가 좋은 주제와 접근법
                  </h4>
                  <div className="space-y-3">
                    {analysisResult.topic_characteristics.successful_topics.map((topic: any, i: number) => (
                      <details key={i} className="bg-green-50 border border-green-200 rounded-lg p-3" open={i === 0}>
                        <summary className="cursor-pointer font-semibold text-green-900 flex items-center justify-between">
                          <span>{topic.topic} ({topic.category})</span>
                          <span className="text-xs md:text-sm bg-green-500 text-white px-2 py-1 rounded ml-2">
                            평균 조회수: {topic.avg_views?.toLocaleString() || 'N/A'}
                          </span>
                        </summary>
                        <div className="mt-3 space-y-2">
                          <div className="bg-white rounded p-3">
                            <p className="text-xs md:text-sm text-gray-700 mb-2">
                              <span className="font-semibold">효과적 접근 각도:</span> {topic.successful_angle}
                            </p>
                            <p className="text-xs md:text-sm text-gray-700 mb-2">
                              <span className="font-semibold">성공 이유:</span> {topic.why_works}
                            </p>
                            {topic.key_elements && topic.key_elements.length > 0 && (
                              <div className="mb-2">
                                <span className="font-semibold text-xs md:text-sm text-gray-700">핵심 요소:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {topic.key_elements.map((element: string, j: number) => (
                                    <span key={j} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                      {element}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {topic.examples && topic.examples.length > 0 && (
                              <div>
                                <span className="font-semibold text-xs md:text-sm text-gray-700">예시:</span>
                                {topic.examples.map((ex: string, j: number) => (
                                  <p key={j} className="text-xs text-gray-600 ml-2 mt-1">• {ex}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* 실패한 주제들 */}
              {analysisResult.topic_characteristics.unsuccessful_topics && analysisResult.topic_characteristics.unsuccessful_topics.length > 0 && (
                <div className="mb-4 md:mb-6">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-red-600">⚠️</span> 피해야 할 주제와 접근법
                  </h4>
                  <div className="space-y-3">
                    {analysisResult.topic_characteristics.unsuccessful_topics.map((topic: any, i: number) => (
                      <details key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <summary className="cursor-pointer font-semibold text-red-900 flex items-center justify-between">
                          <span>{topic.topic} ({topic.category})</span>
                          <span className="text-xs md:text-sm bg-red-500 text-white px-2 py-1 rounded ml-2">
                            평균 조회수: {topic.avg_views?.toLocaleString() || 'N/A'}
                          </span>
                        </summary>
                        <div className="mt-3 bg-white rounded p-3">
                          <p className="text-xs md:text-sm text-gray-700 mb-2">
                            <span className="font-semibold">문제가 된 접근:</span> {topic.problematic_angle}
                          </p>
                          <p className="text-xs md:text-sm text-gray-700 mb-2">
                            <span className="font-semibold">실패 이유:</span> {topic.why_fails}
                          </p>
                          {topic.examples && topic.examples.length > 0 && (
                            <div>
                              <span className="font-semibold text-xs md:text-sm text-gray-700">예시:</span>
                              {topic.examples.map((ex: string, j: number) => (
                                <p key={j} className="text-xs text-gray-600 ml-2 mt-1">• {ex}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* 각도 분석 */}
              {analysisResult.topic_characteristics.angle_analysis && (
                <div className="mb-4 md:mb-6">
                  <h4 className="font-bold text-gray-800 mb-3">접근 각도별 효과 분석</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 효과적인 각도 */}
                    {analysisResult.topic_characteristics.angle_analysis.effective_angles && (
                      <div>
                        <h5 className="text-xs md:text-sm font-semibold text-green-800 mb-2">효과적인 각도 ✅</h5>
                        {analysisResult.topic_characteristics.angle_analysis.effective_angles.map((angle: any, i: number) => (
                          <div key={i} className="bg-green-50 rounded-lg p-3 mb-2 border border-green-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-xs md:text-sm text-green-900">{angle.angle_type}</span>
                              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                                성공률: {(angle.success_rate * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 mb-1">{angle.characteristics}</p>
                            <p className="text-xs text-green-700">적합한 주제: {angle.best_for}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 비효과적인 각도 */}
                    {analysisResult.topic_characteristics.angle_analysis.ineffective_angles && (
                      <div>
                        <h5 className="text-xs md:text-sm font-semibold text-red-800 mb-2">피해야 할 각도 ❌</h5>
                        {analysisResult.topic_characteristics.angle_analysis.ineffective_angles.map((angle: any, i: number) => (
                          <div key={i} className="bg-red-50 rounded-lg p-3 mb-2 border border-red-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-xs md:text-sm text-red-900">{angle.angle_type}</span>
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                                성공률: {(angle.success_rate * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-700">{angle.problem}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 제목 전략 분석 섹션 */}
          {analysisResult.title_analysis && (
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl shadow-lg p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
                2️⃣ 제목 전략
              </h3>

              {/* 핵심 요약 */}
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                <h4 className="font-bold text-blue-900 mb-2">💡 핵심 요약</h4>
                <p className="text-xs md:text-sm text-gray-800">{analysisResult.title_analysis.summary}</p>
              </div>

              {/* 상위 영상 제목 패턴 */}
              <div className="mb-4 md:mb-6">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✅</span> 효과적인 제목 패턴
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 제목 구조 */}
                  {analysisResult.title_analysis.top_patterns.common_structures?.map((struct: any, i: number) => (
                    <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-green-900">{struct.structure_type}</span>
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          {struct.frequency}회 사용
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mb-2">{struct.why_works}</p>
                      <div className="space-y-1">
                        {struct.examples.map((ex: string, j: number) => (
                          <p key={j} className="text-xs text-gray-600">• {ex}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 파워 키워드 */}
                <div className="bg-white rounded-lg p-3 md:p-4">
                  <h5 className="text-xs md:text-sm font-semibold text-gray-800 mb-3">🔥 파워 키워드</h5>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.title_analysis.top_patterns.power_keywords?.map((kw: any, i: number) => (
                      <div key={i} className="group relative">
                        <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs md:text-sm font-medium">
                          {kw.keyword} ({kw.frequency})
                        </span>
                        <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg -top-16 left-0">
                          <p className="mb-1"><strong>맥락:</strong> {kw.context}</p>
                          <p><strong>감정:</strong> {kw.emotional_impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 제목 특성 */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">평균 글자 수</p>
                    <p className="text-xl md:text-2xl font-bold text-green-700">
                      {analysisResult.title_analysis.top_patterns.avg_length}자
                    </p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">톤</p>
                    <p className="text-xl md:text-2xl font-bold text-green-700">
                      {analysisResult.title_analysis.top_patterns.tone}
                    </p>
                  </div>
                </div>
              </div>

              {/* 하위 영상 제목 문제점 */}
              <div className="mb-4 md:mb-6">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-red-600">❌</span> 피해야 할 제목 패턴
                </h4>

                <div className="space-y-2">
                  {analysisResult.title_analysis.bottom_patterns.common_problems?.map((prob: any, i: number) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="font-semibold text-red-900 mb-2">{prob.problem_type}</p>
                      <p className="text-xs md:text-sm text-gray-700 mb-2">{prob.why_fails}</p>
                      <div className="space-y-1">
                        {prob.examples.map((ex: string, j: number) => (
                          <p key={j} className="text-xs text-gray-600">• {ex}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
                  <div className="bg-red-50 rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">평균 글자 수</p>
                    <p className="text-xl md:text-2xl font-bold text-red-700">
                      {analysisResult.title_analysis.bottom_patterns.avg_length}자
                    </p>
                  </div>
                  <div className="bg-red-50 rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">톤</p>
                    <p className="text-xl md:text-2xl font-bold text-red-700">
                      {analysisResult.title_analysis.bottom_patterns.tone}
                    </p>
                  </div>
                </div>
              </div>

              {/* 제목 공식 */}
              <div className="mb-4 md:mb-6">
                <h4 className="font-bold text-gray-800 mb-3">🎯 검증된 제목 공식</h4>
                <div className="space-y-3">
                  {analysisResult.title_analysis.title_formulas?.map((formula: any, i: number) => (
                    <div key={i} className="bg-white border border-blue-200 rounded-lg p-3 md:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-blue-900 flex-1">{formula.formula}</p>
                        <span className="text-xs md:text-sm bg-blue-500 text-white px-2 py-1 rounded ml-2">
                          성공률: {(formula.success_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>효과적인 주제:</strong> {formula.best_for}
                      </p>
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-xs text-gray-700 mb-1"><strong>적용 예시:</strong></p>
                        {formula.examples.map((ex: string, j: number) => (
                          <p key={j} className="text-xs text-gray-600">• {ex}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Do's and Don'ts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-green-50 rounded-lg p-3 md:p-4">
                  <h5 className="font-bold text-green-900 mb-3">✅ 제목에 포함할 요소</h5>
                  <div className="space-y-1">
                    {analysisResult.title_analysis.dos_and_donts.effective_elements?.map((el: string, i: number) => (
                      <p key={i} className="text-xs md:text-sm text-gray-700">✓ {el}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 md:p-4">
                  <h5 className="font-bold text-red-900 mb-3">❌ 제목에서 피할 요소</h5>
                  <div className="space-y-1">
                    {analysisResult.title_analysis.dos_and_donts.avoid_elements?.map((el: string, i: number) => (
                      <p key={i} className="text-xs md:text-sm text-gray-700">✗ {el}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 대본 전략 */}
          {analysisResult.script_analysis && (
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
                3️⃣ 대본 전략
              </h3>

              {/* 영상 구조와 리듬 */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-800 mb-3">영상 구조와 리듬</h4>

                {/* 영상 구조 */}
                <div className="mb-4">
                  <div className="flex gap-1 h-10 md:h-12 rounded-lg overflow-hidden">
                    <div
                      className="bg-green-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{ width: `${analysisResult.script_analysis.script_structure?.intro_pct || 0}%` }}
                    >
                      도입 {analysisResult.script_analysis.script_structure?.intro_pct}%
                    </div>
                    <div
                      className="bg-blue-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{ width: `${analysisResult.script_analysis.script_structure?.body_pct || 0}%` }}
                    >
                      전개 {analysisResult.script_analysis.script_structure?.body_pct}%
                    </div>
                    <div
                      className="bg-purple-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{ width: `${analysisResult.script_analysis.script_structure?.climax_pct || 0}%` }}
                    >
                      반전 {analysisResult.script_analysis.script_structure?.climax_pct}%
                    </div>
                    <div
                      className="bg-red-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{ width: `${analysisResult.script_analysis.script_structure?.outro_pct || 0}%` }}
                    >
                      결말 {analysisResult.script_analysis.script_structure?.outro_pct}%
                    </div>
                  </div>
                  {analysisResult.script_analysis.script_structure?.description && (
                    <p className="mt-3 text-xs md:text-sm text-gray-600">
                      {analysisResult.script_analysis.script_structure.description}
                    </p>
                  )}
                </div>

                {/* 문장 리듬 */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 md:p-4 mb-4">
                  <h5 className="font-bold text-gray-800 mb-3">문장 리듬 패턴</h5>
                  <div className="flex gap-1 h-10 md:h-12 rounded-lg overflow-hidden mb-3">
                    <div
                      className="bg-green-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{ width: `${(analysisResult.script_analysis.script_structure?.sentence_rhythm?.short_ratio || 0) * 100}%` }}
                    >
                      짧음 {((analysisResult.script_analysis.script_structure?.sentence_rhythm?.short_ratio || 0) * 100).toFixed(0)}%
                    </div>
                    <div
                      className="bg-blue-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{ width: `${(analysisResult.script_analysis.script_structure?.sentence_rhythm?.medium_ratio || 0) * 100}%` }}
                    >
                      중간 {((analysisResult.script_analysis.script_structure?.sentence_rhythm?.medium_ratio || 0) * 100).toFixed(0)}%
                    </div>
                    <div
                      className="bg-purple-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{ width: `${(analysisResult.script_analysis.script_structure?.sentence_rhythm?.long_ratio || 0) * 100}%` }}
                    >
                      긺 {((analysisResult.script_analysis.script_structure?.sentence_rhythm?.long_ratio || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-700">
                    <span className="font-semibold">패턴:</span> {analysisResult.script_analysis.script_structure?.sentence_rhythm?.pattern_type || 'N/A'}
                  </p>
                </div>

                {/* 말투 스타일 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 md:p-4">
                    <h5 className="font-bold text-gray-800 mb-2">종결어미 분포</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm text-gray-700">반말</span>
                        <span className="font-semibold text-green-700">
                          {((analysisResult.script_analysis.script_structure?.speech_pattern?.banmal_ratio || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm text-gray-700">존댓말</span>
                        <span className="font-semibold text-blue-700">
                          {((analysisResult.script_analysis.script_structure?.speech_pattern?.jondae_ratio || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-lg p-3 md:p-4">
                    <h5 className="font-bold text-gray-800 mb-2">특징</h5>
                    <p className="text-xs md:text-sm text-gray-700 mb-2">
                      <span className="font-semibold">시점:</span> {analysisResult.script_analysis.script_structure?.speech_pattern?.viewpoint || 'N/A'}
                    </p>
                    <p className="text-xs md:text-sm text-gray-700">
                      <span className="font-semibold">톤:</span> {analysisResult.script_analysis.script_structure?.speech_pattern?.tone_description || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 초반 3초 후킹 전략 */}
              {analysisResult.script_analysis.hook_analysis && (
                <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3">🎯 초반 3초 후킹 전략</h4>

                  {analysisResult.script_analysis.hook_analysis.first_3_seconds?.top_patterns?.map((pattern: any, i: number) => (
                    <div key={i} className="bg-white rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-orange-900">{pattern.type}</span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-700 mb-2">{pattern.effectiveness}</p>
                      <div className="bg-orange-50 rounded p-2">
                        {pattern.examples?.map((ex: string, j: number) => (
                          <p key={j} className="text-xs text-gray-600">• {ex}</p>
                        ))}
                      </div>
                    </div>
                  ))}

                  {analysisResult.script_analysis.hook_analysis.first_3_seconds?.power_words && (
                    <div className="mt-3">
                      <p className="text-xs md:text-sm font-semibold text-gray-700 mb-2">파워 단어:</p>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.script_analysis.hook_analysis.first_3_seconds.power_words.map((word: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 영상을 끝까지 보게 만드는 요소 */}
              {analysisResult.script_analysis.retention_elements && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-800 mb-3">🔥 영상을 끝까지 보게 만드는 요소</h4>

                  {/* 결론 배치 전략 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 md:p-4 mb-3">
                    <h5 className="font-semibold text-indigo-900 mb-2">결론/반전 배치</h5>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">상위 영상</p>
                        <p className="text-lg md:text-xl font-bold text-indigo-700">
                          {(analysisResult.script_analysis.retention_elements.conclusion_placement?.top_videos_avg_position * 100).toFixed(0)}% 지점
                        </p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">하위 영상</p>
                        <p className="text-lg md:text-xl font-bold text-gray-500">
                          {(analysisResult.script_analysis.retention_elements.conclusion_placement?.bottom_videos_avg_position * 100).toFixed(0)}% 지점
                        </p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-700 mb-3">
                      {analysisResult.script_analysis.retention_elements.conclusion_placement?.description}
                    </p>

                    {/* 결론/반전 예시들 */}
                    {analysisResult.script_analysis.retention_elements.conclusion_placement?.example_phrases && (
                      <div className="bg-white rounded p-3 border border-indigo-200">
                        <p className="text-xs font-semibold text-indigo-900 mb-2">실제 사용 예시:</p>
                        {analysisResult.script_analysis.retention_elements.conclusion_placement.example_phrases.map((ex: any, i: number) => (
                          <div key={i} className="mb-2 pb-2 border-b last:border-b-0">
                            <p className="text-xs text-gray-600 mb-1">
                              📍 {ex.video_title} ({ex.placement})
                            </p>
                            <p className="text-xs text-gray-800 italic">"{ex.phrase}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 종합 전략 설명 */}
                  {analysisResult.script_analysis.retention_elements.comprehensive_retention_strategy && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 md:p-4">
                      <h5 className="font-semibold text-purple-900 mb-2">종합 시청 유지 전략</h5>
                      <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                        {analysisResult.script_analysis.retention_elements.comprehensive_retention_strategy}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 핵심 차이점 */}
              {analysisResult.script_analysis.key_differences && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-orange-200">
                  <h4 className="font-bold text-orange-900 mb-3">💡 상위 vs 하위 영상 핵심 차이</h4>
                  <div className="space-y-2">
                    {analysisResult.script_analysis.key_differences.map((diff: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <p className="text-gray-800 flex-1 text-xs md:text-sm">{diff}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

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

      {videos.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
            📹 수집된 영상 ({videos.length}개)
          </h2>
          <div className="space-y-3 md:space-y-4">
            {videos.map((video, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
                  <img
                    src={video.thumbnail || '/default-thumbnail.jpg'}
                    alt={video.title}
                    className="w-full md:w-40 h-40 md:h-28 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-gray-900 mb-2 md:mb-3 line-clamp-2 text-sm md:text-base">{video.title}</h3>

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