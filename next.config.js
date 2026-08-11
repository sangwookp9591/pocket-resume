/** @type {import('next').NextConfig} */
const nextConfig = {
  // 픽셀 에셋은 Next의 이미지 최적화를 타면 흐려집니다. 전부 <img>로 직접 씁니다.
  images: { unoptimized: true },
};

export default nextConfig;
