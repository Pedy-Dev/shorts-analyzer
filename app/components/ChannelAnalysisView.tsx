// app/components/ChannelAnalysisView.tsx
'use client';

import { ExternalLink } from 'lucide-react';
import { AnalysisViewProps } from '../types/analysis';

/**
 * 외부 채널 분석 결과 렌더링 전용 컴포넌트
 *
 * 사용처:
 * - 실시간 분석 화면 (ChannelAnalysisTab)
 * - 히스토리 상세 화면 (AnalysisHistoryTab > AnalysisDetails)
 *
 * ⚠️ 주의: 외부 채널 분석 전용 (isExternalChannel === true)
 *          내 채널 분석(isOwnChannel)에는 사용하지 마세요
 */
export default function ChannelAnalysisView({
  analysisResult,
  topVideosSummary,
  bottomVideosSummary,
}: AnalysisViewProps) {
  // 데이터 없거나 에러면 렌더링 안 함
  if (!analysisResult || analysisResult.error) {
    return null;
  }

  // summary_differences는 과거 버전(object) / 현재 버전(array) 둘 다 대비
  const summaryDiff: any = (analysisResult as any).summary_differences;
  const hasStructuredSummary =
    summaryDiff && !Array.isArray(summaryDiff) && (
      summaryDiff.topic_difference ||
      summaryDiff.title_difference ||
      summaryDiff.script_difference
    );

  const summaryDiffArray: string[] =
    Array.isArray(summaryDiff) && summaryDiff.length > 0 ? summaryDiff : [];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 1. 분석 기준 표시 (_meta) */}
      {analysisResult._meta && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 rounded">
          <p className="text-xs md:text-sm text-yellow-800">
            <strong>📊 분석 기준:</strong> {analysisResult._meta.filterInfo}
            {(analysisResult._meta.excludedCount ?? 0) > 0 && (
              <span className="ml-2">
                (최근 {analysisResult._meta.excludedCount}개 영상은 게시 후 3일 미만으로 제외됨)
              </span>
            )}
          </p>
        </div>
      )}

      {/* 2. 채널 특성 5축 요약 (channel_identity) */}
      {analysisResult.channel_identity && (
        <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl p-4 md:p-6 shadow-lg">
          <h3 className="text-xl md:text-2xl font-bold mb-4">🎯 채널 특성 요약</h3>
          <div className="grid grid-cols-1 gap-3">
            {/* 주제 특성 */}
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-gray-800">
              <h4 className="font-bold text-indigo-600 mb-1 flex items-center gap-2">
                <span>📍</span> 주제 특성
              </h4>
              <p className="text-sm">
                {analysisResult.channel_identity.topic_feature}
              </p>
            </div>

            {/* 제목 전략 */}
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-gray-800">
              <h4 className="font-bold text-indigo-600 mb-1 flex items-center gap-2">
                <span>✍️</span> 제목 전략
              </h4>
              <p className="text-sm">
                {analysisResult.channel_identity.title_strategy}
              </p>
            </div>

            {/* 영상 구조 & 문장 리듬 */}
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-gray-800">
              <h4 className="font-bold text-indigo-600 mb-1 flex items-center gap-2">
                <span>🎬</span> 영상 구조 & 문장 리듬
              </h4>
              <p className="text-sm">
                {analysisResult.channel_identity.structure_rhythm}
              </p>
            </div>

            {/* 초반 3초 후킹 */}
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-gray-800">
              <h4 className="font-bold text-indigo-600 mb-1 flex items-center gap-2">
                <span>⚡</span> 초반 3초 후킹
              </h4>
              <p className="text-sm">
                {analysisResult.channel_identity.hook_3sec}
              </p>
            </div>

            {/* 끝까지 보게 만드는 요소 */}
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-gray-800">
              <h4 className="font-bold text-indigo-600 mb-1 flex items-center gap-2">
                <span>🎯</span> 끝까지 보게 만드는 요소
              </h4>
              <p className="text-sm">
                {analysisResult.channel_identity.retention_elements}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. 상위 vs 하위 영상 핵심 차이 */}
      {summaryDiff && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 md:p-6 shadow-lg">
          <h3 className="text-xl md:text-2xl font-bold mb-4">⚡ 상위 vs 하위 영상 핵심 차이</h3>

          {hasStructuredSummary ? (
            <div className="space-y-3">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <h4 className="font-bold text-yellow-300 mb-1">1️⃣ 주제 특성</h4>
                <p className="text-sm text-white">
                  {summaryDiff.topic_difference}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <h4 className="font-bold text-yellow-300 mb-1">2️⃣ 제목 전략</h4>
                <p className="text-sm text-white">
                  {summaryDiff.title_difference}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <h4 className="font-bold text-yellow-300 mb-1">3️⃣ 대본 전략</h4>
                <p className="text-sm text-white">
                  {summaryDiff.script_difference}
                </p>
              </div>
            </div>
          ) : (
            summaryDiffArray.length > 0 && (
              <div className="space-y-2">
                {summaryDiffArray.map((diff, idx) => (
                  <div
                    key={idx}
                    className="bg-white/20 backdrop-blur rounded-lg p-3"
                  >
                    <p className="text-sm text-white">
                      <span className="font-bold text-yellow-300 mr-2">
                        {idx + 1}.
                      </span>
                      {diff}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* 4. 1️⃣ 주제 특성 섹션 */}
      {analysisResult.topic_characteristics && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
            1️⃣ 주제 특성
          </h3>

          {/* 주제 카테고리 분포 */}
          {analysisResult.topic_characteristics.main_categories &&
            analysisResult.topic_characteristics.main_categories.length > 0 && (
              <div className="mb-4 md:mb-6">
                <h4 className="font-bold text-gray-800 mb-3">주제 카테고리 분포</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysisResult.topic_characteristics.main_categories.map(
                    (cat: any, i: number) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg p-3 border border-indigo-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-indigo-900">
                            {cat.category}
                          </span>
                          {typeof cat.ratio === 'number' && (
                            <span className="text-xs md:text-sm bg-indigo-500 text-white px-2 py-1 rounded">
                              {(cat.ratio * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-xs text-gray-600 mb-1">
                            {cat.description}
                          </p>
                        )}
                        {typeof cat.avg_views === 'number' && (
                          <p className="text-xs text-indigo-700">
                            평균 조회수: {cat.avg_views.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* 성공한 주제들 */}
          {analysisResult.topic_characteristics.successful_topics &&
            analysisResult.topic_characteristics.successful_topics.length > 0 && (
              <div className="mb-4 md:mb-6">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-green-600">✅</span> 성과가 좋은 주제와 접근법
                </h4>
                <div className="space-y-3">
                  {analysisResult.topic_characteristics.successful_topics.map(
                    (topic: any, i: number) => (
                      <details
                        key={i}
                        className="bg-green-50 border border-green-200 rounded-lg p-3"
                        open={i === 0}
                      >
                        <summary className="cursor-pointer font-semibold text-green-900 flex items-center justify-between">
                          <span>
                            {topic.topic}
                            {topic.category ? ` (${topic.category})` : ''}
                          </span>
                          {typeof topic.avg_views === 'number' && (
                            <span className="text-xs md:text-sm bg-green-500 text-white px-2 py-1 rounded ml-2">
                              평균 조회수: {topic.avg_views.toLocaleString()}
                            </span>
                          )}
                        </summary>
                        <div className="mt-3 space-y-2">
                          <div className="bg-white rounded p-3">
                            {topic.successful_angle && (
                              <p className="text-xs md:text-sm text-gray-700 mb-2">
                                <span className="font-semibold">
                                  효과적 접근 각도:
                                </span>{' '}
                                {topic.successful_angle}
                              </p>
                            )}
                            {topic.why_works && (
                              <p className="text-xs md:text-sm text-gray-700 mb-2">
                                <span className="font-semibold">성공 이유:</span>{' '}
                                {topic.why_works}
                              </p>
                            )}
                            {topic.key_elements &&
                              topic.key_elements.length > 0 && (
                                <div className="mb-2">
                                  <span className="font-semibold text-xs md:text-sm text-gray-700">
                                    핵심 요소:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {topic.key_elements.map(
                                      (element: string, j: number) => (
                                        <span
                                          key={j}
                                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                                        >
                                          {element}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            {topic.examples && topic.examples.length > 0 && (
                              <div>
                                <span className="font-semibold text-xs md:text-sm text-gray-700">
                                  예시:
                                </span>
                                {topic.examples.map(
                                  (ex: string, j: number) => (
                                    <p
                                      key={j}
                                      className="text-xs text-gray-600 ml-2 mt-1"
                                    >
                                      • {ex}
                                    </p>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                    )
                  )}
                </div>
              </div>
            )}

          {/* 실패한 주제들 */}
          {analysisResult.topic_characteristics.unsuccessful_topics &&
            analysisResult.topic_characteristics.unsuccessful_topics.length > 0 && (
              <div className="mb-4 md:mb-6">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-red-600">⚠️</span> 피해야 할 주제와 접근법
                </h4>
                <div className="space-y-3">
                  {analysisResult.topic_characteristics.unsuccessful_topics.map(
                    (topic: any, i: number) => (
                      <details
                        key={i}
                        className="bg-red-50 border border-red-200 rounded-lg p-3"
                      >
                        <summary className="cursor-pointer font-semibold text-red-900 flex items-center justify-between">
                          <span>
                            {topic.topic}
                            {topic.category ? ` (${topic.category})` : ''}
                          </span>
                          {typeof topic.avg_views === 'number' && (
                            <span className="text-xs md:text-sm bg-red-500 text-white px-2 py-1 rounded ml-2">
                              평균 조회수: {topic.avg_views.toLocaleString()}
                            </span>
                          )}
                        </summary>
                        <div className="mt-3 bg-white rounded p-3">
                          {topic.problematic_angle && (
                            <p className="text-xs md:text-sm text-gray-700 mb-2">
                              <span className="font-semibold">
                                문제가 된 접근:
                              </span>{' '}
                              {topic.problematic_angle}
                            </p>
                          )}
                          {topic.why_fails && (
                            <p className="text-xs md:text-sm text-gray-700 mb-2">
                              <span className="font-semibold">실패 이유:</span>{' '}
                              {topic.why_fails}
                            </p>
                          )}
                          {topic.examples && topic.examples.length > 0 && (
                            <div>
                              <span className="font-semibold text-xs md:text-sm text-gray-700">
                                예시:
                              </span>
                              {topic.examples.map(
                                (ex: string, j: number) => (
                                  <p
                                    key={j}
                                    className="text-xs text-gray-600 ml-2 mt-1"
                                  >
                                    • {ex}
                                  </p>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    )
                  )}
                </div>
              </div>
            )}

          {/* 각도 분석 */}
          {analysisResult.topic_characteristics.angle_analysis && (
            <div className="mb-4 md:mb-6">
              <h4 className="font-bold text-gray-800 mb-3">
                접근 각도별 효과 분석
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 효과적인 각도 */}
                {analysisResult.topic_characteristics.angle_analysis
                  .effective_angles && (
                  <div>
                    <h5 className="text-xs md:text-sm font-semibold text-green-800 mb-2">
                      효과적인 각도 ✅
                    </h5>
                    {analysisResult.topic_characteristics.angle_analysis.effective_angles.map(
                      (angle: any, i: number) => (
                        <div
                          key={i}
                          className="bg-green-50 rounded-lg p-3 mb-2 border border-green-200"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-xs md:text-sm text-green-900">
                              {angle.angle_type}
                            </span>
                            {typeof angle.success_rate === 'number' && (
                              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                                성공률 {(angle.success_rate * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {angle.characteristics && (
                            <p className="text-xs text-gray-700 mb-1">
                              {angle.characteristics}
                            </p>
                          )}
                          {angle.best_for && (
                            <p className="text-xs text-green-700">
                              적합한 주제: {angle.best_for}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* 비효과적인 각도 */}
                {analysisResult.topic_characteristics.angle_analysis
                  .ineffective_angles && (
                  <div>
                    <h5 className="text-xs md:text-sm font-semibold text-red-800 mb-2">
                      피해야 할 각도 ❌
                    </h5>
                    {analysisResult.topic_characteristics.angle_analysis.ineffective_angles.map(
                      (angle: any, i: number) => (
                        <div
                          key={i}
                          className="bg-red-50 rounded-lg p-3 mb-2 border border-red-200"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-xs md:text-sm text-red-900">
                              {angle.angle_type}
                            </span>
                            {typeof angle.success_rate === 'number' && (
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                                성공률 {(angle.success_rate * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {angle.problem && (
                            <p className="text-xs text-gray-700">
                              {angle.problem}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. 2️⃣ 제목 전략 분석 섹션 */}
      {analysisResult.title_analysis && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
            2️⃣ 제목 전략
          </h3>

          {/* 핵심 요약 */}
          {analysisResult.title_analysis.summary && (
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <h4 className="font-bold text-blue-900 mb-2">💡 핵심 요약</h4>
              <p className="text-xs md:text-sm text-gray-800">
                {analysisResult.title_analysis.summary}
              </p>
            </div>
          )}

          {/* 상위 영상 제목 패턴 */}
          <div className="mb-4 md:mb-6">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-green-600">✅</span> 효과적인 제목 패턴
            </h4>

            {/* 제목 구조 */}
            {analysisResult.title_analysis.top_patterns
              ?.common_structures &&
              analysisResult.title_analysis.top_patterns.common_structures
                .length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {analysisResult.title_analysis.top_patterns.common_structures.map(
                    (struct: any, i: number) => (
                      <div
                        key={i}
                        className="bg-green-50 border border-green-200 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-green-900">
                            {struct.structure_type || struct.structure}
                          </span>
                          {typeof struct.frequency === 'number' && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              {struct.frequency}회 사용
                            </span>
                          )}
                        </div>
                        {struct.why_works && (
                          <p className="text-xs text-gray-700 mb-2">
                            {struct.why_works}
                          </p>
                        )}
                        {struct.examples && struct.examples.length > 0 && (
                          <div className="space-y-1">
                            {struct.examples.map(
                              (ex: string, j: number) => (
                                <p
                                  key={j}
                                  className="text-xs text-gray-600"
                                >
                                  • {ex}
                                </p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

            {/* 파워 키워드 */}
            {analysisResult.title_analysis.top_patterns?.power_keywords &&
              analysisResult.title_analysis.top_patterns.power_keywords
                .length > 0 && (
                <div className="bg-white rounded-lg p-3 md:p-4">
                  <h5 className="text-xs md:text-sm font-semibold text-gray-800 mb-3">
                    🔥 파워 키워드
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.title_analysis.top_patterns.power_keywords.map(
                      (kw: any, i: number) => (
                        <div key={i} className="group relative">
                          <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs md:text-sm font-medium">
                            {kw.keyword} {kw.frequency ? `(${kw.frequency})` : ''}
                          </span>
                          {(kw.context || kw.emotional_impact) && (
                            <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg -top-16 left-0">
                              {kw.context && (
                                <p className="mb-1">
                                  <strong>맥락:</strong> {kw.context}
                                </p>
                              )}
                              {kw.emotional_impact && (
                                <p>
                                  <strong>감정:</strong> {kw.emotional_impact}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* 상위 제목 특성 */}
            {analysisResult.title_analysis.top_patterns && (
              <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
                <div className="bg-green-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">평균 글자 수</p>
                  <p className="text-xl md:text-2xl font-bold text-green-700">
                    {analysisResult.title_analysis.top_patterns.avg_length ??
                      '-'}
                    {typeof analysisResult.title_analysis.top_patterns
                      .avg_length === 'number' && '자'}
                  </p>
                </div>
                <div className="bg-green-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">톤</p>
                  <p className="text-xl md:text-2xl font-bold text-green-700">
                    {analysisResult.title_analysis.top_patterns.tone || '-'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 하위 영상 제목 문제점 */}
          <div className="mb-4 md:mb-6">
            {analysisResult.title_analysis.bottom_patterns
              ?.common_problems &&
              analysisResult.title_analysis.bottom_patterns.common_problems
                .length > 0 && (
                <>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-red-600">❌</span> 피해야 할 제목 패턴
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.title_analysis.bottom_patterns.common_problems.map(
                      (prob: any, i: number) => (
                        <div
                          key={i}
                          className="bg-red-50 border border-red-200 rounded-lg p-3"
                        >
                          <p className="font-semibold text-red-900 mb-2">
                            {prob.problem_type}
                          </p>
                          {prob.why_fails && (
                            <p className="text-xs md:text-sm text-gray-700 mb-2">
                              {prob.why_fails}
                            </p>
                          )}
                          {prob.examples && prob.examples.length > 0 && (
                            <div className="space-y-1">
                              {prob.examples.map(
                                (ex: string, j: number) => (
                                  <p
                                    key={j}
                                    className="text-xs text-gray-600"
                                  >
                                    • {ex}
                                  </p>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}

            {/* 하위 제목 특성 */}
            {analysisResult.title_analysis.bottom_patterns && (
              <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
                <div className="bg-red-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">평균 글자 수</p>
                  <p className="text-xl md:text-2xl font-bold text-red-700">
                    {analysisResult.title_analysis.bottom_patterns
                      .avg_length ?? '-'}
                    {typeof analysisResult.title_analysis.bottom_patterns
                      .avg_length === 'number' && '자'}
                  </p>
                </div>
                <div className="bg-red-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">톤</p>
                  <p className="text-xl md:text-2xl font-bold text-red-700">
                    {analysisResult.title_analysis.bottom_patterns.tone || '-'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 제목 공식 */}
          {analysisResult.title_analysis.title_formulas &&
            analysisResult.title_analysis.title_formulas.length > 0 && (
              <div className="mb-4 md:mb-6">
                <h4 className="font-bold text-gray-800 mb-3">
                  🎯 검증된 제목 공식
                </h4>
                <div className="space-y-3">
                  {analysisResult.title_analysis.title_formulas.map(
                    (formula: any, i: number) => (
                      <div
                        key={i}
                        className="bg-white border border-blue-200 rounded-lg p-3 md:p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-blue-900 flex-1">
                            {formula.formula}
                          </p>
                          {typeof formula.success_rate === 'number' && (
                            <span className="text-xs md:text-sm bg-blue-500 text-white px-2 py-1 rounded ml-2">
                              성공률 {(formula.success_rate * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        {formula.best_for && (
                          <p className="text-xs text-gray-600 mb-2">
                            <strong>효과적인 주제:</strong> {formula.best_for}
                          </p>
                        )}
                        {formula.examples && formula.examples.length > 0 && (
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-xs text-gray-700 mb-1">
                              <strong>적용 예시:</strong>
                            </p>
                            {formula.examples.map(
                              (ex: string, j: number) => (
                                <p
                                  key={j}
                                  className="text-xs text-gray-600"
                                >
                                  • {ex}
                                </p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Do's and Don'ts */}
          {analysisResult.title_analysis.dos_and_donts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-green-50 rounded-lg p-3 md:p-4">
                <h5 className="font-bold text-green-900 mb-3">
                  ✅ 제목에 포함할 요소
                </h5>
                <div className="space-y-1">
                  {analysisResult.title_analysis.dos_and_donts
                    .effective_elements &&
                    analysisResult.title_analysis.dos_and_donts.effective_elements.map(
                      (el: string, i: number) => (
                        <p
                          key={i}
                          className="text-xs md:text-sm text-gray-700"
                        >
                          ✓ {el}
                        </p>
                      )
                    )}
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 md:p-4">
                <h5 className="font-bold text-red-900 mb-3">
                  ❌ 제목에서 피할 요소
                </h5>
                <div className="space-y-1">
                  {analysisResult.title_analysis.dos_and_donts
                    .avoid_elements &&
                    analysisResult.title_analysis.dos_and_donts.avoid_elements.map(
                      (el: string, i: number) => (
                        <p
                          key={i}
                          className="text-xs md:text-sm text-gray-700"
                        >
                          ✗ {el}
                        </p>
                      )
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. 3️⃣ 대본 전략 섹션 */}
      {analysisResult.script_analysis && (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="text-xl md:text-2xl font-bold text-black mb-4 md:mb-6 flex items-center gap-2">
            3️⃣ 대본 전략
          </h3>

          {/* 영상 구조와 리듬 */}
          <div className="mb-6">
            <h4 className="font-bold text-gray-800 mb-3">영상 구조와 리듬</h4>

            {/* 영상 구조 */}
            {analysisResult.script_analysis.script_structure && (
              <div className="mb-4">
                <div className="flex gap-1 h-10 md:h-12 rounded-lg overflow-hidden">
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                    style={{
                      width: `${
                        analysisResult.script_analysis.script_structure
                          .intro_pct || 0
                      }%`,
                    }}
                  >
                    도입{' '}
                    {analysisResult.script_analysis.script_structure
                      .intro_pct || 0}
                    %
                  </div>
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                    style={{
                      width: `${
                        analysisResult.script_analysis.script_structure
                          .body_pct || 0
                      }%`,
                    }}
                  >
                    전개{' '}
                    {analysisResult.script_analysis.script_structure.body_pct ||
                      0}
                    %
                  </div>
                  <div
                    className="bg-purple-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                    style={{
                      width: `${
                        analysisResult.script_analysis.script_structure
                          .climax_pct || 0
                      }%`,
                    }}
                  >
                    반전{' '}
                    {analysisResult.script_analysis.script_structure
                      .climax_pct || 0}
                    %
                  </div>
                  <div
                    className="bg-red-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                    style={{
                      width: `${
                        analysisResult.script_analysis.script_structure
                          .outro_pct || 0
                      }%`,
                    }}
                  >
                    결말{' '}
                    {analysisResult.script_analysis.script_structure
                      .outro_pct || 0}
                    %
                  </div>
                </div>
                {analysisResult.script_analysis.script_structure.description && (
                  <p className="mt-3 text-xs md:text-sm text-gray-600">
                    {
                      analysisResult.script_analysis.script_structure
                        .description
                    }
                  </p>
                )}
              </div>
            )}

            {/* 문장 리듬 */}
            {analysisResult.script_analysis.script_structure
              ?.sentence_rhythm && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 md:p-4 mb-4">
                <h5 className="font-bold text-gray-800 mb-3">문장 리듬 패턴</h5>
                <div className="flex gap-1 h-10 md:h-12 rounded-lg overflow-hidden mb-3">
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                    style={{
                      width: `${
                        (analysisResult.script_analysis.script_structure
                          .sentence_rhythm.short_ratio || 0) * 100
                      }%`,
                    }}
                  >
                    짧음{' '}
                    {(
                      (analysisResult.script_analysis.script_structure
                        .sentence_rhythm.short_ratio || 0) * 100
                    ).toFixed(0)}
                    %
                  </div>
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                    style={{
                      width: `${
                        (analysisResult.script_analysis.script_structure
                          .sentence_rhythm.medium_ratio || 0) * 100
                      }%`,
                    }}
                  >
                    중간{' '}
                    {(
                      (analysisResult.script_analysis.script_structure
                        .sentence_rhythm.medium_ratio || 0) * 100
                    ).toFixed(0)}
                    %
                  </div>
                  <div
                    className="bg-purple-500 flex items-center justify-center text-white text-xs md:text-sm font-bold"
                    style={{
                      width: `${
                        (analysisResult.script_analysis.script_structure
                          .sentence_rhythm.long_ratio || 0) * 100
                      }%`,
                    }}
                  >
                    긺{' '}
                    {(
                      (analysisResult.script_analysis.script_structure
                        .sentence_rhythm.long_ratio || 0) * 100
                    ).toFixed(0)}
                    %
                  </div>
                </div>
                <p className="text-xs md:text-sm text-gray-700">
                  <span className="font-semibold">패턴:</span>{' '}
                  {
                    analysisResult.script_analysis.script_structure
                      .sentence_rhythm.pattern_type || 'N/A'
                  }
                </p>
              </div>
            )}

            {/* 말투 스타일 */}
            {analysisResult.script_analysis.script_structure?.speech_pattern && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 md:p-4">
                  <h5 className="font-bold text-gray-800 mb-2">
                    종결어미 분포
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-700">
                        반말
                      </span>
                      <span className="font-semibold text-green-700">
                        {(
                          (analysisResult.script_analysis.script_structure
                            .speech_pattern.banmal_ratio || 0) * 100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-700">
                        존댓말
                      </span>
                      <span className="font-semibold text-blue-700">
                        {(
                          (analysisResult.script_analysis.script_structure
                            .speech_pattern.jondae_ratio || 0) * 100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-lg p-3 md:p-4">
                  <h5 className="font-bold text-gray-800 mb-2">특징</h5>
                  <p className="text-xs md:text-sm text-gray-700 mb-2">
                    <span className="font-semibold">시점:</span>{' '}
                    {analysisResult.script_analysis.script_structure
                      .speech_pattern.viewpoint || 'N/A'}
                  </p>
                  <p className="text-xs md:text-sm text-gray-700">
                    <span className="font-semibold">톤:</span>{' '}
                    {analysisResult.script_analysis.script_structure
                      .speech_pattern.tone_description || 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 초반 3초 후킹 전략 */}
          {analysisResult.script_analysis.hook_analysis && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-3">
                🎯 초반 3초 후킹 전략
              </h4>
              {analysisResult.script_analysis.hook_analysis.first_3_seconds
                ?.top_patterns &&
                analysisResult.script_analysis.hook_analysis.first_3_seconds
                  .top_patterns.length > 0 &&
                analysisResult.script_analysis.hook_analysis.first_3_seconds.top_patterns.map(
                  (pattern: any, i: number) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-3 mb-3"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-orange-900">
                          {pattern.type}
                        </span>
                      </div>
                      {pattern.effectiveness && (
                        <p className="text-xs md:text-sm text-gray-700 mb-2">
                          {pattern.effectiveness}
                        </p>
                      )}
                      {pattern.examples && pattern.examples.length > 0 && (
                        <div className="bg-orange-50 rounded p-2">
                          {pattern.examples.map(
                            (ex: string, j: number) => (
                              <p
                                key={j}
                                className="text-xs text-gray-600"
                              >
                                • {ex}
                              </p>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}

              {analysisResult.script_analysis.hook_analysis.first_3_seconds
                ?.power_words &&
                analysisResult.script_analysis.hook_analysis.first_3_seconds
                  .power_words.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs md:text-sm font-semibold text-gray-700 mb-2">
                      파워 단어:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.script_analysis.hook_analysis.first_3_seconds.power_words.map(
                        (word: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs"
                          >
                            {word}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* 영상을 끝까지 보게 만드는 요소 */}
          {analysisResult.script_analysis.retention_elements && (
            <div className="mb-6">
              <h4 className="font-bold text-gray-800 mb-3">
                🔥 영상을 끝까지 보게 만드는 요소
              </h4>

              {/* 결론 배치 전략 */}
              {analysisResult.script_analysis.retention_elements
                .conclusion_placement && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 md:p-4 mb-3">
                  <h5 className="font-semibold text-indigo-900 mb-2">
                    결론/반전 배치
                  </h5>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-600">상위 영상</p>
                      {typeof analysisResult.script_analysis
                        .retention_elements.conclusion_placement
                        .top_videos_avg_position === 'number' && (
                        <p className="text-lg md:text-xl font-bold text-indigo-700">
                          {(
                            analysisResult.script_analysis.retention_elements
                              .conclusion_placement.top_videos_avg_position * 100
                          ).toFixed(0)}
                          % 지점
                        </p>
                      )}
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-600">하위 영상</p>
                      {typeof analysisResult.script_analysis
                        .retention_elements.conclusion_placement
                        .bottom_videos_avg_position === 'number' && (
                        <p className="text-lg md:text-xl font-bold text-gray-500">
                          {(
                            analysisResult.script_analysis.retention_elements
                              .conclusion_placement.bottom_videos_avg_position *
                            100
                          ).toFixed(0)}
                          % 지점
                        </p>
                      )}
                    </div>
                  </div>
                  {analysisResult.script_analysis.retention_elements
                    .conclusion_placement.description && (
                    <p className="text-xs md:text-sm text-gray-700 mb-3">
                      {
                        analysisResult.script_analysis.retention_elements
                          .conclusion_placement.description
                      }
                    </p>
                  )}

                  {/* 결론/반전 예시들 */}
                  {analysisResult.script_analysis.retention_elements
                    .conclusion_placement.example_phrases &&
                    analysisResult.script_analysis.retention_elements
                      .conclusion_placement.example_phrases.length > 0 && (
                      <div className="bg-white rounded p-3 border border-indigo-200">
                        <p className="text-xs font-semibold text-indigo-900 mb-2">
                          실제 사용 예시:
                        </p>
                        {analysisResult.script_analysis.retention_elements.conclusion_placement.example_phrases.map(
                          (ex: any, i: number) => (
                            <div
                              key={i}
                              className="mb-2 pb-2 border-b last:border-b-0"
                            >
                              <p className="text-xs text-gray-600 mb-1">
                                📍 {ex.video_title} ({ex.placement})
                              </p>
                              <p className="text-xs text-gray-800 italic">
                                "{ex.phrase}"
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* 종합 전략 설명 */}
              {analysisResult.script_analysis.retention_elements
                .comprehensive_retention_strategy && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 md:p-4">
                  <h5 className="font-semibold text-purple-900 mb-2">
                    종합 시청 유지 전략
                  </h5>
                  <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                    {
                      analysisResult.script_analysis.retention_elements
                        .comprehensive_retention_strategy
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 스크립트 핵심 차이 (간단 리스트) */}
          {analysisResult.script_analysis.key_differences &&
            analysisResult.script_analysis.key_differences.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-base mb-3 text-blue-700">
                  🔑 상위 vs 하위 스크립트 차이
                </h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <ul className="space-y-1">
                    {analysisResult.script_analysis.key_differences.map(
                      (diff: string, idx: number) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-700"
                        >
                          {idx + 1}. {diff}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}
        </div>
      )}

      {/* 7. 분석 대상 영상 (상위/하위 30%) */}
      {(topVideosSummary.length > 0 || bottomVideosSummary.length > 0) && (
        <div className="border-t-2 border-gray-200 pt-6">
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
            📊 분석 대상 영상
          </h3>

          {/* 상위 30% 영상 */}
          {topVideosSummary.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-3 text-gray-900">
                🏆 상위 30% 영상 ({topVideosSummary.length}개)
              </h4>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                {topVideosSummary.map((video: any, idx: number) => (
                  <div
                    key={video.videoId}
                    className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 hover:shadow-sm transition-shadow"
                  >
                    <span className="text-green-600 font-semibold text-sm">
                      #{idx + 1}
                    </span>
                    <div className="flex-1">
                      <a
                        href={`https://youtube.com/shorts/${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium"
                      >
                        {video.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-xs text-gray-600 mt-1">
                        조회수 {video.views?.toLocaleString() || 0} • 좋아요율{' '}
                        {typeof video.likeRate === 'number'
                          ? video.likeRate.toFixed(1)
                          : '0'}
                        % • 퍼포먼스 스코어{' '}
                        {typeof video.performanceScore === 'number'
                          ? video.performanceScore.toFixed(2)
                          : '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 하위 30% 영상 */}
          {bottomVideosSummary.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg mb-3 text-gray-900">
                📉 하위 30% 영상 ({bottomVideosSummary.length}개)
              </h4>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                {bottomVideosSummary.map((video: any, idx: number) => (
                  <div
                    key={video.videoId}
                    className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 hover:shadow-sm transition-shadow"
                  >
                    <span className="text-red-600 font-semibold text-sm">
                      #{idx + 1}
                    </span>
                    <div className="flex-1">
                      <a
                        href={`https://youtube.com/shorts/${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium"
                      >
                        {video.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-xs text-gray-600 mt-1">
                        조회수 {video.views?.toLocaleString() || 0} • 좋아요율{' '}
                        {typeof video.likeRate === 'number'
                          ? video.likeRate.toFixed(1)
                          : '0'}
                        % • 퍼포먼스 스코어{' '}
                        {typeof video.performanceScore === 'number'
                          ? video.performanceScore.toFixed(2)
                          : '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
