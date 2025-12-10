// app/api/analysis-history/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server';

// 하이브리드 저장 방식: analysis_raw에서 analysis_summary 재생성
function parseRawToSummary(raw: any, isOwnChannel: boolean): any {
  console.log('🔄 analysis_raw에서 summary 재생성 시작...');

  // 1. 문자열이면 JSON 파싱
  let parsed;
  if (typeof raw === 'string') {
    try {
      // JSON 문자열에서 코드 블록 제거
      let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      // JSON 객체만 추출
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }

      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('❌ raw 파싱 실패:', e);
      // 파싱 실패 시 raw 그대로 반환
      return raw;
    }
  } else {
    parsed = raw;
  }

  // 2. schemaVersion 추가
  const schemaVersion = isOwnChannel ? 'v1_own' : 'v1_external';

  console.log('✅ summary 재생성 완료, schemaVersion:', schemaVersion);

  return {
    ...parsed,
    schemaVersion,
  };
}

// GET: 특정 분석 기록 조회 (하이브리드 로직 포함)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();

  try {
    // params를 await로 풀어내기 (Next.js 15+)
    const { id } = await context.params;

    // 1. 로그인 체크
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 본인 기록만 조회
    const { data: record, error } = await supabase
      .from('channel_analysis_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // ⭐ 보안: 본인 것만
      .single();

    if (error || !record) {
      console.error('❌ 분석 기록 조회 실패:', error);
      return NextResponse.json(
        {
          success: false,
          error: '분석 기록을 찾을 수 없습니다',
        },
        { status: 404 }
      );
    }

    console.log('✅ 분석 기록 조회 성공:', id);

    // 3. 하이브리드 로직: schemaVersion 체크
    let finalSummary = record.analysis_summary;
    const currentVersion = finalSummary?.schemaVersion;
    const isOwnChannel = record.is_own_channel || false;

    console.log('📊 schemaVersion:', currentVersion);

    // v1 스키마가 아니면 재생성 시도
    if (currentVersion !== 'v1_external' && currentVersion !== 'v1_own') {
      console.log('⚙️ 구버전 또는 schemaVersion 없음 → 재생성 시도');

      // analysis_raw가 있으면 재생성
      if (record.analysis_raw) {
        console.log('✅ analysis_raw 발견 → 재생성 시작');

        try {
          // raw에서 summary 재생성
          const regenerated = parseRawToSummary(
            record.analysis_raw,
            isOwnChannel
          );

          finalSummary = regenerated;

          // DB 업데이트
          const { error: updateError } = await supabase
            .from('channel_analysis_history')
            .update({ analysis_summary: finalSummary })
            .eq('id', id);

          if (updateError) {
            console.error(
              '⚠️ analysis_summary 업데이트 실패:',
              updateError
            );
            // 실패해도 재생성된 데이터는 응답으로 사용
          } else {
            console.log(
              '✅ analysis_summary 업데이트 완료 (schemaVersion 추가됨)'
            );
          }
        } catch (parseError) {
          console.error('❌ raw 파싱 실패:', parseError);
          // 파싱 실패 시 기존 summary 사용 (v0 취급)
          console.log('→ 기존 analysis_summary 사용 (v0)');
        }
      } else {
        // analysis_raw도 없으면 기존 summary 사용 (v0 취급)
        console.log('⚠️ analysis_raw 없음 → 기존 analysis_summary 사용 (v0 취급)');
      }
    } else {
      console.log('✅ 최신 스키마 (v1) → 그대로 사용');
    }

    return NextResponse.json({
      success: true,
      record: {
        ...record,
        analysis_summary: finalSummary,
      },
    });
  } catch (error: any) {
    console.error('❌ 분석 기록 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH: 분석 기록 업데이트 (컨텐츠 가이드 추가용)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();

  try {
    // Next.js 15 스타일: params를 await로 풀어냄
    const { id } = await context.params;

    // 1. 로그인 체크
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 요청 body 파싱
    const body = await request.json();
    const { contentGuideline, ...otherUpdates } = body;

    console.log('📝 분석 기록 업데이트 요청:', {
      id,
      userId,
      hasContentGuideline: typeof contentGuideline === 'string',
      otherKeys: Object.keys(otherUpdates),
    });

    // 최종 업데이트 payload
    const updates: any = { ...otherUpdates };

    // 3. contentGuideline이 들어온 경우: 서버에서 기존 summary에 merge
    if (typeof contentGuideline === 'string') {
      // 3-1. 기존 레코드 조회
      const { data: record, error: fetchError } = await supabase
        .from('channel_analysis_history')
        .select('analysis_summary, is_own_channel')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchError || !record) {
        console.error('❌ 기존 분석 기록 조회 실패:', fetchError);
        return NextResponse.json(
          { success: false, error: '분석 기록을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      const existingSummary = record.analysis_summary || {};
      const isOwnChannel = record.is_own_channel || false;

      // schemaVersion 유지/부여
      const schemaVersion =
        existingSummary.schemaVersion ||
        (isOwnChannel ? 'v1_own' : 'v1_external');

      const mergedSummary = {
        ...existingSummary,
        contentGuideline,
        schemaVersion,
      };

      updates.analysis_summary = mergedSummary;

      // 👇 guideline_length 컬럼도 함께 갱신
      updates.guideline_length = contentGuideline.length;

      console.log(
        '✅ contentGuideline merge 완료, schemaVersion:',
        schemaVersion
      );
    }

    // 4. 실제 업데이트 수행
    const { data: updatedData, error } = await supabase
      .from('channel_analysis_history')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId) // ⭐ 보안: 본인 것만
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: '업데이트할 분석 기록을 찾을 수 없습니다',
          },
          { status: 404 }
        );
      }

      console.error('❌ 분석 기록 업데이트 실패:', error);
      throw error;
    }

    if (!updatedData) {
      return NextResponse.json(
        {
          success: false,
          error: '업데이트할 분석 기록을 찾을 수 없습니다',
        },
        { status: 404 }
      );
    }

    console.log('✅ 분석 기록 업데이트 완료:', id);

    return NextResponse.json({
      success: true,
      message: '분석 기록이 업데이트되었습니다',
      data: updatedData,
    });
  } catch (error: any) {
    console.error('❌ 분석 기록 업데이트 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE: 분석 기록 삭제
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient();

  try {
    // params를 await로 풀어내기 (Next.js 15+)
    const { id } = await context.params;

    // 1. 로그인 체크
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    console.log('🗑️ 분석 기록 삭제 시도:', {
      id,
      userId,
    });

    // 2. 본인 기록만 삭제 (보안 핵심)
    const { data: deletedData, error } = await supabase
      .from('channel_analysis_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // ⭐ WHERE id = :id AND user_id = :user_id
      .select()
      .single();

    if (error) {
      // 404 에러 처리
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: '삭제할 분석 기록을 찾을 수 없습니다',
          },
          { status: 404 }
        );
      }

      console.error('❌ 분석 기록 삭제 실패:', error);
      throw error;
    }

    if (!deletedData) {
      return NextResponse.json(
        {
          success: false,
          error: '삭제할 분석 기록을 찾을 수 없습니다',
        },
        { status: 404 }
      );
    }

    console.log('✅ 분석 기록 삭제 완료:', {
      id: id,
      channel: deletedData.channel_title,
    });

    return NextResponse.json({
      success: true,
      message: '분석 기록이 삭제되었습니다',
      deletedId: id,
    });
  } catch (error: any) {
    console.error('❌ 분석 기록 삭제 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
