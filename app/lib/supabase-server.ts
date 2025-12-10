/**
 * Supabase 서버용 클라이언트
 * API 라우트 및 서버 컴포넌트에서 사용
 *
 * ⚠️ service_role 키를 사용하므로 RLS를 우회합니다.
 * 반드시 서버 사이드에서만 사용하세요!
 */

import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // service_role 키 사용 (RLS 우회, 서버 전용)
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL 또는 KEY가 설정되지 않았습니다');
  }

  return createClient(supabaseUrl, supabaseKey);
}
