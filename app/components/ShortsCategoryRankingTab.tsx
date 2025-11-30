'use client';

/**
 * 카테고리별 쇼츠 랭킹 + 핫 키워드 탭
 * 플레이보드와 동일한 레이아웃
 */

import React, { useState, useEffect } from 'react';
import { SHORTS_CATEGORIES, REGION_CODES, PeriodType, SortType } from '@/app/lib/constants/shorts-categories';

type VideoType = 'shorts' | 'long' | 'all';

interface RankingItem {
  rank: number;
  video_id: string;
  title: string;
  channel_title: string;
  // v2: 일간 증가량
  daily_view_increase: number;
  daily_like_increase: number;
  daily_comment_increase: number;
  // v2: 누적 수치 (참고용)
  total_view_count: number;
  total_like_count: number;
  total_comment_count: number;
  published_at: string;
  thumbnail_url: string;
  youtube_url: string;
  is_shorts: boolean;
  duration_sec: number;
}

/**
 * 초를 "M:SS" 또는 "H:MM:SS" 형식으로 변환
 */
function formatDuration(seconds: number): string {
  if (seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

interface KeywordItem {
  rank: number;
  keyword: string;
  raw_score: number;
  trend_score: number;
  video_count: number;
  sample_titles: string[];
}

export default function ShortsCategoryRankingTab() {
  // ==================== 상태 관리 ====================
  const [selectedCategory, setSelectedCategory] = useState('15'); // 애완동물/동물 카테고리 (테스트 데이터 있음)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('daily'); // v2: daily만 지원
  const [selectedSortType, setSelectedSortType] = useState<SortType>('views');
  const [selectedVideoType, setSelectedVideoType] = useState<VideoType>('shorts'); // 쇼츠/롱폼/전체
  const [selectedRegion, setSelectedRegion] = useState('KR');
  const [activeTab, setActiveTab] = useState<'ranking' | 'keywords'>('ranking');

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<KeywordItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState<string>('');

  // ==================== 데이터 로딩 ====================
  useEffect(() => {
    if (activeTab === 'ranking') {
      loadRankings();
    } else {
      loadKeywords();
    }
  }, [selectedCategory, selectedPeriod, selectedSortType, selectedVideoType, selectedRegion, activeTab]);

  const loadRankings = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/shorts/ranking', window.location.origin);
      url.searchParams.set('category_id', selectedCategory);
      url.searchParams.set('period', selectedPeriod);
      url.searchParams.set('sort_type', selectedSortType);
      url.searchParams.set('video_type', selectedVideoType);
      url.searchParams.set('region_code', selectedRegion);
      url.searchParams.set('date', 'latest');

      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch rankings');
      }

      const data = await response.json();
      setRankings(data.items || []);
      setSnapshotDate(data.metadata.metric_date);
    } catch (err: any) {
      setError(err.message);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadKeywords = async () => {
    setLoading(true);
    setError(null);

    try {
      // 항상 강한 키워드 (raw_score)
      const rawUrl = new URL('/api/keywords/hot', window.location.origin);
      rawUrl.searchParams.set('category_id', selectedCategory);
      rawUrl.searchParams.set('period', selectedPeriod);
      rawUrl.searchParams.set('region_code', selectedRegion);
      rawUrl.searchParams.set('sort_by', 'raw');
      rawUrl.searchParams.set('limit', '30');

      const rawResponse = await fetch(rawUrl.toString());
      if (rawResponse.ok) {
        const rawData = await rawResponse.json();
        setKeywords(rawData.keywords || []);
        setSnapshotDate(rawData.metadata.snapshot_date);
      }

      // 급상승 키워드 (trend_score)
      const trendUrl = new URL('/api/keywords/hot', window.location.origin);
      trendUrl.searchParams.set('category_id', selectedCategory);
      trendUrl.searchParams.set('period', selectedPeriod);
      trendUrl.searchParams.set('region_code', selectedRegion);
      trendUrl.searchParams.set('sort_by', 'trend');
      trendUrl.searchParams.set('limit', '30');

      const trendResponse = await fetch(trendUrl.toString());
      if (trendResponse.ok) {
        const trendData = await trendResponse.json();
        setTrendingKeywords(trendData.keywords || []);
      }
    } catch (err: any) {
      setError(err.message);
      setKeywords([]);
      setTrendingKeywords([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 렌더링 ====================
  const categoryLabel = SHORTS_CATEGORIES.find((c) => c.id === selectedCategory)?.label || '';
  const regionLabel = REGION_CODES.find((r) => r.code === selectedRegion)?.label || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            카테고리별 인기 영상 차트 & 핫 키워드
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            한국에서 인기있는 쇼츠/롱폼 영상 TOP 100
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 왼쪽 사이드바: 카테고리 */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-900 mb-3">카테고리</h3>
              <div className="space-y-1">
                {SHORTS_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                      selectedCategory === category.id
                        ? 'bg-red-500 text-white font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 메인 영역 */}
          <div className="col-span-9">
            {/* 상단 필터 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  {/* 탭 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('ranking')}
                      className={`px-4 py-2 rounded font-medium ${
                        activeTab === 'ranking'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      영상 랭킹
                    </button>
                    <button
                      onClick={() => setActiveTab('keywords')}
                      className={`px-4 py-2 rounded font-medium ${
                        activeTab === 'keywords'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      핫 키워드
                    </button>
                  </div>

                  {/* 기간 - v1에서는 daily만 지원 */}
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
                    className="px-3 py-2 border rounded text-sm"
                    disabled={activeTab === 'ranking'}
                  >
                    <option value="daily">일간 (v1)</option>
                    <option value="weekly" disabled>주간 (준비중)</option>
                    <option value="monthly" disabled>월간 (준비중)</option>
                  </select>

                  {/* 영상 타입 (랭킹 탭에서만) */}
                  {activeTab === 'ranking' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedVideoType('shorts')}
                        className={`px-3 py-2 rounded text-sm ${
                          selectedVideoType === 'shorts'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        쇼츠
                      </button>
                      <button
                        onClick={() => setSelectedVideoType('long')}
                        className={`px-3 py-2 rounded text-sm ${
                          selectedVideoType === 'long'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        롱폼
                      </button>
                      <button
                        onClick={() => setSelectedVideoType('all')}
                        className={`px-3 py-2 rounded text-sm ${
                          selectedVideoType === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        전체
                      </button>
                    </div>
                  )}

                  {/* 정렬 (랭킹 탭에서만) */}
                  {activeTab === 'ranking' && (
                    <select
                      value={selectedSortType}
                      onChange={(e) => setSelectedSortType(e.target.value as SortType)}
                      className="px-3 py-2 border rounded text-sm"
                    >
                      <option value="views">조회수</option>
                      <option value="likes">좋아요</option>
                      <option value="comments">댓글</option>
                    </select>
                  )}

                  {/* 국가 */}
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="px-3 py-2 border rounded text-sm"
                  >
                    {REGION_CODES.map((region) => (
                      <option key={region.code} value={region.code}>
                        {region.flag} {region.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 기준 날짜 */}
                {snapshotDate && (
                  <div className="text-sm text-gray-600">
                    기준일: {snapshotDate}
                  </div>
                )}
              </div>
            </div>

            {/* 현재 선택 정보 */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>{regionLabel}</strong> · <strong>{categoryLabel}</strong> ·{' '}
                <strong>{selectedPeriod === 'daily' ? '일간' : selectedPeriod === 'weekly' ? '주간' : '월간'}</strong>
                {activeTab === 'ranking' && (
                  <>
                    {' '}· <strong>{selectedVideoType === 'shorts' ? '쇼츠' : selectedVideoType === 'long' ? '롱폼' : '전체'}</strong>
                    {' '}· <strong>{selectedSortType === 'views' ? '조회수' : selectedSortType === 'likes' ? '좋아요' : '댓글'} 순위</strong>
                  </>
                )}
              </p>
            </div>

            {/* 로딩 / 에러 */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
                <p className="text-gray-600 mt-4">데이터 로딩 중...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
                ❌ {error}
              </div>
            )}

            {/* 랭킹 리스트 */}
            {!loading && !error && activeTab === 'ranking' && (
              <div className="bg-white rounded-lg shadow">
                {rankings.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    데이터가 없습니다. 먼저 배치 수집을 실행해주세요.
                  </div>
                ) : (
                  <div className="divide-y">
                    {rankings.map((item) => (
                      <a
                        key={item.video_id}
                        href={item.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
                      >
                        {/* 순위 */}
                        <div className="text-2xl font-bold text-gray-400 w-12 text-center">
                          {item.rank}
                        </div>

                        {/* 썸네일 + 영상 길이 */}
                        <div className="relative w-32 h-20 flex-shrink-0">
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover rounded"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                            {formatDuration(item.duration_sec)}
                          </span>
                        </div>

                        {/* 정보 */}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 hover:text-red-600 line-clamp-2">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{item.channel_title}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>👁️ +{item.daily_view_increase.toLocaleString()}</span>
                            <span>👍 +{item.daily_like_increase.toLocaleString()}</span>
                            <span>💬 +{item.daily_comment_increase.toLocaleString()}</span>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-gray-400">
                            <span>누적: {item.total_view_count.toLocaleString()}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 키워드 리스트 */}
            {!loading && !error && activeTab === 'keywords' && (
              <div className="grid grid-cols-2 gap-4">
                {/* 항상 강한 키워드 */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    🔥 항상 강한 키워드
                    <span className="text-xs text-gray-500 font-normal">(raw_score 기준)</span>
                  </h3>
                  <div className="space-y-2">
                    {keywords.length === 0 ? (
                      <p className="text-gray-500 text-sm">데이터가 없습니다.</p>
                    ) : (
                      keywords.map((kw) => (
                        <div key={kw.keyword} className="border-b pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">{kw.rank}</span>
                              <span className="font-medium text-gray-900">{kw.keyword}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {kw.video_count}개 영상
                            </div>
                          </div>
                          {kw.sample_titles.length > 0 && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              💡 {kw.sample_titles[0]}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 급상승 키워드 */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    📈 급상승 키워드
                    <span className="text-xs text-gray-500 font-normal">(trend_score 기준)</span>
                  </h3>
                  <div className="space-y-2">
                    {trendingKeywords.length === 0 ? (
                      <p className="text-gray-500 text-sm">데이터가 없습니다.</p>
                    ) : (
                      trendingKeywords.map((kw) => (
                        <div key={kw.keyword} className="border-b pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">{kw.rank}</span>
                              <span className="font-medium text-gray-900">{kw.keyword}</span>
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                ×{kw.trend_score.toFixed(1)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {kw.video_count}개 영상
                            </div>
                          </div>
                          {kw.sample_titles.length > 0 && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              💡 {kw.sample_titles[0]}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
