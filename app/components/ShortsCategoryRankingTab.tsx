'use client';

/**
 * 카테고리별 쇼츠 랭킹 + 핫 키워드 탭
 * 플레이보드 레이아웃 참고 + 모바일 대응
 */

import React, { useState, useEffect } from 'react';
import {
  SHORTS_CATEGORIES,
  REGION_CODES,
  PeriodType,
  SortType,
} from '@/app/lib/constants/shorts-categories';

type VideoType = 'shorts' | 'long' | 'all';

interface RankingItem {
  rank: number;
  video_id: string;
  title: string;
  channel_title: string;
  channel_id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  thumbnail_url: string;
  youtube_url: string;
  is_shorts: boolean;
  duration_sec: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function hasKoreanCharacter(text: string): boolean {
  return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
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
  const [selectedCategory, setSelectedCategory] = useState('15'); // 기본: 애완동물/동물
  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodType>('daily'); // v1: daily 고정
  const [selectedSortType, setSelectedSortType] =
    useState<SortType>('views');
  const [selectedVideoType, setSelectedVideoType] =
    useState<VideoType>('shorts');
  const [selectedRegion, setSelectedRegion] = useState('KR');
  const [activeTab, setActiveTab] =
    useState<'ranking' | 'keywords'>('ranking');
  const [showOnlyKoreanVideos, setShowOnlyKoreanVideos] =
    useState(false);

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<
    KeywordItem[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState<string>('');

  // ---------------- 데이터 로딩 ----------------
  useEffect(() => {
    if (activeTab === 'ranking') {
      loadRankings();
    } else {
      loadKeywords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    selectedPeriod,
    selectedSortType,
    selectedVideoType,
    selectedRegion,
    activeTab,
  ]);

  useEffect(() => {
    if (selectedRegion !== 'KR') {
      setShowOnlyKoreanVideos(false);
    }
  }, [selectedRegion]);

  const loadRankings = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(
        '/api/shorts/ranking',
        window.location.origin,
      );
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
      setSnapshotDate(data.metadata.snapshot_date);
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
      // 항상 강한 키워드
      const rawUrl = new URL(
        '/api/keywords/hot',
        window.location.origin,
      );
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

      // 급상승 키워드
      const trendUrl = new URL(
        '/api/keywords/hot',
        window.location.origin,
      );
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

  const filteredRankings = showOnlyKoreanVideos
    ? rankings.filter((item) => hasKoreanCharacter(item.title))
    : rankings;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            카테고리별 인기 영상 차트 &amp; 핫 키워드
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            한국에서 인기있는 쇼츠/롱폼 영상 TOP 100
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ---------------- 좌측: 카테고리 (데스크톱용) ---------------- */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-900 mb-3">카테고리</h3>
              <div className="space-y-1">
                {SHORTS_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${selectedCategory === category.id
                        ? 'bg-red-500 text-white font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ---------------- 우측: 메인 영역 ---------------- */}
          <main className="lg:col-span-9 space-y-4">
            {/* 모바일용 카테고리 셀렉트 */}
            <div className="lg:hidden bg-white rounded-lg shadow p-3 flex flex-col gap-2">
              <span className="text-xs text-gray-500">카테고리</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              >
                {SHORTS_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 상단 필터 바 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col gap-3 md:gap-4">
                {/* 1줄: 탭 + 기간 */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  {/* 탭 */}
                  <div className="inline-flex rounded-lg bg-gray-100 p-1">
                    <button
                      onClick={() => setActiveTab('ranking')}
                      className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${activeTab === 'ranking'
                          ? 'bg-white text-red-600 shadow-sm'
                          : 'text-gray-600'
                        }`}
                    >
                      영상 랭킹
                    </button>
                    <button
                      onClick={() => setActiveTab('keywords')}
                      className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${activeTab === 'keywords'
                          ? 'bg-white text-red-600 shadow-sm'
                          : 'text-gray-600'
                        }`}
                    >
                      핫 키워드
                    </button>
                  </div>

                  {/* 기간 (지금은 일간만) */}
                  <select
                    value={selectedPeriod}
                    onChange={(e) =>
                      setSelectedPeriod(e.target.value as PeriodType)
                    }
                    className="px-3 py-2 border rounded text-xs md:text-sm"
                    disabled
                  >
                    <option value="daily">일간 (v1)</option>
                  </select>

                  {/* 기준일 */}
                  {snapshotDate && (
                    <span className="ml-auto text-xs md:text-sm text-gray-600">
                      기준일: {snapshotDate}
                    </span>
                  )}
                </div>

                {/* 2줄: 필터들 */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  {/* 영상 타입 */}
                  {activeTab === 'ranking' && (
                    <div className="inline-flex rounded-lg bg-gray-100 p-1">
                      <button
                        onClick={() => setSelectedVideoType('shorts')}
                        className={`px-3 py-1.5 text-xs md:text-sm rounded-md ${selectedVideoType === 'shorts'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700'
                          }`}
                      >
                        쇼츠
                      </button>
                      <button
                        onClick={() => setSelectedVideoType('long')}
                        className={`px-3 py-1.5 text-xs md:text-sm rounded-md ${selectedVideoType === 'long'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700'
                          }`}
                      >
                        롱폼
                      </button>
                      <button
                        onClick={() => setSelectedVideoType('all')}
                        className={`px-3 py-1.5 text-xs md:text-sm rounded-md ${selectedVideoType === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700'
                          }`}
                      >
                        전체
                      </button>
                    </div>
                  )}

                  {/* 정렬 */}
                  {activeTab === 'ranking' && (
                    <select
                      value={selectedSortType}
                      onChange={(e) =>
                        setSelectedSortType(e.target.value as SortType)
                      }
                      className="px-3 py-2 border rounded text-xs md:text-sm"
                    >
                      <option value="views">조회수</option>
                      <option value="likes">좋아요</option>
                      <option value="comments">댓글</option>
                    </select>
                  )}

                  {/* 국가 선택 */}
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

                  {/* 한국 영상만 토글 */}
                  {selectedRegion === 'KR' && activeTab === 'ranking' && (
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-[11px] md:text-bold text-gray-600">
                        한국 영상만 보기
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setShowOnlyKoreanVideos((prev) => !prev)
                        }
                        className={`relative inline-flex h-5 w-9 md:h-5 md:w-10 items-center rounded-full transition ${
                          showOnlyKoreanVideos ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                            showOnlyKoreanVideos
                              ? 'translate-x-4 md:translate-x-5'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                  </div>
                  </div>
                  </div>

              {/* 로딩 / 에러 */}
              {loading && (
                <div className="bg-white rounded-lg shadow py-10 flex flex-col items-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent" />
                  <p className="text-sm text-gray-600 mt-3">
                    데이터 로딩 중...
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm">
                  ❌ {error}
                </div>
              )}

              {/* 랭킹 리스트 */}
              {!loading && !error && activeTab === 'ranking' && (
                <div className="bg-white rounded-lg shadow">
                  {filteredRankings.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-600">
                      {rankings.length === 0
                        ? '데이터가 없습니다. 먼저 배치 수집을 실행해주세요.'
                        : '한국어 제목을 가진 영상이 없습니다.'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRankings.map((item) => (
                        <a
                          key={item.video_id}
                          href={item.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex gap-3 md:gap-4 p-3 md:p-4 hover:bg-gray-50 transition"
                        >
                          {/* 순위 */}
                          <div className="w-8 md:w-10 flex items-center justify-center">
                            <span className="text-lg md:text-2xl font-bold text-gray-400">
                              {item.rank}
                            </span>
                          </div>

                          {/* 썸네일 */}
                          <div className="relative w-28 h-16 md:w-32 md:h-20 flex-shrink-0">
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              className="w-full h-full object-cover rounded"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] md:text-xs px-1 py-0.5 rounded">
                              {formatDuration(item.duration_sec)}
                            </span>
                          </div>

                          {/* 정보 */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 hover:text-red-600 text-sm md:text-base line-clamp-2">
                              {item.title}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-600 mt-1">
                              {item.channel_title}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-2 text-[11px] md:text-xs text-gray-500">
                              <span>👁️ {item.view_count.toLocaleString()}</span>
                              <span>👍 {item.like_count.toLocaleString()}</span>
                              <span>💬 {item.comment_count.toLocaleString()}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 항상 강한 키워드 */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm md:text-base">
                      🔥 항상 강한 키워드
                      <span className="text-[10px] md:text-xs text-gray-500 font-normal">
                        (raw_score 기준)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {keywords.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          데이터가 없습니다.
                        </p>
                      ) : (
                        keywords.map((kw) => (
                          <div
                            key={kw.keyword}
                            className="border-b last:border-b-0 pb-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">
                                  {kw.rank}
                                </span>
                                <span className="font-medium text-gray-900 text-sm">
                                  {kw.keyword}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 whitespace-nowrap">
                                {kw.video_count}개 영상
                              </div>
                            </div>
                            {kw.sample_titles.length > 0 && (
                              <p className="text-[11px] text-gray-600 mt-1 line-clamp-1">
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
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm md:text-base">
                      📈 급상승 키워드
                      <span className="text-[10px] md:text-xs text-gray-500 font-normal">
                        (trend_score 기준)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {trendingKeywords.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          데이터가 없습니다.
                        </p>
                      ) : (
                        trendingKeywords.map((kw) => (
                          <div
                            key={kw.keyword}
                            className="border-b last:border-b-0 pb-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">
                                  {kw.rank}
                                </span>
                                <span className="font-medium text-gray-900 text-sm">
                                  {kw.keyword}
                                </span>
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                  ×{kw.trend_score.toFixed(1)}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 whitespace-nowrap">
                                {kw.video_count}개 영상
                              </div>
                            </div>
                            {kw.sample_titles.length > 0 && (
                              <p className="text-[11px] text-gray-600 mt-1 line-clamp-1">
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
          </main>
        </div>
      </div>
    </div>
  );
}
