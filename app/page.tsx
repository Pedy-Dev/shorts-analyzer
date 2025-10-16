'use client';

import { useState } from 'react';
import { Search, Youtube, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getChannelId, getChannelShorts, formatDate, getSubtitle } from './api/youtube';

export default function ChannelAnalyzer() {
  const [channelUrl, setChannelUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // 대본 생성 관련 state
  const [analysisResult, setAnalysisResult] = useState(''); // 구조 분석 결과
  const [generatedGuideline, setGeneratedGuideline] = useState(''); // 최종 지침
  const [scriptLoading, setScriptLoading] = useState(false);
  
  // 태그 관련 state
  const [selectedCount, setSelectedCount] = useState(20);
  const [expandedTags, setExpandedTags] = useState<{ [key: string]: boolean }>({});

  // 태그 토글 함수
  const toggleTags = (videoId: string) => {
    setExpandedTags(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  // 채널 분석 시작
  const analyzeChannel = async () => {
    if (!channelUrl) {
      alert('채널 URL을 입력해주세요!');
      return;
    }

    setLoading(true);
    setVideos([]);
    setAnalysis(null);
    setProgress({ current: 0, total: 0 });
    setAnalysisResult('');
    setGeneratedGuideline('');
    setExpandedTags({});
    
    try {
      // 1단계: 채널 ID 추출
      console.log('📌 채널 ID 추출 중...');
      const channelId = await getChannelId(channelUrl);
      
      if (!channelId) {
        alert('채널을 찾을 수 없습니다. URL을 확인해주세요.');
        setLoading(false);
        return;
      }
      
      console.log('✅ 채널 ID:', channelId);
      
      // 2단계: 쇼츠 영상 가져오기
      console.log('📌 쇼츠 영상 수집 중...');
      const shortsData = await getChannelShorts(channelId, 50);
      
      if (shortsData.length === 0) {
        alert('이 채널에는 쇼츠 영상이 없습니다.');
        setLoading(false);
        return;
      }
      
      console.log(`✅ ${shortsData.length}개 쇼츠 발견!`);
      
      // 3단계: 자막 추출 (선택한 개수만큼)
      console.log(`📌 자막 추출 시작... (최대 ${selectedCount}개)`);
      const formattedVideos = [];
      const videosToProcess = shortsData.slice(0, selectedCount);
      
      setProgress({ current: 0, total: videosToProcess.length });

      for (let i = 0; i < videosToProcess.length; i++) {
        const video = videosToProcess[i];
        
        console.log(`\n🎬 [${i + 1}/${videosToProcess.length}] ${video.title}`);
        console.log(`📹 비디오 ID: ${video.id}`);

        try {
          const subtitle = await getSubtitle(video.id);
          
          formattedVideos.push({
            id: video.id,
            title: video.title,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            tags: video.tags,
            tagList: video.tagList || [],
            duration: video.duration,
            publishedAt: formatDate(video.publishedAt),
            script: subtitle || '자막이 없습니다',
          });

          console.log(`✅ 성공: ${subtitle ? subtitle.length + '자' : '자막 없음'}`);
          
        } catch (error) {
          console.log(`❌ 실패: 자막 추출 오류`);
          formattedVideos.push({
            id: video.id,
            title: video.title,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            tags: video.tags,
            tagList: video.tagList || [],
            duration: video.duration,
            publishedAt: formatDate(video.publishedAt),
            script: '자막 추출 실패',
          });
        }
        
        setProgress({ current: i + 1, total: videosToProcess.length });
        setVideos([...formattedVideos]);
        
        if (i < videosToProcess.length - 1) {
          console.log('⏳ 1.5초 대기...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      console.log(`\n✅ 총 ${formattedVideos.length}개 영상 처리 완료!`);
      
      // 4단계: 통계 분석
      const videosWithSubtitles = formattedVideos.filter(
        v => v.script !== '자막이 없습니다' && v.script !== '자막 추출 실패'
      );

      const avgViews = Math.round(
        formattedVideos.reduce((sum, v) => sum + v.views, 0) / formattedVideos.length
      );
      
      const avgLikes = Math.round(
        formattedVideos.reduce((sum, v) => sum + v.likes, 0) / formattedVideos.length
      );
      
      const avgComments = Math.round(
        formattedVideos.reduce((sum, v) => sum + v.comments, 0) / formattedVideos.length
      );
      
      const avgTags = Math.round(
        formattedVideos.reduce((sum, v) => sum + v.tags, 0) / formattedVideos.length
      );
      
      const avgDuration = Math.round(
        formattedVideos.reduce((sum, v) => sum + v.duration, 0) / formattedVideos.length
      );
      
      setAnalysis({
        totalVideos: formattedVideos.length,
        successCount: videosWithSubtitles.length,
        failCount: formattedVideos.length - videosWithSubtitles.length,
        avgViews,
        avgLikes,
        avgComments,
        avgTags,
        avgDuration,
        trendInsight: `최근 ${formattedVideos.length}개 쇼츠의 평균 조회수는 ${(avgViews/1000).toFixed(1)}K입니다.`
      });
      
      console.log('🎉 분석 완료!');
      
    } catch (error) {
      console.error('❌ 분석 실패:', error);
      alert('채널 분석 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // 1단계: 대본 구조 분석
  const analyzeStructure = async () => {
    if (videos.length === 0) {
      alert('먼저 채널 분석을 완료해주세요!');
      return;
    }

    setScriptLoading(true);
    setAnalysisResult('');

    try {
      console.log('🔍 대본 구조 분석 시작...');

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videos: videos,
          mode: 'analyze'
        }),
      });

      if (!response.ok) {
        throw new Error('구조 분석 API 오류');
      }

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.analysis);
        console.log('✅ 구조 분석 완료!');
      } else {
        alert('구조 분석 실패: ' + data.error);
      }

    } catch (error) {
      console.error('❌ 구조 분석 실패:', error);
      alert('구조 분석 중 오류가 발생했습니다.');
    } finally {
      setScriptLoading(false);
    }
  };

  // 2단계: 대본 제작 지침 생성
  const generateGuideline = async () => {
    if (!analysisResult) {
      alert('먼저 대본 구조 분석을 완료해주세요!');
      return;
    }

    setScriptLoading(true);
    setGeneratedGuideline('');

    try {
      console.log('📋 지침 생성 시작...');

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videos: videos,
          mode: 'guideline',
          analysisResult: analysisResult
        }),
      });

      if (!response.ok) {
        throw new Error('지침 생성 API 오류');
      }

      const data = await response.json();

      if (data.success) {
        setGeneratedGuideline(data.guideline);
        console.log('✅ 지침 생성 완료!');
      } else {
        alert('지침 생성 실패: ' + data.error);
      }

    } catch (error) {
      console.error('❌ 지침 생성 실패:', error);
      alert('지침 생성 중 오류가 발생했습니다.');
    } finally {
      setScriptLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎬 YouTube Short Hacker
          </h1>
          <p className="text-gray-600">
            해당 채널의 최신 쇼츠 대본을 자동으로 수집하고 분석
          </p>
        </div>

        {/* 입력 섹션 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Youtube className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="YouTube 채널 URL (예: https://youtube.com/@channelname)"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && analyzeChannel()}
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-gray-900 placeholder-gray-400"
              />
            </div>
            
            {/* 개수 선택 드롭다운 */}
            <select
              value={selectedCount}
              onChange={(e) => setSelectedCount(Number(e.target.value))}
              disabled={loading}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-gray-900 bg-white"
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={15}>15개</option>
              <option value={20}>20개</option>
            </select>
            
            <button
              onClick={analyzeChannel}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  분석 중...
                </>
              ) : (
                <>
                  <Search size={20} />
                  분석 시작
                </>
              )}
            </button>
          </div>

          {/* 진행률 표시 */}
          {loading && progress.total > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>자막 추출 중...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 지침 생성기 - 분석 완료 후에만 표시 */}
        {analysis && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 대본 제작 지침 생성</h2>
            
            <p className="text-sm text-gray-600 mb-4">
              수집된 {analysis.successCount}개 대본을 2단계로 분석하여 맞춤 지침을 생성합니다.
            </p>

            {/* 1단계: 구조 분석 버튼 */}
            <button
              onClick={analyzeStructure}
              disabled={scriptLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
            >
              {scriptLoading && !analysisResult && !generatedGuideline ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  대본 구조를 분석하고 있습니다...
                </>
              ) : (
                <>
                  🔍 1단계: 대본 구조 분석하기
                </>
              )}
            </button>

            {/* 분석 결과 표시 */}
            {analysisResult && (
              <div className="mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">✅ 대본 구조 분석 결과</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(analysisResult);
                      alert('분석 결과가 클립보드에 복사되었습니다!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    📋 복사
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed max-h-96 overflow-y-auto">
                  {analysisResult}
                </div>
              </div>
            )}

            {/* 2단계: 지침 생성 버튼 */}
            <button
              onClick={generateGuideline}
              disabled={scriptLoading || !analysisResult}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {scriptLoading && analysisResult && !generatedGuideline ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  대본 제작 지침을 생성하고 있습니다...
                </>
              ) : (
                <>
                  ✨ 2단계: 대본 제작 지침 생성하기
                </>
              )}
            </button>

            {/* 최종 지침 표시 */}
            {generatedGuideline && (
              <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">✅ 대본 제작 지침</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedGuideline);
                      alert('지침이 클립보드에 복사되었습니다!');
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                  >
                    📋 전체 복사
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed max-h-96 overflow-y-auto">
                  {generatedGuideline}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  💡 이 지침과 AI 프롬프트 템플릿을 활용하여 해당 채널 스타일의 대본을 생성할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 분석 결과 */}
        {analysis && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 분석 결과</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">처리 영상</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.totalVideos}개</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">성공</p>
                <p className="text-2xl font-bold text-green-600">{analysis.successCount}개</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">실패</p>
                <p className="text-2xl font-bold text-red-600">{analysis.failCount}개</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">평균 조회수</p>
                <p className="text-2xl font-bold text-purple-600">{analysis.avgViews.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">평균 좋아요</p>
                <p className="text-2xl font-bold text-orange-600">{analysis.avgLikes.toLocaleString()}</p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">평균 댓글</p>
                <p className="text-2xl font-bold text-cyan-600">{analysis.avgComments.toLocaleString()}</p>
              </div>
              <div className="bg-pink-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">평균 태그</p>
                <p className="text-2xl font-bold text-pink-600">{analysis.avgTags}개</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">평균 길이</p>
                <p className="text-2xl font-bold text-indigo-600">{analysis.avgDuration}초</p>
              </div>
            </div>
          </div>
        )}

        {/* 영상 목록 */}
        {videos.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📝 수집된 쇼츠 ({videos.length}개)</h2>
            <div className="space-y-4">
              {videos.map((video, idx) => (
                <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{video.title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span>👁️ {video.views.toLocaleString()}</span>
                        <span>👍 {video.likes.toLocaleString()}</span>
                        <span>💬 {video.comments.toLocaleString()}</span>
                        
                        {/* 태그 클릭 확장 */}
                        {video.tagList && video.tagList.length > 0 ? (
                          <button
                            onClick={() => toggleTags(video.id)}
                            className="flex items-center gap-1 text-pink-600 hover:text-pink-700 font-medium"
                          >
                            🏷️ {video.tags}개
                            {expandedTags[video.id] ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-400">🏷️ 태그 없음</span>
                        )}
                        
                        <span>⏱️ {video.duration}초</span>
                        <span>📅 {video.publishedAt}</span>
                      </div>
                      
                      {/* 태그 확장 영역 */}
                      {expandedTags[video.id] && video.tagList && video.tagList.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {video.tagList.map((tag: string, tagIdx: number) => (
                            <span
                              key={tagIdx}
                              className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 ml-11">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">
                        {video.script === '자막이 없습니다' || video.script === '자막 추출 실패' 
                          ? '❌ 자막 없음' 
                          : `✅ 자막 (${video.script.length}자)`}
                      </span>
                      {video.script !== '자막이 없습니다' && video.script !== '자막 추출 실패' && (
                        <button 
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          onClick={() => {
                            navigator.clipboard.writeText(video.script);
                            alert('자막이 클립보드에 복사되었습니다!');
                          }}
                        >
                          📋 복사
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
                      {video.script}
                    </p>
                    {video.script !== '자막이 없습니다' && 
                     video.script !== '자막 추출 실패' && 
                     video.script.length > 150 && (
                      <button 
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                        onClick={() => alert(video.script)}
                      >
                        전체 보기 →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}