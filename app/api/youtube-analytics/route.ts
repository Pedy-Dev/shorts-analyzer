// app/api/youtube-analytics/route.ts
// YouTube Studio "동영상 분석 탭"과 동일한 기준
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

// ========================================
// 유틸리티 함수들
// ========================================

/**
 * PT(태평양 시간) 기준 날짜 계산
 * YouTube Studio는 PT 시간대 기준으로 날짜를 자름
 */
function getPTDate(date: Date): string {
  // PT는 UTC-8 (표준시) 또는 UTC-7 (서머타임)
  // 간단하게 UTC-8로 고정 (대부분의 경우 안전)
  const ptDate = new Date(date.getTime());
  ptDate.setUTCHours(ptDate.getUTCHours() - 8);
  return ptDate.toISOString().split('T')[0];
}

/**
 * 현재 PT 기준 날짜
 */
function getCurrentPTDate(): string {
  return getPTDate(new Date());
}

/**
 * N일 전 PT 기준 날짜
 */
function getPTDateDaysAgo(daysAgo: number): Date {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  // PT 시간대로 변환
  now.setUTCHours(now.getUTCHours() - 8);
  return now;
}

/**
 * ISO 8601 duration을 초로 변환
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)M)?(\d+)S/);
  if (!match) return 0;
  const minutes = parseInt(match[1] || '0');
  const seconds = parseInt(match[2] || '0');
  return minutes * 60 + seconds;
}

/**
 * 숫자 안전 변환
 */
function safeNumber(value: any): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

// ========================================
// 메인 API 핸들러
// ========================================

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 access_token 가져오기
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // OAuth 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    // YouTube API 초기화
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const youtubeAnalytics = google.youtubeAnalytics({
      version: 'v2',
      auth: oauth2Client,
    });

    // ========================================
    // 1단계: 채널 정보 가져오기
    // ========================================
    console.log('📌 [1/5] 채널 정보 수집 중...');
    const channelResponse = await youtube.channels.list({
      part: ['id', 'snippet'],
      mine: true,
    });

    const channels = channelResponse.data.items || [];
    if (channels.length === 0) {
      return NextResponse.json(
        { error: '로그인된 채널을 찾을 수 없습니다. 다시 로그인해주세요.' },
        { status: 404 }
      );
    }

    const myChannel = channels[0];
    const channelId = myChannel.id!;
    console.log(`✅ 채널: ${myChannel.snippet?.title} (${channelId})`);

    // ========================================
    // 2단계: 최근 영상 목록 가져오기
    // ========================================
    console.log('📌 [2/5] 영상 목록 수집 중...');
    const searchResponse = await youtube.search.list({
      part: ['id', 'snippet'],
      forMine: true,
      maxResults: 50,
      order: 'date',
      type: ['video'],
    });

    const videos = searchResponse.data.items || [];
    if (videos.length === 0) {
      return NextResponse.json(
        { error: '영상이 없습니다' },
        { status: 404 }
      );
    }

    const videoIds = videos.map(v => v.id?.videoId).filter(Boolean) as string[];

    // ========================================
    // 3단계: 영상 상세 정보 가져오기
    // ========================================
    console.log('📌 [3/5] 영상 상세 정보 가져오는 중...');
    const videoDetailsResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: videoIds,
    });

    const videoDetails = videoDetailsResponse.data.items || [];

    // ========================================
    // 4단계: 쇼츠만 필터링 + 48시간 이상 지난 영상만
    // ========================================
    console.log('📌 [4/5] Shorts 필터링 중... (60초 이하 + 48시간 경과)');

    // PT 기준 48시간 전
    const twoDaysAgoPT = getPTDateDaysAgo(2);

    const shortsVideos = videoDetails.filter(video => {
      // 1) 60초 이하 체크
      const duration = parseDuration(video.contentDetails?.duration || '');
      if (duration > 60 || duration === 0) {
        return false;
      }

      // 2) 48시간 이상 지난 영상인지 체크 (PT 기준)
      const publishedAt = new Date(video.snippet?.publishedAt || '');
      if (publishedAt > twoDaysAgoPT) {
        console.log(`  ⏰ 제외 (48시간 미경과): ${video.snippet?.title}`);
        return false;
      }

      return true;
    });

    if (shortsVideos.length === 0) {
      return NextResponse.json(
        { error: '분석 가능한 Shorts 영상이 없습니다. (60초 이하 + 48시간 경과 필요)' },
        { status: 404 }
      );
    }

    console.log(`✅ ${shortsVideos.length}개 Shorts 발견!`);

    // ========================================
    // 5단계: Analytics 데이터 수집 (전체 기간 합산)
    // ========================================
    console.log('📌 [5/5] Analytics 데이터 수집 중...');
    console.log('  ℹ️  YouTube Studio와 동일한 기준 적용:');
    console.log('      - PT 시간대 기준');
    console.log('      - 게시 이후 ~ 현재까지 전체 기간');
    console.log('      - 전체 트래픽 소스 (필터 없음)');

    const analyticsPromises = shortsVideos.map(async (video) => {
      const videoId = video.id!;
      const videoTitle = video.snippet?.title || '';
      const durationInSeconds = parseDuration(video.contentDetails?.duration || '');

      try {
        // 영상 업로드 날짜 (PT 기준)
        const publishedAt = new Date(video.snippet?.publishedAt || '');
        const videoStartDate = getPTDate(publishedAt);

        // 현재 날짜 (PT 기준)
        const videoEndDate = getCurrentPTDate();

        console.log(`  📊 [${videoId}] ${videoTitle}`);
        console.log(`     기간: ${videoStartDate} ~ ${videoEndDate} (PT)`);

        // Analytics API 호출
        const response = await youtubeAnalytics.reports.query({
          ids: 'channel==MINE',
          startDate: videoStartDate,
          endDate: videoEndDate,
          metrics: [
            'views',                    // 조회수
            'likes',                    // 좋아요
            'comments',                 // 댓글
            'shares',                   // 공유
            'averageViewDuration',      // 평균 시청시간(초)
            'averageViewPercentage',    // 평균 시청률(%)
            'subscribersGained',        // 구독자 증가
            'engagedViews'              // 유효조회수
          ].join(','),
          dimensions: 'video',          // ✅ 전체 기간 합산
          filters: `video==${videoId}`,
        });

        const rows = response.data.rows || [];

        if (rows.length === 0) {
          console.log(`     ⚠️  데이터 없음`);
          return {
            videoId,
            video,
            durationInSeconds,
            analytics: null,
          };
        }

        // row는 1개만 나옴 (전체 기간 합산)
        const row = rows[0];

        console.log(`\n📋 [${videoId}] 원본 Analytics 데이터 (전체 기간):`);
        console.log(`   [0] video_id: ${row[0]}`);
        console.log(`   [1] views (조회수): ${row[1]}`);
        console.log(`   [2] likes (좋아요): ${row[2]}`);
        console.log(`   [3] comments (댓글): ${row[3]}`);
        console.log(`   [4] shares (공유): ${row[4]}`);
        console.log(`   [5] averageViewDuration (평균 시청시간): ${row[5]}`);
        console.log(`   [6] averageViewPercentage (평균 조회율): ${row[6]}`);
        console.log(`   [7] subscribersGained (구독자): ${row[7]}`);
        console.log(`   [8] engagedViews (유효조회): ${row[8]}`);

        // 데이터 추출 (이미 합산된 값)
        const totalViews = safeNumber(row[1]);
        const totalLikes = safeNumber(row[2]);
        const totalComments = safeNumber(row[3]);
        const totalShares = safeNumber(row[4]);
        const averageViewDuration = safeNumber(row[5]);
        const averageViewPercentage = safeNumber(row[6]);
        const totalSubscribersGained = safeNumber(row[7]);
        const apiEngagedViews = safeNumber(row[8]);

        console.log(`     ✅ 조회수: ${totalViews.toLocaleString()}`);
        console.log(`     ✅ 평균 시청: ${averageViewDuration.toFixed(1)}초 (${averageViewPercentage.toFixed(1)}%)`);
        console.log(`     ✅ 유효조회수: ${apiEngagedViews.toLocaleString()}`);

        // 참여율 계산
        const engagementRate = totalViews > 0
          ? (totalLikes + totalComments + totalShares) / totalViews
          : 0;

        const subscriberConversionRate = totalViews > 0
          ? totalSubscribersGained / totalViews
          : 0;

        return {
          videoId,
          video,
          durationInSeconds,
          analytics: {
            views: totalViews,
            likes: totalLikes,
            comments: totalComments,
            shares: totalShares,
            subscribersGained: totalSubscribersGained,
            averageViewDuration,
            averageViewPercentage,
            engagementRate,
            subscriberConversionRate,
            engagedViews: apiEngagedViews,  // API 제공 값 사용
          },
        };

      } catch (error: any) {
        console.error(`     ❌ Analytics 실패: ${error.message}`);
        return {
          videoId,
          video,
          durationInSeconds,
          analytics: null,
        };
      }
    });

    const analyticsResults = await Promise.all(analyticsPromises);

    // ========================================
    // 6단계: 최종 데이터 포맷팅
    // ========================================
    console.log('📌 최종 데이터 정리 중...');

    const finalVideos = analyticsResults.map((result) => {
      const { videoId, video, durationInSeconds, analytics } = result;

      // 업로드 후 경과 일수 (PT 기준)
      const publishedAt = new Date(video.snippet?.publishedAt || '');
      const now = new Date();
      now.setUTCHours(now.getUTCHours() - 8); // PT 변환
      const daysSinceUpload = Math.floor(
        (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 길이 그룹
      let durationGroup = '중편(40~60초)';
      if (durationInSeconds <= 20) {
        durationGroup = '초단편(~20초)';
      } else if (durationInSeconds <= 40) {
        durationGroup = '단편(20~40초)';
      }

      if (!analytics) {
        // Analytics 데이터 없는 경우
        return {
          video_id: videoId,
          title: video.snippet?.title || '',
          thumbnail: video.snippet?.thumbnails?.high?.url || '',
          published_at: video.snippet?.publishedAt || '',
          days_since_upload: daysSinceUpload,
          duration: durationInSeconds,
          duration_group: durationGroup,

          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          subscribersGained: 0,

          averageViewDuration: null,
          averageViewPercentage: null,
          engagementRate: null,
          subscriberConversionRate: null,
          engagedViews: null,
        };
      }

      // Analytics 데이터 있는 경우
      return {
        video_id: videoId,
        title: video.snippet?.title || '',
        thumbnail: video.snippet?.thumbnails?.high?.url || '',
        published_at: video.snippet?.publishedAt || '',
        days_since_upload: daysSinceUpload,
        duration: durationInSeconds,
        duration_group: durationGroup,

        // 기본 통계
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        subscribersGained: analytics.subscribersGained,

        // YouTube Studio 공식 기반 지표
        averageViewDuration: analytics.averageViewDuration,           // 초
        averageViewPercentage: analytics.averageViewPercentage,       // %
        engagementRate: analytics.engagementRate,                     // 비율
        subscriberConversionRate: analytics.subscriberConversionRate, // 비율

        // YouTube API 제공 지표
        engagedViews: analytics.engagedViews,                         // 유효조회수
      };
    });

    // ========================================
    // 7단계: 채널 평균 통계 계산
    // ========================================
    const validVideos = finalVideos.filter(v => v.averageViewDuration !== null);

    let avgViews = 0;
    let avgViewDuration = 0;
    let avgViewPercentage = 0;
    let avgEngagementRate = 0;
    let avgDuration = 0;
    let avgEngagedViews = 0;

    if (validVideos.length > 0) {
      avgViews = validVideos.reduce((sum, v) => sum + v.views, 0) / validVideos.length;
      avgViewDuration = validVideos.reduce((sum, v) => sum + (v.averageViewDuration || 0), 0) / validVideos.length;
      avgViewPercentage = validVideos.reduce((sum, v) => sum + (v.averageViewPercentage || 0), 0) / validVideos.length;
      avgEngagementRate = validVideos.reduce((sum, v) => sum + (v.engagementRate || 0), 0) / validVideos.length;
      avgDuration = validVideos.reduce((sum, v) => sum + v.duration, 0) / validVideos.length;

      // 유효조회수 평균 계산 (null 아닌 것만)
      const videosWithEngaged = validVideos.filter(v => v.engagedViews !== null);
      if (videosWithEngaged.length > 0) {
        avgEngagedViews = videosWithEngaged.reduce((sum, v) => sum + (v.engagedViews || 0), 0) / videosWithEngaged.length;
      }
    }

    console.log(`✅ 분석 완료: ${finalVideos.length}개 영상`);
    console.log(`   📊 채널 평균:`);
    console.log(`      - 조회수: ${avgViews.toFixed(0)}`);
    console.log(`      - 유효조회수: ${avgEngagedViews.toFixed(0)}`);
    console.log(`      - 평균 시청시간: ${avgViewDuration.toFixed(1)}초`);
    console.log(`      - 평균 시청률: ${avgViewPercentage.toFixed(1)}%`);

    // ========================================
    // 최종 응답
    // ========================================
    return NextResponse.json({
      success: true,
      metadata: {
        timezone: 'PT (Pacific Time, UTC-8)',
        period: '게시 이후 ~ 현재까지 전체 기간',
        traffic_source: '전체 (필터 없음)',
        note: 'YouTube Studio "동영상 분석" 탭과 동일한 기준',
      },
      channel: {
        id: channelId,
        title: myChannel.snippet?.title || '',
        stats: {
          avgViews,
          avgEngagedViews,
          avgViewDuration,      // 초
          avgViewPercentage,    // %
          avgEngagementRate,    // 비율
          avgDuration,          // 초
        },
      },
      videos: finalVideos,
    });

  } catch (error: any) {
    console.error('❌ YouTube Analytics API 오류:', error);

    if (error.code === 401) {
      return NextResponse.json(
        { error: '로그인이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'YouTube 데이터 가져오기 실패',
        details: error.message,
      },
      { status: 500 }
    );
  }
}