// app/components/ExternalChannelHistoryTab.tsx
// 타 채널 분석 기록 전용 탭
'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2, Film, ChevronDown } from 'lucide-react';
import ChannelAnalysisView from './ChannelAnalysisView';
import type { VideoSummary } from '../types/analysis';

interface ExternalChannelHistoryTabProps {
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
  analysis_summary: any;
  top_videos_summary: VideoSummary[];
  bottom_videos_summary: VideoSummary[];
  analysis_date: string;
}

// 타 채널 분석 상세 내용 컴포넌트
function ExternalAnalysisDetails({ record }: { record: DetailedRecord }) {
  const [selectedView, setSelectedView] = useState<'analysis' | 'guideline'>('analysis');

  // analysis_summary 안전 처리
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
  }

  const hasGuideline = !!analysisData?.contentGuideline;

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

          <div className="overflow-y-auto max-h-[600px] pr-2">
            <ChannelAnalysisView
              analysisResult={analysisData || {}}
              topVideosSummary={record.top_videos_summary || []}
              bottomVideosSummary={record.bottom_videos_summary || []}
            />
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
              <p className="text-sm text-gray-500">
                이 분석에서는 컨텐츠 제작 가이드를 생성하지 않았습니다.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function ExternalChannelHistoryTab({ isLoggedIn }: ExternalChannelHistoryTabProps) {
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [expandedRecords, setExpandedRecords] = useState<{ [key: string]: DetailedRecord | null }>({});
  const [loadingRecords, setLoadingRecords] = useState<{ [key: string]: boolean }>({});
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // 타 채널 분석 기록 목록 불러오기
  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analysis-history/external/list');
      const data = await response.json();

      if (data.success) {
        setHistoryList(data.history || []);
        console.log(`✅ [타 채널] ${data.count}개 분석 기록 로드 완료`);
      } else if (response.status === 401) {
        console.log('ℹ️ 로그인이 필요합니다');
      } else {
        console.error('❌ 타 채널 분석 기록 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('❌ 타 채널 분석 기록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 분석 기록 삭제
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

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

    if (expandedRecords[recordId]) {
      setExpandedRecords(prev => ({
        ...prev,
        [recordId]: null
      }));
      return;
    }

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

  useEffect(() => {
    if (isLoggedIn) {
      loadHistory();
    }
  }, [isLoggedIn]);

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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <span className="ml-2 text-gray-600">타 채널 분석 기록을 불러오는 중...</span>
        </div>
      ) : historyList.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">아직 분석한 타 채널이 없습니다</p>
          <p className="text-gray-500 text-sm mt-2">타 채널을 분석하면 여기에 기록이 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyList.map((item) => {
            const isExpanded = !!expandedRecords[item.id];
            const isLoading = loadingRecords[item.id];
            const recordDetail = expandedRecords[item.id];

            return (
              <div key={item.id} className="bg-white border rounded-lg overflow-hidden">
                <div
                  className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleDetail(item)}
                >
                  <div className="flex items-center gap-3">
                    {/* 프로필 이미지 - 모바일 최적화 */}
                    {item.channel_thumbnail ? (
                      <img
                        src={item.channel_thumbnail}
                        alt={item.channel_title}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Film className="w-5 h-5 text-gray-400" />
                      </div>
                    )}

                    {/* 채널 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-gray-900 truncate">
                          {item.channel_title}
                        </h3>
                        {item.subscriber_count > 0 && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium flex-shrink-0">
                            {item.subscriber_count >= 10000
                              ? `${(item.subscriber_count / 10000).toFixed(1)}만`
                              : item.subscriber_count.toLocaleString()}명
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 flex-wrap">
                        <span>{item.formattedDate}</span>
                        {item.creator_category && item.creator_category !== 'Unknown' && (
                          <>
                            <span>•</span>
                            {item.creator_category.split(',').map((cat, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                {cat.trim()}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 우측 액션 영역 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className={`p-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      </div>

                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        disabled={deleteLoading === item.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="삭제"
                      >
                        {deleteLoading === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-6 bg-gray-50">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                        <span className="ml-2">상세 정보를 불러오는 중...</span>
                      </div>
                    ) : recordDetail ? (
                      <ExternalAnalysisDetails record={recordDetail} />
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
