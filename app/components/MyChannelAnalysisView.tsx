// app/components/MyChannelAnalysisView.tsx
// 내 채널 분석 결과 표시 컴포넌트 (MyChannelTab + OwnChannelHistoryTab 공용)
'use client';

import { Fragment } from 'react';
import { Zap, Target, TrendingUp, BookOpen, AlertTriangle, Lightbulb, CheckCircle2, BarChart3, Award, Info } from 'lucide-react';

interface MyChannelAnalysisViewProps {
  analysisData: any;
}

export default function MyChannelAnalysisView({ analysisData }: MyChannelAnalysisViewProps) {
  if (!analysisData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>분석 데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 5단계 분석 프레임워크 설명 */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">5단계 채널 정밀 분석</h3>
        </div>
        <p className="text-sm md:text-base text-gray-700 mb-4">
          이 분석은 다음 5단계를 기반으로 채널을 정밀 진단합니다:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1단계 - 파란색 */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <p className="font-bold text-sm">알고리즘 노출</p>
            </div>
            <p className="text-xs opacity-90">조회수</p>
          </div>

          {/* 2단계 - 주황색 */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-white text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <p className="font-bold text-sm">진지한 시청</p>
            </div>
            <p className="text-xs opacity-90">이탈 vs 시청</p>
          </div>

          {/* 3단계 - 초록색 */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-white text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <p className="font-bold text-sm">시청 완주</p>
            </div>
            <p className="text-xs opacity-90">끝까지 봄</p>
          </div>

          {/* 4단계 - 보라색 */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-white text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <p className="font-bold text-sm">상호작용</p>
            </div>
            <p className="text-xs opacity-90">좋아요/댓글</p>
          </div>

          {/* 5단계 - 분홍색 */}
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-lg p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-white text-pink-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <p className="font-bold text-sm">구독 전환</p>
            </div>
            <p className="text-xs opacity-90">구독 클릭</p>
          </div>
        </div>
        <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-xs md:text-sm text-blue-800">
            💡 각 단계별 상위 vs 하위 그룹 차이를 분석하여 정확한 문제점을 진단합니다.
          </p>
        </div>
      </div>

      {/* 1. 핵심 요약 */}
      {analysisData.executive_summary && (
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-2xl p-5 md:p-7">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-7 h-7 md:w-8 md:h-8" />
            <h3 className="text-2xl md:text-3xl font-black">한눈에 보는 핵심</h3>
          </div>
          <div className="space-y-3">
            {analysisData.executive_summary.key_findings?.map((finding: string, i: number) => (
              <p key={i} className="text-base md:text-lg font-medium leading-relaxed">
                • {finding}
              </p>
            ))}
          </div>
          {analysisData.executive_summary.next_video_formula && (
            <div className="mt-5 bg-white/20 backdrop-blur-sm rounded-lg p-4 border-2 border-white/30">
              <p className="text-yellow-300 font-bold mb-2 text-sm md:text-base">🎯 다음 영상 성공 공식</p>
              <p className="text-lg md:text-xl font-bold">{analysisData.executive_summary.next_video_formula}</p>
            </div>
          )}
        </div>
      )}

      {/* 2. 주제 인사이트 (뭘 만들지) */}
      {analysisData.content_analysis && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-emerald-200 p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <Target className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-900">1. 주제 인사이트: 뭘 만들지?</h3>
          </div>

          {/* 소재별 성과 */}
          {analysisData.content_analysis.by_topic && (
            <div className="mb-6">
              <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                소재별 성과
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysisData.content_analysis.by_topic.topics?.map((topic: any, i: number) => (
                  <div key={i} className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900 text-base md:text-lg">{topic.topic}</p>
                        <p className="text-xs md:text-sm text-gray-600">{topic.video_count}개 영상</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${topic.type === '안정형' ? 'bg-blue-100 text-blue-700' :
                          topic.type === '알고리즘선호형' ? 'bg-orange-100 text-orange-700' :
                            topic.type === '숨은보석형' ? 'bg-purple-100 text-purple-700' :
                              'bg-red-100 text-red-700'  // 나머지는 모두 빨간색
                        }`}>
                        {topic.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs md:text-sm">
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-600 mb-1">조회수</p>
                        <p className="font-bold text-gray-900">{topic.performance.avg_views.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-gray-600 mb-1">시청률</p>
                        <p className="font-bold text-gray-900">{(topic.performance.avg_retention * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                      💡 {topic.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 각도별 성과 */}
          {analysisData.content_analysis.by_angle && (
            <div className="mb-6">
              <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                각도별 성과 ({analysisData.content_analysis.by_angle.topic})
              </h4>
              <div className="space-y-3">
                {analysisData.content_analysis.by_angle.angles?.map((angle: any, i: number) => (
                  <div key={i} className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-emerald-300 transition">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-gray-900">{angle.angle}</p>
                      <span className="text-xs font-bold text-emerald-600">{angle.video_count}개</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-gray-600">조회수</p>
                        <p className="font-bold text-gray-600">{angle.avg_views.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-gray-600 ">시청률</p>
                        <p className="font-bold text-gray-600">{(angle.avg_retention * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-700 mb-1">
                      <span className="font-medium text-green-600">✅ 강점:</span> {angle.strength}
                    </p>
                    {angle.weakness && (
                      <p className="text-xs md:text-sm text-gray-700 mb-1">
                        <span className="font-medium text-red-600">❌ 약점:</span> {angle.weakness}
                      </p>
                    )}
                    <p className="text-xs md:text-sm text-gray-700">
                      <span className="font-medium text-blue-600">💡 전략:</span> {angle.recommendation}
                    </p>
                  </div>
                ))}
              </div>
              {analysisData.content_analysis.by_angle.best_angle && (
                <div className="mt-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-4 border-2 border-emerald-400">
                  <p className="font-bold text-emerald-900 mb-1">🏆 최적 각도</p>
                  <p className="text-gray-800 font-medium">{analysisData.content_analysis.by_angle.best_angle}</p>
                </div>
              )}
            </div>
          )}

          {/* 제목 전략 */}
          {analysisData.content_analysis.by_title && (
            <div>
              <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                제목 전략
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="font-bold text-green-900 mb-3">✅ 잘되는 제목 패턴</p>
                  <p className="text-sm text-gray-700 mb-2">평균 길이: {analysisData.content_analysis.by_title.top_patterns.avg_length}자</p>
                  <p className="text-sm text-gray-700 mb-3">톤: {analysisData.content_analysis.by_title.top_patterns.tone}</p>
                  {analysisData.content_analysis.by_title.top_patterns.common_structures?.map((struct: any, i: number) => (
                    <div key={i} className="bg-white rounded p-3 mb-2">
                      <p className="text-sm font-bold text-gray-900 mb-1">{struct.structure} ({struct.frequency}회)</p>
                      <p className="text-xs text-gray-600 mb-1">예: "{struct.example}"</p>
                      <p className="text-xs text-green-700">💡 {struct.why_works}</p>
                    </div>
                  ))}
                  {analysisData.content_analysis.by_title.top_patterns.power_keywords && (
                    <div className="mt-3">
                      <p className="text-sm font-bold text-gray-900 mb-2">파워 키워드:</p>
                      <div className="flex flex-wrap gap-2">
                        {analysisData.content_analysis.by_title.top_patterns.power_keywords.map((kw: any, i: number) => (
                          <span key={i} className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-bold">
                            {kw.keyword} ({kw.frequency})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="font-bold text-red-900 mb-3">❌ 안되는 제목 패턴</p>
                  <p className="text-sm text-gray-700 mb-3">평균 길이: {analysisData.content_analysis.by_title.bottom_patterns.avg_length}자</p>
                  {analysisData.content_analysis.by_title.bottom_patterns.common_problems?.map((prob: any, i: number) => (
                    <div key={i} className="bg-white rounded p-3 mb-2">
                      <p className="text-sm font-bold text-gray-900 mb-1">{prob.problem}</p>
                      {prob.examples && (
                        <p className="text-xs text-gray-600 mb-1">예: {prob.examples.join(', ')}</p>
                      )}
                      <p className="text-xs text-red-700">❌ {prob.why_fails}</p>
                    </div>
                  ))}
                </div>
              </div>

              {analysisData.content_analysis.by_title.optimal_formula && (
                <div className="mt-4 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-4 border-2 border-yellow-400">
                  <p className="font-bold text-yellow-900 mb-2">🎯 최적 제목 공식</p>
                  <p className="text-gray-800 font-medium mb-1">구조: {analysisData.content_analysis.by_title.optimal_formula.structure}</p>
                  <p className="text-gray-800 font-medium mb-1">길이: {analysisData.content_analysis.by_title.optimal_formula.length}</p>
                  <p className="text-sm text-gray-700">
                    필수 요소: {analysisData.content_analysis.by_title.optimal_formula.must_include?.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. 패턴 진단 (왜 안됐는지) */}
      {analysisData.funnel_analysis && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-900">2. 패턴 진단: 왜 안됐는지?</h3>
          </div>

          {/* 5단계 깔때기 */}
          <div className="space-y-3 mb-6">
            {/* Stage 2: 진지한 시청 */}
            {analysisData.funnel_analysis.stage_2_engagement && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">2</span>
                  진지한 시청 전환율
                </p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">상위 그룹</p>
                    <p className="text-lg font-bold text-green-600">
                      {(analysisData.funnel_analysis.stage_2_engagement.top_group_engaged_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">하위 그룹</p>
                    <p className="text-lg font-bold text-red-600">
                      {(analysisData.funnel_analysis.stage_2_engagement.bottom_group_engaged_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">💡 {analysisData.funnel_analysis.stage_2_engagement.gap}</p>
              </div>
            )}

            {/* Stage 3: 시청 완주 */}
            {analysisData.funnel_analysis.stage_3_retention && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">3</span>
                  시청 완주율
                </p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">상위 그룹</p>
                    <p className="text-lg font-bold text-green-600">
                      {(analysisData.funnel_analysis.stage_3_retention.top_group_avg_retention * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">하위 그룹</p>
                    <p className="text-lg font-bold text-red-600">
                      {(analysisData.funnel_analysis.stage_3_retention.bottom_group_avg_retention * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">💡 {analysisData.funnel_analysis.stage_3_retention.gap}</p>
              </div>
            )}

            {/* Stage 5: 구독 전환 */}
            {analysisData.funnel_analysis.stage_5_subscription && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">5</span>
                  구독 전환율
                </p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">상위 그룹</p>
                    <p className="text-lg font-bold text-green-600">
                      {(analysisData.funnel_analysis.stage_5_subscription.top_group_sub_conv * 100).toFixed(3)}%
                    </p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">하위 그룹</p>
                    <p className="text-lg font-bold text-red-600">
                      {(analysisData.funnel_analysis.stage_5_subscription.bottom_group_sub_conv * 100).toFixed(3)}%
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">💡 {analysisData.funnel_analysis.stage_5_subscription.gap}</p>
              </div>
            )}
          </div>

          {/* 최우선 개선 포인트 */}
          {analysisData.funnel_analysis.biggest_gap_stage && (
            <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-lg p-4 border-2 border-red-400">
              <p className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                최우선 개선 포인트
              </p>
              <p className="text-gray-800 font-medium mb-1">{analysisData.funnel_analysis.biggest_gap_stage}</p>
              <p className="text-sm text-gray-700">{analysisData.funnel_analysis.priority_fix}</p>
            </div>
          )}

          {/* 시청 완주력 분석 */}
          {analysisData.retention_analysis && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="font-bold text-gray-900 mb-3">📊 시청 완주력 분석</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-green-600 mb-2">✅ 잘되는 영상</p>
                  <p className="text-xs text-gray-700 mb-1">평균 길이: {analysisData.retention_analysis.top_group.avg_length}초</p>
                  <p className="text-xs text-gray-700 mb-1">평균 시청률: {(analysisData.retention_analysis.top_group.avg_retention * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-700">패턴: {analysisData.retention_analysis.top_group.pattern}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-red-600 mb-2">❌ 안되는 영상</p>
                  <p className="text-xs text-gray-700 mb-1">평균 길이: {analysisData.retention_analysis.bottom_group.avg_length}초</p>
                  <p className="text-xs text-gray-700 mb-1">평균 시청률: {(analysisData.retention_analysis.bottom_group.avg_retention * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-700">문제: {analysisData.retention_analysis.bottom_group.pattern}</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded p-3 border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-1">💡 핵심 인사이트</p>
                <p className="text-xs text-gray-700 mb-1">{analysisData.retention_analysis.critical_insight}</p>
                <p className="text-xs font-bold text-blue-700">최적 길이: {analysisData.retention_analysis.optimal_length}</p>
              </div>
            </div>
          )}

          {/* 구독 트리거 */}
          {analysisData.subscription_trigger && (
            <div className="mt-6 bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="font-bold text-green-900 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" />
                구독 전환 트리거
              </p>
              <div className="space-y-2 mb-3">
                {analysisData.subscription_trigger.key_findings?.map((finding: string, i: number) => (
                  <p key={i} className="text-sm text-gray-700">• {finding}</p>
                ))}
              </div>
              {analysisData.subscription_trigger.subscription_formula && (
                <div className="bg-white rounded p-3 border border-green-300">
                  <p className="text-xs font-bold text-green-900 mb-1">✅ 구독 유도 공식</p>
                  <p className="text-sm text-gray-800">{analysisData.subscription_trigger.subscription_formula}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. 실행 가이드 (다음엔 어떻게) */}
      {analysisData.next_video_blueprint && (
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl shadow-2xl p-5 md:p-7">
          <div className="flex items-center gap-3 mb-5">
            <Lightbulb className="w-7 h-7 md:w-8 md:h-8" />
            <h3 className="text-2xl md:text-3xl font-black">3. 실행 가이드: 다음엔 어떻게?</h3>
          </div>

          {/* 소재 선정 */}
          {analysisData.next_video_blueprint.topic_selection && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
              <p className="font-bold text-yellow-300 mb-3 text-lg">📌 소재 선정</p>
              <div className="space-y-2 text-sm md:text-base">
                <p className="font-medium">✅ 1순위: {analysisData.next_video_blueprint.topic_selection.primary}</p>
                <p className="font-medium">✅ 2순위: {analysisData.next_video_blueprint.topic_selection.secondary}</p>
                <p className="font-medium">❌ 피하기: {analysisData.next_video_blueprint.topic_selection.avoid}</p>
              </div>
            </div>
          )}

          {/* 제목 공식 */}
          {analysisData.next_video_blueprint.title_formula && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
              <p className="font-bold text-yellow-300 mb-3 text-lg">✏️ 제목 전략</p>
              <div className="space-y-2 text-sm md:text-base">
                <p><span className="font-medium">구조:</span> {analysisData.next_video_blueprint.title_formula.structure}</p>
                <p><span className="font-medium">길이:</span> {analysisData.next_video_blueprint.title_formula.length}</p>
                {analysisData.next_video_blueprint.title_formula.must_keywords && (
                  <p><span className="font-medium">필수 키워드:</span> {analysisData.next_video_blueprint.title_formula.must_keywords.join(', ')}</p>
                )}
                <div className="bg-white/20 rounded p-3 mt-2">
                  <p className="text-xs opacity-80 mb-1">예시</p>
                  <p className="font-bold text-base md:text-lg">"{analysisData.next_video_blueprint.title_formula.example}"</p>
                </div>
              </div>
            </div>
          )}

          {/* 대본 구조 */}
          {analysisData.next_video_blueprint.script_structure && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
              <p className="font-bold text-yellow-300 mb-3 text-lg">📝 대본 구조</p>
              <div className="space-y-2 text-sm md:text-base">
                <p><span className="font-medium">오프닝:</span> {analysisData.next_video_blueprint.script_structure.opening}</p>
                <p><span className="font-medium">전개:</span> {analysisData.next_video_blueprint.script_structure.development}</p>
                <p><span className="font-medium">마무리:</span> {analysisData.next_video_blueprint.script_structure.ending}</p>
                <p className="font-bold text-yellow-300">⏱️ 최적 길이: {analysisData.next_video_blueprint.script_structure.optimal_length}</p>
              </div>
            </div>
          )}

          {/* 목표 지표 */}
          {analysisData.next_video_blueprint.target_metrics && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="font-bold text-yellow-300 mb-3 text-lg">🎯 목표 지표</p>
              <div className="grid grid-cols-3 gap-2 text-xs md:text-sm">
                <div className="bg-white/20 rounded p-2 text-center">
                  <p className="opacity-80 mb-1">진지한 시청</p>
                  <p className="font-bold">{analysisData.next_video_blueprint.target_metrics.engaged_rate}</p>
                </div>
                <div className="bg-white/20 rounded p-2 text-center">
                  <p className="opacity-80 mb-1">시청 완주</p>
                  <p className="font-bold">{analysisData.next_video_blueprint.target_metrics.retention}</p>
                </div>
                <div className="bg-white/20 rounded p-2 text-center">
                  <p className="opacity-80 mb-1">구독 전환</p>
                  <p className="font-bold">{analysisData.next_video_blueprint.target_metrics.sub_conversion}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. 체크리스트 */}
      {analysisData.checklist && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-gray-700" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-900">제작 전 필수 체크리스트</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysisData.checklist.topic && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">📌</span>
                  소재
                </p>
                <div className="space-y-2">
                  {analysisData.checklist.topic.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs md:text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisData.checklist.angle && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">🎯</span>
                  각도
                </p>
                <div className="space-y-2">
                  {analysisData.checklist.angle.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs md:text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisData.checklist.title && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">✏️</span>
                  제목
                </p>
                <div className="space-y-2">
                  {analysisData.checklist.title.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs md:text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisData.checklist.script && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">📝</span>
                  대본
                </p>
                <div className="space-y-2">
                  {analysisData.checklist.script.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs md:text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
