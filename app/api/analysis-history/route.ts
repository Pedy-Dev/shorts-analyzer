import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase-server';
import { cookies } from 'next/headers';

// GET: 사용자의 분석 기록 조회
export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  try {
    // 쿠키에서 사용자 ID 가져오기
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('📌 사용자 분석 기록 조회:', userId);

    // DB에서 사용자의 분석 기록 가져오기
    const { data, error } = await supabase
      .from('channel_analysis_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 분석 기록 조회 실패:', error);
      return NextResponse.json(
        { error: '분석 기록을 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    console.log('✅ 분석 기록 조회 완료:', data?.length || 0, '개');

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ 조회 중 오류:', error);
    return NextResponse.json(
      { error: '조회 실패: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE: 특정 분석 기록 삭제
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient();

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');

    if (!recordId) {
      return NextResponse.json(
        { error: '삭제할 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // DB에서 삭제 (본인 기록만 삭제 가능)
    const { error } = await supabase
      .from('channel_analysis_history')
      .delete()
      .eq('id', recordId)
      .eq('user_id', userId); // 본인 기록만 삭제 가능

    if (error) {
      console.error('❌ 삭제 실패:', error);
      return NextResponse.json(
        { error: '삭제 실패: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ 분석 기록 삭제 완료:', recordId);

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('❌ 삭제 중 오류:', error);
    return NextResponse.json(
      { error: '삭제 실패: ' + error.message },
      { status: 500 }
    );
  }
}