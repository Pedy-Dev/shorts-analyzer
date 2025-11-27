/**
 * Supabase 서버용 클라이언트
 * API 라우트 및 서버 컴포넌트에서 사용
 */

import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL 또는 KEY가 설정되지 않았습니다');
  }

  return createClient(supabaseUrl, supabaseKey);
}
