import './globals.css';

export const metadata = {
  metadataBase: new URL('https://pocket-resume.vercel.app'),
  title: '포켓레주메 — 박상욱(iron)의 개발 일대기',
  description:
    '방향키로 걸어 다니며 플레이하는 이력서. 네 회사를 지나며 기술을 잡고, 마지막에 남는 것은 스택의 수가 아니라 연결하는 힘입니다.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2E2A6B',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
