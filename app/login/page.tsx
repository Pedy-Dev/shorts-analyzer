import GoogleLoginButton from '@/app/components/GoogleLoginButton';

interface LoginPageProps {
  searchParams: Promise<{ returnUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnUrl } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            유튜브 쇼츠 해커
          </h1>
          <p className="text-gray-600">
            구글 계정으로 로그인하고<br />
            채널 분석을 시작하세요
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <GoogleLoginButton returnUrl={returnUrl} />
          
          <p className="text-xs text-gray-500 text-center mt-4">
            로그인하면 서비스 이용약관 및<br />
            개인정보 처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}