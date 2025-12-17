// app/api/subtitle/route.ts(타채널분석시, 영상 스크립트 받아오는 역할)
import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

function cleanSubtitle(text: string): string {
  text = text.replace(/\.\s+/g, ' ');
  text = text.replace(/\.+/g, '');
  text = text.replace(/(\S+)(\s+\1)+/g, '$1');
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\.{2,}/g, '.');
  text = text.replace(/\.\s+([a-z])/g, (match, p1) => '. ' + p1.toUpperCase());
  return text.trim();
}

// 🔥 비디오 메타정보 먼저 가져오기 (자막과 독립적으로)
async function getVideoMetadata(videoId: string) {
  try {
    const youtube = await Innertube.create({
      cache: false,
      generate_session_locally: true
    });
    
    const videoInfo = await youtube.getInfo(videoId);
    
    // channel 객체 전체 구조 파악
    const channelObj = videoInfo.basic_info?.channel;
    
    // 채널명 추출 (모든 가능한 경로 시도)
    let channelName = '알 수 없음';
    if (channelObj) {
      channelName = 
        channelObj.name ||
        channelObj.text ||
        channelObj.author ||
        (channelObj.runs && channelObj.runs[0]?.text) ||
        (typeof channelObj === 'string' ? channelObj : null) ||
        '알 수 없음';
    }
    
    // 제목 추출
    const videoTitle = 
      videoInfo.basic_info?.title || 
      videoInfo.primary_info?.title?.text ||
      '알 수 없음';
    
    // 추가 메타정보
    const duration = videoInfo.basic_info?.duration || 0;
    const viewCount = videoInfo.basic_info?.view_count || 0;
    const isShort = duration <= 60;
    
    return {
      videoInfo,  // 전체 객체도 반환 (자막 추출에 사용)
      metadata: {
        channelName,
        videoTitle,
        duration,
        viewCount,
        isShort,
        videoId
      }
    };
  } catch (error: any) {
    console.error(`[자막 API] 💥 메타정보 추출 실패: ${error.message}`);
    return null;
  }
}

// 🔥 자막 추출 (XML 직접 파싱 방식 - getTranscript 차단 우회)
async function extractTranscript(videoInfo: any, _metadata: any) {
  console.log(`[자막 API] 📝 자막 추출 시도 (XML 방식)`);

  // 1. captions에서 자막 트랙 URL 추출
  const captions = videoInfo.captions;

  if (!captions || !captions.caption_tracks || captions.caption_tracks.length === 0) {
    throw new Error('No caption tracks available');
  }

  // 한국어 자막 우선, 없으면 첫 번째 자막 사용
  const captionTrack =
    captions.caption_tracks.find((track: any) => track.language_code === 'ko') ||
    captions.caption_tracks.find((track: any) => track.language_code?.startsWith('ko')) ||
    captions.caption_tracks[0];

  const captionUrl = captionTrack.base_url;

  if (!captionUrl) {
    throw new Error('No caption URL found');
  }

  console.log(`[자막 API] 🔗 자막 URL 발견: ${captionTrack.name?.text || captionTrack.language_code}`);

  // 2. XML 자막 데이터 fetch (429 에러 시 재시도)
  let xmlText = '';
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(captionUrl);

    if (response.ok) {
      xmlText = await response.text();
      break;
    }

    if (response.status === 429) {
      // 속도 제한 - 지수 백오프로 대기 후 재시도
      const waitTime = Math.pow(2, attempt) * 1000; // 2초, 4초, 8초
      console.log(`[자막 API] ⏳ 429 속도제한 - ${waitTime / 1000}초 대기 후 재시도 (${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      if (attempt === maxRetries) {
        throw new Error(`Rate limited (429) after ${maxRetries} retries`);
      }
    } else {
      throw new Error(`Failed to fetch caption XML: ${response.status}`);
    }
  }

  // 3. XML 파싱 (정규식으로 <text> 태그 내용 추출)
  const textMatches = xmlText.match(/<text[^>]*>([^<]*)<\/text>/g);

  if (!textMatches || textMatches.length === 0) {
    throw new Error('No text segments found in XML');
  }

  const subtitleText = textMatches
    .map((match) => {
      // <text ...>내용</text> 에서 내용만 추출
      const content = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
      // HTML 엔티티 디코딩
      return content
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ');
    })
    .filter((text) => text.trim().length > 0)
    .join(' ')
    .trim();

  if (subtitleText.length === 0) {
    throw new Error('Empty subtitle text after parsing');
  }

  return cleanSubtitle(subtitleText);
}

// 🔥 메인 API 핸들러
export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: '비디오 ID가 필요합니다' }, { status: 400 });
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[자막 API] 🎯 요청 시작: ${videoId}`);
  
  try {
    // 1단계: 메타정보 먼저 가져오기 (자막 실패해도 이건 있음)
    const result = await getVideoMetadata(videoId);
    
    if (!result) {
      console.error(`[자막 API] ❌ 완전 실패: 비디오 정보 자체를 못 가져옴 | ${videoId}`);
      return NextResponse.json({ 
        error: '비디오 정보를 가져올 수 없습니다',
        videoId 
      }, { status: 500 });
    }
    
    const { videoInfo, metadata } = result;
    
    // 🔥 중요: 채널 정보는 무조건 로깅
    console.log(`[자막 API] 📺 채널: ${metadata.channelName}`);
    console.log(`[자막 API] 🎬 제목: ${metadata.videoTitle}`);
    console.log(`[자막 API] ⏱️ 길이: ${metadata.duration}초 ${metadata.isShort ? '(Shorts)' : '(일반)'}`);
    console.log(`[자막 API] 👁️ 조회수: ${metadata.viewCount.toLocaleString()}`);
    
    // 2단계: 자막 추출 시도 (실패해도 메타정보는 이미 있음)
    try {
      const subtitle = await extractTranscript(videoInfo, metadata);
      
      console.log(`[자막 API] ✅ 성공 | ${videoId} | ${metadata.channelName} | ${subtitle.length}자`);
      console.log(`[자막 API] 📝 샘플: ${subtitle.substring(0, 100)}...`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      return NextResponse.json({
        subtitle,
        length: subtitle.length,
        metadata  // 메타정보도 함께 반환
      });
      
    } catch (subtitleError: any) {
      // 자막 추출 실패
      console.error(`[자막 API] ❌ 자막 추출 실패 | ${videoId} | ${metadata.channelName}`);
      console.error(`[자막 API] 💥 에러: ${subtitleError.message}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return NextResponse.json({
        error: '자막 추출 실패',
        videoId,
        channelName: metadata.channelName,
        videoTitle: metadata.videoTitle,
        details: subtitleError.message
      }, { status: 404 });
    }
    
  } catch (error: any) {
    console.error(`[자막 API] 💥 예상치 못한 오류: ${error.message}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    return NextResponse.json({ 
      error: '서버 오류',
      videoId,
      details: error.message 
    }, { status: 500 });
  }
}
