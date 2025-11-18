'use client';

import { useEffect, useState } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  profileImage: string | null;
}

export default function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 로그인한 사용자 정보 가져오기
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('사용자 정보 로드 실패:', error);
        setUser(null);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    // 쿠키 삭제 API 호출 (나중에 만들 예정)
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt="프로필"
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <UserIcon className="w-5 h-5 text-gray-600" />
        )}
        <span className="text-sm font-medium text-gray-700">
          {user.name || user.email}
        </span>
      </div>

      <button
        onClick={handleLogout}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="로그아웃"
      >
        <LogOut className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}