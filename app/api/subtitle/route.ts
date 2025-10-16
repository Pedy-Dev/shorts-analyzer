import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

export async function GET(request: NextRequest) {
  try {
    const videoId = request.nextUrl.searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json({ error: '비디오 ID가 필요합니다' }, { status: 400 });
    }

    console.log(`[자막 API] 🎬 요청 비디오: ${videoId}`);

    // YouTube 내부 API 초기화
    const youtube = await Innertube.create();
    
    // 영상 정보 가져오기
    const videoInfo = await youtube.getInfo(videoId);
    
    // 자막 가져오기
    const transcriptData = await videoInfo.getTranscript();
    
    if (!transcriptData || !transcriptData.transcript) {
      console.log('[자막 API] ⚠️ 자막 없음');
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }

    // 자막 텍스트 추출
    const segments = transcriptData.transcript.content.body.initial_segments;
    
    if (!segments || segments.length === 0) {
      console.log('[자막 API] ⚠️ 자막 세그먼트 없음');
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }

    // 모든 자막 텍스트 합치기
    const subtitleText = segments
      .map((segment: any) => segment.snippet?.text || '')
      .filter((text: string) => text.length > 0)
      .join(' ')
      .trim();

    if (subtitleText.length === 0) {
      console.log('[자막 API] ❌ 자막 텍스트 추출 실패');
      return NextResponse.json({ error: '자막 추출 실패' }, { status: 500 });
    }

    console.log(`[자막 API] ✅ 성공: ${subtitleText.length}자`);
    console.log(`[자막 API] 📝 샘플: ${subtitleText.substring(0, 100)}...`);

    return NextResponse.json({ 
      subtitle: subtitleText,
      length: subtitleText.length 
    });

  } catch (error: any) {
    console.error('[자막 API] ❌ 오류:', error.message);
    
    // 자막이 없는 경우
    if (error.message?.includes('Transcript') || error.message?.includes('transcript')) {
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error.message 
    }, { status: 500 });
  }
}