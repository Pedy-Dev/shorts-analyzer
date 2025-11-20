// app/api/analysis-history/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: 특정 분석 기록 조회
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
      .eq('user_id', userId)  // ⭐ 보안: 본인 것만
      .single();

    if (error || !record) {
      console.error('❌ 분석 기록 조회 실패:', error);
      return NextResponse.json(
        {
          success: false,
          error: '분석 기록을 찾을 수 없습니다'
        },
        { status: 404 }
      );
    }

    console.log('✅ 분석 기록 조회 성공:', id);

    return NextResponse.json({
      success: true,
      record
    });

  } catch (error: any) {
    console.error('❌ 분석 기록 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다',
        details: error.message
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

    const updates = await request.json();

    console.log('📝 분석 기록 업데이트:', {
      id,
      userId,
      updates: Object.keys(updates)
    });

    // 2. 본인 기록만 업데이트 (보안)
    const { data: updatedData, error } = await supabase
      .from('channel_analysis_history')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)  // ⭐ 보안: 본인 것만
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: '업데이트할 분석 기록을 찾을 수 없습니다'
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
          error: '업데이트할 분석 기록을 찾을 수 없습니다'
        },
        { status: 404 }
      );
    }

    console.log('✅ 분석 기록 업데이트 완료:', id);

    return NextResponse.json({
      success: true,
      message: '분석 기록이 업데이트되었습니다',
      data: updatedData
    });

  } catch (error: any) {
    console.error('❌ 분석 기록 업데이트 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다',
        details: error.message
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
      userId
    });

    // 2. 본인 기록만 삭제 (보안 핵심)
    const { data: deletedData, error } = await supabase
      .from('channel_analysis_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)  // ⭐ WHERE id = :id AND user_id = :user_id
      .select()
      .single();

    if (error) {
      // 404 에러 처리
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: '삭제할 분석 기록을 찾을 수 없습니다'
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
          error: '삭제할 분석 기록을 찾을 수 없습니다'
        },
        { status: 404 }
      );
    }

    console.log('✅ 분석 기록 삭제 완료:', {
      id: id,
      channel: deletedData.channel_title
    });

    return NextResponse.json({
      success: true,
      message: '분석 기록이 삭제되었습니다',
      deletedId: id
    });

  } catch (error: any) {
    console.error('❌ 분석 기록 삭제 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다',
        details: error.message
      },
      { status: 500 }
    );
  }
}