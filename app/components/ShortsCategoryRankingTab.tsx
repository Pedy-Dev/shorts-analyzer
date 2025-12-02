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
import { hasKoreanCharacter } from '@/app/lib/utils/text';

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


interface KeywordItem {
  rank: number;
  keyword: string;
  raw_score: number;
  trend_score: number;
  video_count: number;
  total_views: number;
  avg_views: number;
  sample_titles: string[];
}

interface ShortsCategoryRankingTabProps {
  isLoggedIn: boolean;
  isCheckingAuth: boolean;
}

export default function ShortsCategoryRankingTab({ isLoggedIn, isCheckingAuth }: ShortsCategoryRankingTabProps) {
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날짜 선택 관련 상태
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('latest');
  const [loadingDates, setLoadingDates] = useState(false);

  // ---------------- 날짜 목록 로딩 ----------------
  useEffect(() => {
    loadAvailableDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  const loadAvailableDates = async () => {
    setLoadingDates(true);
    try {
      const url = new URL('/api/shorts/dates', window.location.origin);
      url.searchParams.set('region_code', selectedRegion);

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        const dates = data.dates || [];
        setAvailableDates(dates);
        // 날짜 목록이 바뀌면 첫 번째(최신) 날짜로 초기화
        if (dates.length > 0) {
          setSelectedDate(dates[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load dates:', err);
    } finally {
      setLoadingDates(false);
    }
  };

  // ---------------- 데이터 로딩 ----------------
  useEffect(() => {
    // 카테고리/날짜/지역 변경 시 이전 결과 즉시 제거
    if (activeTab === 'ranking') {
      setRankings([]);
      loadRankings();
    } else {
      setKeywords([]);
      loadKeywords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    selectedPeriod,
    selectedSortType,
    selectedVideoType,
    selectedRegion,
    selectedDate,
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
      url.searchParams.set('date', selectedDate);

      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch rankings');
      }

      const data = await response.json();
      setRankings(data.items || []);
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
      const url = new URL('/api/keywords/hot', window.location.origin);
      url.searchParams.set('category_id', selectedCategory);
      url.searchParams.set('period', selectedPeriod);
      url.searchParams.set('region_code', selectedRegion);
      url.searchParams.set('date', selectedDate || 'latest');
      url.searchParams.set('sort_by', 'raw');
      url.searchParams.set('limit', '30');

      const response = await fetch(url.toString());

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.keywords || []);
        setError(null);
      } else {
        // API 실패 시 이전 키워드 제거
        let msg = '키워드를 불러오지 못했습니다.';
        try {
          const errJson = await response.json();
          if (errJson?.error) msg = errJson.error;
        } catch (_) {}

        setError(msg);
        setKeywords([]);
      }
    } catch (err: any) {
      setError(err.message ?? '알 수 없는 오류');
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRankings = showOnlyKoreanVideos
    ? rankings.filter((item) => hasKoreanCharacter(item.title))
    : rankings;

  // ---------------- UI ----------------
  return (
    <div className="bg-gray-50">
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
              <span className="text-xs text-gray-700 font-medium">카테고리</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded text-sm text-gray-900 font-medium"
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
                    className="px-3 py-2 border rounded text-xs md:text-sm text-gray-900 font-medium"
                    disabled
                  >
                    <option value="daily">일간 (v1)</option>
                  </select>

                  {/* 기준일 선택 */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs md:text-sm text-gray-700 font-medium">기준일:</span>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-2 py-1 border rounded text-xs md:text-sm text-gray-900 font-medium"
                      disabled={loadingDates || availableDates.length === 0}
                    >
                      {availableDates.map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      className="px-3 py-2 border rounded text-xs md:text-sm text-gray-900 font-medium"
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
                    className="px-3 py-2 border rounded text-sm text-gray-900 font-medium"
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
                <div className="bg-white rounded-lg shadow relative">
                  {filteredRankings.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-600">
                      {rankings.length === 0
                        ? '데이터가 없습니다. 먼저 배치 수집을 실행해주세요.'
                        : '한국어 제목을 가진 영상이 없습니다.'}
                    </div>
                  ) : (
                    <>
                      <div className={`divide-y ${!isLoggedIn && !isCheckingAuth ? 'blur-sm pointer-events-none select-none' : ''}`}>
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
                      {/* 로그인 안내 오버레이 */}
                      {!isLoggedIn && !isCheckingAuth && (
                        <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 bg-white/60">
                          <div className="text-center px-4">
                            <p className="text-lg font-bold text-gray-800 mb-2">
                              로그인이 필요한 서비스입니다
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                              인기 차트를 확인하려면 로그인해주세요
                            </p>
                            <a
                              href="/login?returnUrl=/shorts-ranking"
                              className="inline-block px-6 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition"
                            >
                              Google 로그인
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 핫 키워드 리스트 */}
              {!loading && !error && activeTab === 'keywords' && (
                <div className="bg-white rounded-lg shadow p-4 relative">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm md:text-base">
                    🔥 핫 키워드
                  </h3>
                  {keywords.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      해당 카테고리는 유튜브에서 제공하는 데이터가 적어 키워드 분석이 어렵습니다.
                    </p>
                  ) : (
                    <>
                      <div className={`space-y-2 ${!isLoggedIn && !isCheckingAuth ? 'blur-sm pointer-events-none select-none' : ''}`}>
                        {keywords.map((kw) => (
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
                              <div className="text-[11px] text-gray-500 whitespace-nowrap flex gap-2">
                                <span>{kw.video_count}개</span>
                                <span>총 {kw.total_views.toLocaleString()}회</span>
                              </div>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              평균 {kw.avg_views.toLocaleString()}회/영상
                            </div>
                            {kw.sample_titles.length > 0 && (
                              <p className="text-[11px] text-gray-600 mt-1 line-clamp-1">
                                💡 {kw.sample_titles[0]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* 로그인 안내 오버레이 */}
                      {!isLoggedIn && !isCheckingAuth && (
                        <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 bg-white/60 rounded-lg">
                          <div className="text-center px-4">
                            <p className="text-lg font-bold text-gray-800 mb-2">
                              로그인이 필요한 서비스입니다
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                              핫 키워드를 확인하려면 로그인해주세요
                            </p>
                            <a
                              href="/login?returnUrl=/shorts-ranking"
                              className="inline-block px-6 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition"
                            >
                              Google 로그인
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
          </main>
        </div>
      </div>
    </div>
  );
}
