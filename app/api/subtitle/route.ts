// app/api/subtitle/route.ts
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

// 🔥 자막 추출 (재시도 로직 포함)
async function extractTranscript(videoInfo: any, metadata: any, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[자막 API] 📝 자막 추출 시도 ${attempt}/${maxRetries}`);
      
      const transcriptData = await videoInfo.getTranscript();
      
      if (!transcriptData || !transcriptData.transcript) {
        throw new Error('Transcript not found');
      }
      
      const segments = transcriptData.transcript.content?.body?.initial_segments;
      
      if (!segments || segments.length === 0) {
        throw new Error('No segments found');
      }
      
      const subtitleText = segments
        .map((segment: any) => segment.snippet?.text || '')
        .filter((text: string) => text.length > 0)
        .join(' ')
        .trim();
      
      if (subtitleText.length === 0) {
        throw new Error('Empty subtitle text');
      }
      
      return cleanSubtitle(subtitleText);
      
    } catch (error: any) {
      lastError = error;
      console.log(`[자막 API] ⚠️ 시도 ${attempt} 실패: ${error.message}`);
      
      if (attempt < maxRetries) {
        // 재시도 전 대기 (점진적 증가)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
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
      // 🔥 자막은 실패했지만 채널 정보는 있음!
      console.error(`[자막 API] ❌ 자막 추출 실패 | ${videoId} | ${metadata.channelName}`);
      console.error(`[자막 API] 💥 에러: ${subtitleError.message}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      // 자막 실패 원인 분석용 정보 반환
      return NextResponse.json({ 
        error: '자막 추출 실패',
        videoId,
        channelName: metadata.channelName,  // 실패해도 채널명은 반환!
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
