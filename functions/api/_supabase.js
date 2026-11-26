// Supabase 공개 설정 — public/data/site.js 의 supabase 와 같은 값이에요.
// 주소와 Publishable 키는 홈페이지 화면에도 그대로 실리는 공개 값이라 여기 적어 둬요.
// Secret 키(sb_secret…)는 절대 여기에 쓰지 말고 Cloudflare 환경 변수 SUPABASE_SERVICE_ROLE_KEY 에만 넣어요.
// Cloudflare 에 SUPABASE_URL · SUPABASE_ANON_KEY 를 따로 넣으면 그 값이 먼저 쓰여요.
const PUBLIC = {
  url: 'https://hkmnrnrchszqadhhscql.supabase.co',
  key: 'sb_publishable_3Rd-uxL-Z4mmS3Fp3Hou-Q_eUhd4lXc'
};

export const sbUrl = (env) => String((env && env.SUPABASE_URL) || PUBLIC.url).replace(/\/$/, '');
export const sbPublicKey = (env) => (env && env.SUPABASE_ANON_KEY) || PUBLIC.key;
