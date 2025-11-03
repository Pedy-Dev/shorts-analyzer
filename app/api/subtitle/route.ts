// app/api/subtitle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

// ✅ 새로 추가: 자막 정제 함수
function cleanSubtitle(text: string): string {
  // 1. 🔥 과도한 마침표 먼저 제거 (가장 중요!)
  text = text.replace(/\.\s+/g, ' ');  // "단어. 단어." → "단어 단어"
  text = text.replace(/\.+/g, '');     // 남은 마침표들도 제거
  
  // 2. 중복 단어/문장 제거 ("감사합니다 감사합니다" → "감사합니다")
  text = text.replace(/(\S+)(\s+\1)+/g, '$1');
  
  // 3. 과도한 공백 정리
  text = text.replace(/\s+/g, ' ');
  
  // 4. 연속된 마침표 정리 (혹시 남아있다면)
  text = text.replace(/\.{2,}/g, '.');
  
  // 5. 문장 시작 대문자 정리
  text = text.replace(/\.\s+([a-z])/g, (match, p1) => '. ' + p1.toUpperCase());
  
  return text.trim();
}

export async function GET(request: NextRequest) {
  try {
    const videoId = request.nextUrl.searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json({ error: '비디오 ID가 필요합니다' }, { status: 400 });
    }

    console.log(`[자막 API] 🎬 요청 비디오: ${videoId}`);

    const youtube = await Innertube.create();
    const videoInfo = await youtube.getInfo(videoId);
    const transcriptData = await videoInfo.getTranscript();
    
    if (!transcriptData || !transcriptData.transcript) {
      console.log('[자막 API] ⚠️ 자막 없음');
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }

    const segments = transcriptData.transcript.content.body.initial_segments;
    
    if (!segments || segments.length === 0) {
      console.log('[자막 API] ⚠️ 자막 세그먼트 없음');
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }

    // 자막 텍스트 추출
    const subtitleText = segments
      .map((segment: any) => segment.snippet?.text || '')
      .filter((text: string) => text.length > 0)
      .join(' ')
      .trim();

    if (subtitleText.length === 0) {
      console.log('[자막 API] ❌ 자막 텍스트 추출 실패');
      return NextResponse.json({ error: '자막 추출 실패' }, { status: 500 });
    }

    // ✅ 새로 추가: 전처리 적용
    const cleanedText = cleanSubtitle(subtitleText);

    console.log(`[자막 API] ✅ 성공: ${cleanedText.length}자 (원본: ${subtitleText.length}자)`);
    console.log(`[자막 API] 📝 샘플: ${cleanedText.substring(0, 100)}...`);

    return NextResponse.json({ 
      subtitle: cleanedText,  // ✅ 정제된 텍스트 반환
      length: cleanedText.length,
      originalLength: subtitleText.length
    });

  } catch (error: any) {
    console.error('[자막 API] ❌ 오류:', error.message);
    
    if (error.message?.includes('Transcript') || error.message?.includes('transcript')) {
      return NextResponse.json({ error: '자막이 없습니다' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: '서버 오류', 
      details: error.message 
    }, { status: 500 });
  }
}