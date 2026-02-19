import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
          <h1 className="text-8xl font-bold text-gray-200">404</h1>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              페이지를 찾을 수 없습니다
            </h2>
            <p className="mt-2 text-gray-500">
              요청하신 페이지가 존재하지 않거나 이동되었습니다.
            </p>
          </div>
          <Link
            href="/ko"
            className="mt-4 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </body>
    </html>
  );
}
