// app/types/analysis.ts
// 분석 관련 공용 타입 정의

// 비디오 요약 데이터 (상위/하위 30% 영상)
export interface VideoSummary {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  likeRate: number;
  publishedAt: string;
  thumbnail: string;
  duration: number;
  performanceScore: number;
}

// 외부 채널 분석 결과 구조
export interface ExternalChannelAnalysis {
  // 채널 특성 5축 요약
  channel_identity?: {
    topic_feature: string;
    title_strategy: string;
    structure_rhythm: string;
    hook_3sec: string;
    retention_elements: string;
  };

  // 핵심 차이점 요약
  summary_differences?: string[];

  // Step 1: 주제/각도 특성 분석
  topic_characteristics?: {
    successful_topics?: Array<{
      topic: string;
      avg_views?: number;
      why_works?: string;
    }>;
    unsuccessful_topics?: Array<{
      topic: string;
      avg_views?: number;
      why_fails?: string;
    }>;
    angle_analysis?: {
      effective_angles?: Array<{
        angle_type: string;
        success_rate?: number;
        characteristics: string;
      }>;
    };
  };

  // Step 2: 제목 전략 분석
  title_analysis?: {
    summary?: string;
    top_patterns?: {
      common_structures?: Array<string | { structure?: string; structure_type?: string }>;
    };
    bottom_patterns?: {
      common_problems?: Array<{ why_fails?: string; problem_type?: string }>;
    };
  };

  // Step 3: 스크립트 구조 분석
  script_analysis?: {
    hook_analysis?: {
      first_3_seconds?: {
        summary?: string;
      };
    };
    key_differences?: string[];
    script_structure?: {
      description: string;
    };
  };

  // 제작 가이드
  contentGuideline?: string;

  // 분석 메타데이터
  _meta?: {
    filterInfo: string;
    analyzedCount: number;
    excludedCount: number;
  };

  // 스키마 버전
  schemaVersion?: 'v1_external' | 'v1_own' | 'v0';

  // 에러
  error?: string;
}

// 내 채널 분석 결과 구조
export interface OwnChannelAnalysis {
  keyInsights?: string[];
  topCharacteristics?: string[];
  bottomCharacteristics?: string[];
  contentGuideline?: string;
  schemaVersion?: 'v1_external' | 'v1_own' | 'v0';
}

// 분석 결과 뷰 Props (외부 채널 전용)
export interface AnalysisViewProps {
  analysisResult: ExternalChannelAnalysis;  // ⭐ any 대신 명확한 타입
  topVideosSummary: VideoSummary[];
  bottomVideosSummary: VideoSummary[];
}
