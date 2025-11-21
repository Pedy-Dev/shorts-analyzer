// app/api/debug/check-db-structure/route.ts
// DB 구조 확인용 임시 API (확인 후 삭제 예정)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    console.log('📊 DB 구조 확인 시작...');

    // 최신 분석 기록 1개 가져오기
    const { data: records, error } = await supabase
      .from('channel_analysis_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({
        error: '조회 실패',
        details: error.message
      }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        message: '분석 기록이 없습니다.'
      });
    }

    const record = records[0];
    const summary = record.analysis_summary;

    // 구조 분석
    const analysis = {
      basicInfo: {
        id: record.id,
        channelTitle: record.channel_title,
        createdAt: record.created_at,
      },

      analysisExists: !!summary,

      topLevelKeys: summary ? Object.keys(summary) : [],

      hasFullAnalysis: summary ? 'fullAnalysis' in summary : false,
      fullAnalysisKeys: summary?.fullAnalysis ? Object.keys(summary.fullAnalysis) : null,

      hasContentGuideline: summary ? 'contentGuideline' in summary : false,
      contentGuidelineLength: summary?.contentGuideline ? summary.contentGuideline.length : null,

      hasChannelIdentity: summary ? 'channel_identity' in summary : false,
      channelIdentityKeys: summary?.channel_identity ? Object.keys(summary.channel_identity) : null,

      mainSections: {
        topic_characteristics: summary ? 'topic_characteristics' in summary : false,
        title_analysis: summary ? 'title_analysis' in summary : false,
        script_analysis: summary ? 'script_analysis' in summary : false,
        summary_differences: summary ? 'summary_differences' in summary : false,
        _meta: summary ? '_meta' in summary : false,
      },

      // 전체 JSON 구조 (일부만)
      sampleStructure: summary ? JSON.stringify(summary, null, 2).substring(0, 3000) : null,
    };

    // 결론
    let conclusion = '';
    if (analysis.hasFullAnalysis) {
      conclusion = '✅ DB 구조: analysis_summary = { fullAnalysis: {...}, contentGuideline: "..." }\n' +
                   '   FE 접근: record.analysis_summary.fullAnalysis ← 정상';
    } else {
      conclusion = '❌ DB 구조: analysis_summary = { topic_characteristics, title_analysis, ... }\n' +
                   '   FE 접근: record.analysis_summary.fullAnalysis ← 에러!\n' +
                   '   수정 필요: record.analysis_summary로 직접 접근해야 함';
    }

    return NextResponse.json({
      success: true,
      analysis,
      conclusion,

      // 핵심 요약
      summary: {
        structure: analysis.hasFullAnalysis
          ? 'analysis_summary.fullAnalysis 구조 (감싸진 형태)'
          : 'analysis_summary가 곧 분석 결과 (직접 형태)',
        feCodeCorrect: analysis.hasFullAnalysis,
        needsFix: !analysis.hasFullAnalysis,
      }
    });

  } catch (error: any) {
    console.error('❌ 오류:', error);
    return NextResponse.json({
      error: '확인 중 오류 발생',
      details: error.message
    }, { status: 500 });
  }
}
