// C:\Users\duawo\Desktop\shorts-analyzer\app\components\AnalysisHistoryTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2, Calendar, Film, ChevronDown } from 'lucide-react';
import ChannelAnalysisView from './ChannelAnalysisView';
import type { VideoSummary } from '../types/analysis';

interface AnalysisHistoryTabProps {
  isLoggedIn: boolean;
}

interface HistoryItem {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string;
  subscriber_count: number;
  is_own_channel: boolean;
  yt_category: string;
  creator_category: string;
  video_count: number;
  analysis_date: string;
  created_at: string;
  formattedDate: string;
  formattedTime: string;
}

interface DetailedRecord {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string;
  is_own_channel: boolean;

  // 🔧 백엔드에서 뭐가 오든(문자열/객체) 다 받기 위해 any로 둔다
  analysis_summary: any;

  top_videos_summary: VideoSummary[];
  bottom_videos_summary: VideoSummary[];
  analysis_date: string;
}

// 분석 상세 내용 컴포넌트 - 탭 전환 레이아웃
function AnalysisDetails({ record }: { record: DetailedRecord }) {
  const [selectedView, setSelectedView] = useState<'analysis' | 'guideline'>('analysis');

  // 🔧 analysis_summary: 문자열/객체 둘 다 안전하게 처리
  const rawSummary = record.analysis_summary as any;
  let analysisData: any = {};

  if (typeof rawSummary === 'string') {
    try {
      analysisData = JSON.parse(rawSummary);
    } catch (e) {
      console.error('analysis_summary JSON 파싱 실패:', e, rawSummary);
      analysisData = {};
    }
  } else if (rawSummary && typeof rawSummary === 'object') {
    analysisData = rawSummary;
  } else {
    analysisData = {};
  }

  // 타 채널 분석 vs 내 채널 분석 구분
  const isExternalChannel = !!analysisData?.topic_characteristics;  // 타 채널 분석
  const isOwnChannel = !!analysisData?.keyInsights;                // 내 채널 분석

  const hasGuideline = !!analysisData?.contentGuideline;

  // 채널 재분석 페이지로 이동
  const navigateToChannelAnalysis = (channelId: string) => {
    const channelUrl = `https://www.youtube.com/channel/${channelId}`;
    // TODO: 실제 구현시 라우팅 로직 추가
    console.log('채널 재분석:', channelUrl);
  };

  return (
    <div className="space-y-4">
      {/* 탭 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => setSelectedView('analysis')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            selectedView === 'analysis'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📊 분석 결과
        </button>
        <button
          onClick={() => setSelectedView('guideline')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            selectedView === 'guideline'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📝 제작 가이드
        </button>
      </div>

      {/* 분석 결과 뷰 */}
      {selectedView === 'analysis' && (
        <div className="bg-white rounded-lg shadow-lg p-6 overflow-hidden">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            📊 컨텐츠 분석 결과
          </h2>

          {/* 스크롤 가능한 영역 */}
          <div className="overflow-y-auto max-h-[600px] pr-2">
            {/* 타 채널 분석 데이터 (topic_characteristics 존재) */}
            {isExternalChannel ? (
              <ChannelAnalysisView
                analysisResult={analysisData || {}}
                topVideosSummary={record.top_videos_summary || []}
                bottomVideosSummary={record.bottom_videos_summary || []}
              />
            ) : isOwnChannel ? (
              /* 내 채널 분석 데이터 (keyInsights 존재) */
              <div className="space-y-4">
                {/* 핵심 인사이트 */}
                {analysisData.keyInsights && analysisData.keyInsights.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-base mb-2 text-purple-800">📌 핵심 인사이트</h4>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <ul className="space-y-2">
                        {analysisData.keyInsights.map((insight: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-purple-500 mr-2">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 성공 요인 */}
                {analysisData.topCharacteristics && analysisData.topCharacteristics.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-base mb-2 text-green-700">✅ 성공 요인</h4>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <ul className="space-y-2">
                        {analysisData.topCharacteristics.map((char: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-green-600 mr-2">✓</span>
                            <span>{char}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 개선 필요 사항 */}
                {analysisData.bottomCharacteristics && analysisData.bottomCharacteristics.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-base mb-2 text-red-700">⚠️ 개선 필요 사항</h4>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <ul className="space-y-2">
                        {analysisData.bottomCharacteristics.map((char: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-red-600 mr-2">✗</span>
                            <span>{char}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* 데이터 없음 (v0 또는 알 수 없는 형태) */
              <div className="text-center py-8 text-gray-500">
                <p>분석 데이터를 표시할 수 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 제작 가이드 뷰 */}
      {selectedView === 'guideline' && (
        hasGuideline ? (
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-hidden">
            <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                📝 컨텐츠 제작 가이드
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(analysisData.contentGuideline || '');
                  alert('가이드가 클립보드에 복사되었습니다!');
                }}
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
              >
                복사
              </button>
            </h2>

            {/* 스크롤 가능한 영역 */}
            <div className="overflow-y-auto max-h-[600px] pr-2">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {analysisData.contentGuideline}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center max-w-sm">
              <span className="text-6xl mb-4 block opacity-50">📝</span>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                제작 가이드가 생성되지 않았습니다
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                이 분석에서는 컨텐츠 제작 가이드를 생성하지 않았습니다.
                <br />
                제작 가이드가 필요하시면 채널을 다시 분석해주세요.
              </p>
              <button
                onClick={() => navigateToChannelAnalysis(record.channel_id)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm inline-flex items-center gap-2 transition-colors"
              >
                채널 재분석하기
                <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function AnalysisHistoryTab({ isLoggedIn }: AnalysisHistoryTabProps) {
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [expandedRecords, setExpandedRecords] = useState<{ [key: string]: DetailedRecord | null }>({});
  const [loadingRecords, setLoadingRecords] = useState<{ [key: string]: boolean }>({});
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // 분석 기록 목록 불러오기
  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analysis-history/list');
      const data = await response.json();

      if (data.success) {
        setHistoryList(data.history || []);
        console.log(`✅ ${data.count}개 분석 기록 로드 완료`);
      } else if (response.status === 401) {
        console.log('ℹ️ 로그인이 필요합니다');
      } else {
        console.error('❌ 분석 기록 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('❌ 분석 기록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 분석 기록 삭제
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지

    if (!confirm('이 분석 기록을 삭제하시겠습니까?')) {
      return;
    }

    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/analysis-history/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ 분석 기록 삭제 완료');
        // 리스트에서 제거
        setHistoryList(prev => prev.filter(item => item.id !== id));
      } else {
        alert('삭제에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('❌ 삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다');
    } finally {
      setDeleteLoading(null);
    }
  };

  // 상세 보기 토글
  const toggleDetail = async (item: HistoryItem) => {
    const recordId = item.id;

    // 이미 열려있으면 닫기
    if (expandedRecords[recordId]) {
      setExpandedRecords(prev => ({
        ...prev,
        [recordId]: null
      }));
      return;
    }

    // 로딩 시작
    setLoadingRecords(prev => ({
      ...prev,
      [recordId]: true
    }));

    try {
      const response = await fetch(`/api/analysis-history/${recordId}`);
      const data = await response.json();

      if (data.success && data.record) {
        setExpandedRecords(prev => ({
          ...prev,
          [recordId]: data.record
        }));
      } else {
        alert('분석 기록을 불러올 수 없습니다');
      }
    } catch (error) {
      console.error('❌ 상세 조회 오류:', error);
      alert('상세 정보를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoadingRecords(prev => ({
        ...prev,
        [recordId]: false
      }));
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (isLoggedIn) {
      loadHistory();
    }
  }, [isLoggedIn]);

  // 로그인하지 않은 경우
  if (!isLoggedIn) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">분석 기록을 보려면 로그인이 필요합니다</p>
        <button
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          로그인하기
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">분석 기록</h2>
        <p className="text-gray-600">과거에 분석한 채널들의 기록을 확인할 수 있습니다</p>
      </div>

      {/* 로딩 상태 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <span className="ml-2 text-gray-600">분석 기록을 불러오는 중...</span>
        </div>
      ) : historyList.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">아직 분석한 채널이 없습니다</p>
          <p className="text-gray-500 text-sm mt-2">채널을 분석하면 여기에 기록이 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyList.map((item) => {
            const isExpanded = !!expandedRecords[item.id];
            const isLoading = loadingRecords[item.id];
            const recordDetail = expandedRecords[item.id];

            return (
              <div key={item.id} className="bg-white border rounded-lg overflow-hidden">
                {/* 헤더 - 클릭하면 상세 내용 토글 */}
                <div
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleDetail(item)}
                >
                  <div className="flex items-center gap-4">
                    {/* 채널 썸네일 */}
                    {item.channel_thumbnail ? (
                      <img
                        src={item.channel_thumbnail}
                        alt={item.channel_title}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <Film className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    {/* 채널 정보 */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {item.channel_title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        {/* 상태 뱃지들 */}
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          분석 완료
                        </span>
                        {item.subscriber_count > 0 && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            구독자 {item.subscriber_count >= 10000
                              ? `${(item.subscriber_count / 10000).toFixed(1)}만`
                              : item.subscriber_count.toLocaleString()}명
                          </span>
                        )}
                        {item.is_own_channel && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            내 채널
                          </span>
                        )}
                        {item.creator_category && item.creator_category !== 'Unknown' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            {item.creator_category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Film className="w-4 h-4" />
                          {item.video_count}개 영상 분석
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {item.formattedDate} {item.formattedTime}
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex items-center gap-2">
                      {/* 토글 아이콘 */}
                      <div className={`p-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        disabled={deleteLoading === item.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="삭제"
                      >
                        {deleteLoading === item.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 상세 내용 - 확장되었을 때만 표시 */}
                {isExpanded && (
                  <div className="border-t p-6 bg-gray-50">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                        <span className="ml-2">상세 정보를 불러오는 중...</span>
                      </div>
                    ) : recordDetail ? (
                      <AnalysisDetails record={recordDetail} />
                    ) : (
                      <p className="text-center text-gray-600">데이터를 불러올 수 없습니다</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
