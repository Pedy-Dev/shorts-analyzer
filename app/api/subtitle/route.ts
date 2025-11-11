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

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  
  try {
    if (!videoId) {
      return NextResponse.json({ error: '비디오 ID가 필요합니다' }, { status: 400 });
    }

    console.log(`[자막 API] 🎯 요청 시작: ${videoId}`);

    const youtube = await Innertube.create();
    const videoInfo = await youtube.getInfo(videoId);
    
    // ✅ 🔥 디버깅: 실제 구조 확인
    console.log('[자막 API] 🔍 videoInfo 구조 확인:');
    console.log('basic_info keys:', Object.keys(videoInfo.basic_info || {}));
    console.log('basic_info.author:', videoInfo.basic_info?.author);
    console.log('basic_info.channel_id:', videoInfo.basic_info?.channel_id);
    
    // ✅ 여러 경로 시도
    const channelName = 
      videoInfo.basic_info?.author || 
      videoInfo.basic_info?.channel?.name ||
      videoInfo.basic_info?.owner?.author ||
      '알 수 없음';
    
    const videoTitle = 
      videoInfo.basic_info?.title || 
      videoInfo.primary_info?.title?.text ||
      '알 수 없음';
    
    console.log(`[자막 API] 📺 채널: ${channelName}`);
    console.log(`[자막 API] 🎬 제목: ${videoTitle}`);
    
    const transcriptData = await videoInfo.getTranscript();
    
    if (!transcriptData || !transcriptData.transcript) {
      console.log(`[자막 API] ⚠️ 자막 없음 | ${videoId} | ${channelName}`);
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }

    const segments = transcriptData.transcript.content.body.initial_segments;
    
    if (!segments || segments.length === 0) {
      console.log(`[자막 API] ⚠️ 세그먼트 없음 | ${videoId} | ${channelName}`);
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }

    const subtitleText = segments
      .map((segment: any) => segment.snippet?.text || '')
      .filter((text: string) => text.length > 0)
      .join(' ')
      .trim();

    if (subtitleText.length === 0) {
      console.log(`[자막 API] ❌ 추출 실패 | ${videoId} | ${channelName}`);
      return NextResponse.json({ error: '자막 추출 실패' }, { status: 500 });
    }

    const cleanedText = cleanSubtitle(subtitleText);

    console.log(`[자막 API] ✅ 성공 | ${videoId} | ${channelName} | ${cleanedText.length}자`);
    console.log(`[자막 API] 📝 샘플: ${cleanedText.substring(0, 100)}...`);

    return NextResponse.json({ 
      subtitle: cleanedText,
      length: cleanedText.length,
      originalLength: subtitleText.length
    });

  } catch (error: any) {
    console.error(`[자막 API] ❌ 오류 발생 | ${videoId || '없음'}`);
    console.error(`[자막 API] 💥 에러 내용: ${error.message}`);
    
    if (error.message?.includes('Transcript') || error.message?.includes('transcript')) {
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error.message 
    }, { status: 500 });
  }
}
