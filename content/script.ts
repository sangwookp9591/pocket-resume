/* 대사와 이벤트. 게임의 서사가 전부 여기 있습니다.
   문장은 content/journey.js와 content/wiki.js에서 나왔습니다 — 새 사실을 만들지 않습니다.

   명령 한 줄이 곧 한 동작입니다:
     { t: '대사' }                      기본 화자(내레이션)
     { who: '아잉 박사', t: '대사' }     화자 있는 대사
     { face: 'happy' }                  아잉 표정 교체 (마스코트 킷의 16종)
     { input: 'name' }                  이름 입력
     { choose: [{ label, then }] }      선택지. then은 명령 배열
     { give: 'spring' }                 도감 등록
     { badge: 'confidence' }            배지 획득
     { battle: {...} }                  배틀 진입
     { set: 'flag' }                    플래그 세우기
     { unless: 'f', t: '...' }          f가 없으면 이 말을 하고 나머지를 버림
     { require: 'a b c' }               셋 다 없으면 조용히 나머지를 버림
     { block: true }                    이동을 막음
     { warp: { to, x, y } }             맵 이동
     { scene: 'hall' }                  씬 전환
     { fx: 'shake'|'flash'|'fade' }     연출
     { wait: 600 }                      밀리초 대기
*/

import type { Choice, Cmd, MonId } from './types.ts';
import { JOURNEY, FINALE } from './journey.ts';
import { STARTERS, byId } from './mons.ts';

// fromEntries는 값 타입을 Record<string, any>로 흘립니다. 키는 Chapter.id라 string 그대로 두고
// 값만 되돌립니다 — 없는 id를 찾으면 undefined이고, 그건 test/content.test.ts가 잡습니다.
const J = Object.fromEntries(JOURNEY.map((j) => [j.id, j])) as Record<string, (typeof JOURNEY)[number]>;

/** 기술을 잡았을 때 공통으로 나오는 마무리. 도감 설명을 그대로 보여 줍니다. */
const caught = (id: MonId, extra: Cmd[] = []): Cmd[] => [
  { fx: 'flash' },
  { t: `${byId[id].name}(을)를 잡았다!` },
  { face: 'cheer', who: '아잉', t: `${byId[id].en} — 도감에 올려 둘게.` },
  { dex: id },
  ...extra,
];

export const SCRIPTS: Record<string, Cmd[]> = {
  // ══ 연구소 ══════════════════════════════════════════════════════
  'lab.open': [
    { fx: 'fade' },
    { face: 'neutral', who: '아잉 박사', t: '…음, 깼구나.' },
    { who: '아잉 박사', t: '여긴 개발자의 세계야. 여기선 사람들이 기술을 하나씩 데리고 다녀.' },
    { face: 'thinking', who: '아잉 박사', t: '기술이 많을수록 강한 걸까? 다들 그렇게 믿고 시작하지.' },
    { who: '아잉 박사', t: '너도 곧 그렇게 믿게 될 거야. 그리고 언젠가 그게 틀렸다는 걸 알게 될 거고.' },
    { face: 'wink', who: '아잉 박사', t: '먼저, 네 이름을 알려줄래?' },
    { input: 'name' },
    { face: 'happy', who: '아잉 박사', t: '{name}. 좋은 이름이네.' },
    { who: '아잉 박사', t: '책상 위에 볼이 세 개 있어. 첫 언어를 골라 봐.' },
    { set: 'canChoose' },
  ],

  'lab.balls': [
    { unless: 'canChoose', t: '아직 박사가 이야기 중이다.' },
    { t: '세 개의 기술볼이 놓여 있다.' },
    {
      choose: STARTERS.map((s): Choice => ({
        label: s.name,
        desc: s.line,
        then: [
          { who: '아잉 박사', t: `${s.name}(이)라. ${s.line}` },
          { set: 'starterChosen' },
          { set: `starter.${s.id}` },
          { give: s.mon },
          ...caught(s.mon),
          { face: 'proud', who: '아잉 박사', t: '그리고 하나 더.' },
          { fx: 'flash' },
          { who: '아잉 박사', t: '나는 아잉. 같이 다닐게.' },
          { face: 'wave', who: '아잉', t: '네가 무엇을 잡는지 전부 기록해 둘 거야. 나중에 그게 이력서가 되거든.' },
          { set: 'aingJoined' },
          { who: '아잉 박사', t: '남쪽으로 내려가면 뉴비마을이야. 첫 직장이 거기 있어.' },
        ],
      })),
    },
  ],

  'lab.blockExit': [
    { require: '!starterChosen' },
    { face: 'pout', who: '아잉 박사', t: '어이, 맨몸으로 나가려고?' },
    { who: '아잉 박사', t: '책상 위 볼부터 골라.' },
    { block: true },
  ],

  'lab.prof': [
    { face: 'thinking', who: '아잉 박사', t: '기술은 도구야. 도구를 몇 개 가졌는지로 사람을 재는 곳이 많지만.' },
    { who: '아잉 박사', t: '나는 도구로 무엇을 끝냈는지를 봐.' },
  ],

  // ══ 1. 뉴비마을 — 첫 회사 ═══════════════════════════════════════
  'newbie.arrive': [
    { banner: J.newbie.banner },
    { face: 'neutral', who: '아잉', t: '첫 직장이야. 뭘 시킬까?' },
  ],

  'newbie.senior': [
    { who: '사수', t: '어, 신입? 반가워.' },
    { who: '사수', t: '자네는 Spring만 하면 돼. 그것만 잘해도 밥은 먹고 살아.' },
    { face: 'confused', who: '아잉', t: '…그것만?' },
    { who: '사수', t: '화면은 다른 팀이 해. 배포도 다른 팀이 하고. 자네 일만 하면 돼.' },
    { t: '{name}은(는) Spring을 받았다.' },
    { give: 'spring' },
    ...caught('spring'),
    { who: '사수', t: '아, 그리고 야근 좀 부탁해. 사무실은 저기 위쪽 건물이야.' },
    { face: 'pout', who: '아잉', t: '시킨 것만 하면 시킨 만큼만 남아. …가 볼래?' },
    { set: 'canWork' },
  ],

  'newbie.villager': [
    { who: '마을 사람', t: '여긴 다들 하나씩만 들고 다녀. 그게 편하거든.' },
    { who: '마을 사람', t: '근데 하나만 들고 있으면, 그 하나가 안 통하는 문제를 만났을 때 할 게 없더라고.' },
  ],

  'newbie.sign': [
    { t: '『뉴비마을 — 시킨 일을 잘하면 칭찬받는 곳』' },
    { face: 'thinking', who: '아잉', t: '칭찬은 좋은데… 칭찬만 받다 끝나는 곳이기도 해.' },
  ],

  'newbie.gate': [
    { require: '!badge.confidence' }, // 맵 이벤트의 unless와 같은 조건. 두 번 적는 게 아니라 이중 잠금입니다
    { face: 'neutral', who: '아잉', t: '아직 여기서 배울 게 남았어.' },
    { who: '아잉', t: '사무실에서 야근부터 끝내자.' },
    { block: true },
  ],

  // ══ 2. 야근 사무실 ══════════════════════════════════════════════
  'office.arrive': [
    { banner: '야근 사무실 — 22:40' },
    { t: '아무도 없다. 형광등 하나만 켜져 있다.' },
    { face: 'focused', who: '아잉', t: '시킨 사람이 없는 시간이네. 지금 배우는 건 전부 네 거야.' },
    { t: '책상 세 개에 각각 다른 것이 열려 있다.' },
  ],

  'office.learn.springboot': [
    { t: '설정 파일이 열려 있다. Spring을 혼자 띄워 보려던 흔적이다.' },
    { face: 'focused', who: '아잉', t: '누가 시킨 게 아니야. 이건 네가 열어 본 거지.' },
    { battle: { mon: 'springboot', level: 8, bg: 2, intro: '야생의 부트몬이 나타났다!' } },
  ],

  'office.learn.jpa': [
    { t: '엔티티 클래스가 열려 있다. 쿼리가 스무 번 나가고 있다.' },
    { face: 'surprised', who: '아잉', t: '한 번 부르는 줄 알았는데 스무 번 나가네. …이게 N+1이야.' },
    { battle: { mon: 'jpa', level: 8, bg: 2, intro: '야생의 제이피에이가 나타났다!' } },
  ],

  'office.learn.react': [
    { t: 'API는 다 만들었는데 화면이 없다. 아무도 이 기능을 쓸 수 없다.' },
    { face: 'thinking', who: '아잉', t: '화면이 없으면 아무도 안 써. 만든 게 아닌 거야.' },
    { who: '아잉', t: '…경계를 넘어 볼래? 여긴 네 담당이 아니야.' },
    { battle: { mon: 'react', level: 9, bg: 2, intro: '야생의 리액트가 나타났다!' } },
  ],

  'office.window': [
    { t: '창밖으로 다른 사무실의 불빛이 보인다. 몇 개는 아직 켜져 있다.' },
    { face: 'neutral', who: '아잉', t: '다들 어딘가에서 각자 배우고 있어.' },
  ],

  'office.leave': [
    { require: 'has.springboot has.jpa has.react' },
    { fx: 'fade' },
    { t: '세 가지를 혼자 붙여 봤다. 누가 시켜서가 아니었다.' },
    { face: 'proud', who: '아잉', t: '{name}, 이거 봐. 시킨 건 하나였는데 넷이 됐어.' },
    { t: `${J.newbie.lesson}` },
    { badge: 'confidence' },
    { face: 'cheer', who: '아잉', t: '자신감 배지를 얻었다!' },
    { who: '아잉', t: '…근데 이 자신감, 근거가 좀 없긴 해.' },
    { face: 'wink', who: '아잉', t: '뭐 어때. 그걸로 이직하는 사람 많아. 남쪽 항구로 가 볼까?' },
    { set: 'badge.confidence' },
  ],

  // ══ 3. 파도항구 — 두 번째 회사 ══════════════════════════════════
  'harbor.arrive': [
    { banner: J.harbor.banner },
    { face: 'happy', who: '아잉', t: '넓다! 여긴 웹도 앱도 인프라도 다 있대.' },
    { t: '자신감을 들고 왔다. 아직은 줄어들지 않았다.' },
  ],

  'harbor.sign': [
    { t: '『파도항구 — 여기서는 스스로를 재게 된다』' },
  ],

  'harbor.ace': [
    { require: 'has.reactnative has.aws' },
    { who: '실력자', t: '왔구나. 뭐 좀 배웠어?' },
    { face: 'proud', who: '아잉', t: 'React Native랑 AWS를 잡았어!' },
    { who: '실력자', t: '좋네. 그럼 한 판 할까.' },
    { t: '실력자가 승부를 걸어 왔다!' },
    { battle: { mon: 'opensearch', level: 40, bg: 3, trainer: 'ace', scripted: 'lose', intro: '실력자가 승부를 걸어 왔다!' } },
    { fx: 'fade' },
    { t: '…졌다. 한 수도 아니고, 두 수 앞을 보고 있었다.' },
    { face: 'sad', who: '아잉', t: '…' },
    { who: '실력자', t: '기술을 몇 개 아는지 물었으면 네가 이겼을 거야.' },
    { who: '실력자', t: '나는 그걸 언제 안 쓸지를 골랐고.' },
    { t: `${J.harbor.lesson}` },
    { face: 'thinking', who: '아잉', t: '{name}. 진 게 창피해?' },
    {
      choose: [
        { label: '창피하다', then: [{ who: '아잉', t: '창피한 게 맞아. 창피해야 다음이 있어.' }] },
        { label: '아니, 알겠다', then: [{ who: '아잉', t: '빠르네. 그럼 다음으로 가자.' }] },
      ],
    },
    { badge: 'humility' },
    { face: 'relief', who: '아잉', t: '겸손 배지를 얻었다! …이건 이겨서 받는 게 아니야.' },
    { set: 'badge.humility' },
    { who: '실력자', t: '남쪽 마을에 재미있는 애들이 있어. 가 봐.' },
  ],

  'harbor.nurse': [
    { who: '카페 점원', t: '어서 오세요. 잠깐 쉬었다 가실래요?' },
    { fx: 'flash' },
    { t: '기술들이 모두 회복됐다.' },
    { heal: true },
  ],

  // ══ 4. 공유마을 — 세 번째 회사 ══════════════════════════════════
  'share.arrive': [
    { banner: J.share.banner },
    { t: '모닥불 주위에 사람들이 모여 있다. 다들 뭔가를 읽고 있다.' },
  ],

  'share.junior1': [
    { who: '신입 동료', t: '어, 이거 보셨어요? 어제 나온 건데.' },
    { face: 'confused', who: '아잉', t: '…어제 나온 걸 벌써 읽었어?' },
    { who: '신입 동료', t: '아직 다 이해는 못 했어요. 근데 일단 던져 놔야 누가 같이 봐 주잖아요.' },
    { face: 'surprised', who: '아잉', t: '이해한 다음에 공유하는 게 아니라, 이해하려고 공유하는구나.' },
  ],

  'share.junior2': [
    { who: '신입 동료', t: '저는 실패한 것도 올려요. 그게 제일 반응이 좋더라고요.' },
    { who: '신입 동료', t: '남이 같은 데서 안 넘어지면 그걸로 된 거니까.' },
  ],

  'share.campfire': [
    { t: '모닥불이 타고 있다. 여기 앉으면 누구든 아는 것을 하나씩 꺼내 놓는다.' },
    { face: 'thinking', who: '아잉', t: '{name}, 너 지금까지 배운 거 여기서 말해 볼래?' },
    {
      choose: [
        {
          label: '꺼내 놓는다',
          then: [
            { t: '{name}은(는) 혼자 배운 것들을 꺼내 놓았다.' },
            { who: '신입 동료', t: '어? 그거 저 지금 막혀 있던 건데요.' },
            { face: 'wow', who: '아잉', t: '…네 것이었던 게 방금 팀 것이 됐어.' },
            { battle: { mon: 'insight', level: 20, bg: 1, intro: '인사이트가 나타났다!' } },
          ],
        },
        {
          label: '아직 자신 없다',
          then: [
            { who: '신입 동료', t: '괜찮아요. 저도 매번 자신 없어요.' },
            { who: '신입 동료', t: '자신 있어질 때까지 기다리면 영영 안 꺼내게 되더라고요.' },
            { face: 'shy', who: '아잉', t: '…맞는 말이네. 한 번 해 볼까?' },
            { battle: { mon: 'insight', level: 20, bg: 1, intro: '인사이트가 나타났다!' } },
          ],
        },
      ],
    },
  ],

  'share.lead': [
    { require: 'has.insight' },
    { who: '팀 리드', t: '재밌죠, 저 친구들.' },
    { who: '팀 리드', t: '저는 저 습관 하나가 시니어랑 주니어를 가른다고 봐요. 연차 말고.' },
    { t: `${J.share.lesson}` },
    { badge: 'insight' },
    { face: 'cheer', who: '아잉', t: '공유 배지를 얻었다!' },
    { set: 'badge.insight' },
    { who: '팀 리드', t: '북쪽 시티로 가 보세요. 거기서 이 습관이 도구가 되는 걸 볼 거예요.' },
  ],

  'share.gate': [
    { require: '!badge.insight' },
    { face: 'neutral', who: '아잉', t: '모닥불 쪽 이야기가 아직 안 끝났어.' },
    { block: true },
  ],

  // ══ 5. ZIVO 시티 ════════════════════════════════════════════════
  'city.arrive': [
    { banner: J.zivo.banner },
    { face: 'focused', who: '아잉', t: '의료관광 플랫폼 ZIVO. 저장소가 셋이야 — FRONT, ADMIN, BACK.' },
    { who: '아잉', t: '타워 안에 세 구역이 다 있어. 지금까지 배운 걸 전부 써야 할 거야.' },
  ],

  'city.mailbox': [
    { t: '우편함이 있다. Outbox라고 적혀 있다.' },
    { face: 'wink', who: '아잉', t: '나가는 걸 하나씩 확인하고 보내는 상자야. 나중에 만날 거야.' },
  ],

  'city.nurse': [
    { who: '카페 점원', t: '야근하시는 분들 많이 오세요. 회복해 드릴게요.' },
    { fx: 'flash' },
    { t: '기술들이 모두 회복됐다.' },
    { heal: true },
  ],

  'city.gate': [
    { require: '!badge.connect' },
    { face: 'neutral', who: '아잉', t: '타워부터. 아직 연결 배지가 없어.' },
    { block: true },
  ],

  // ══ 6. ZIVO 타워 ════════════════════════════════════════════════
  'tower.arrive': [
    { banner: 'ZIVO 타워 — 세 저장소' },
    { t: '왼쪽은 FRONT, 가운데는 ADMIN, 오른쪽은 BACK이다.' },
    { face: 'focused', who: '아잉', t: '여기선 문제가 먼저 나와. 기술은 그 다음에 고르는 거야.' },
  ],

  // ── FRONT 구역
  'tower.front.nextjs': [
    { t: '해외 환자와 여행객이 대상이다. 앱 설치 장벽 없이 검색으로 도달해야 한다.' },
    { t: '매장에서 QR을 찍고 결제까지 웹에서 끊기지 않아야 한다.' },
    { face: 'thinking', who: '아잉', t: '앱 우선이 아니라 웹 선행. 그리고 i18n은 쿠키가 아니라 URL 세그먼트야 — SEO 인덱싱 때문에.' },
    { battle: { mon: 'nextjs', level: 45, bg: 5, intro: '넥스트가 나타났다!' } },
  ],
  'tower.front.vanilla': [
    { t: 'StyleX를 검토했지만 Next.js/Turbopack 호환성이 걸린다.' },
    { face: 'neutral', who: '아잉', t: '검토했다가 안 쓴 것도 기록에 남겨. 왜 안 골랐는지가 근거니까.' },
    { battle: { mon: 'vanilla', level: 42, bg: 5, intro: '바닐라가 나타났다!' } },
  ],
  'tower.front.playwright': [
    { t: '결제는 외부 결제사와 WebSocket에 의존한다. 수동 QA로는 회귀를 놓친다.' },
    { face: 'focused', who: '아잉', t: '실서버 E2E는 느리고 불안정해서 CI에 못 넣어. 의존성 0의 mock을 직접 만들자.' },
    { who: '아잉', t: '그리고 플레이크는 sleep으로 덮지 마. burn-in 10회로 정량 검출하는 거야.' },
    { battle: { mon: 'playwright', level: 46, bg: 5, intro: '플레이몬이 나타났다!' } },
  ],

  // ── ADMIN 구역
  'tower.admin.fsd': [
    { t: '기여자 15명이 드나든다. 공통 기반이 흔들리면 전체가 무너진다.' },
    { face: 'thinking', who: '아잉', t: '규칙 문서가 세 군데로 복제되며 어긋나고 있어. 단일 소스로 모으고, 계층은 단방향으로 강제하자.' },
    { battle: { mon: 'fsd', level: 47, bg: 5, intro: '에프에스디가 나타났다!' } },
  ],
  'tower.admin.rbac': [
    { t: '관리자·스태프·파트너로 사용자가 늘었다. 권한 체크가 페이지마다 흩어져 있다.' },
    { face: 'surprised', who: '아잉', t: '누락이 곧 데이터 유출이야. 버튼만 숨기는 건 권한이 아니고.' },
    { who: '아잉', t: '전면 전환은 위험해. 파트너는 그대로 두고 관리자만 세분 모델로 — 하이브리드.' },
    { battle: { mon: 'rbac', level: 48, bg: 5, intro: '알백에이씨가 나타났다!' } },
  ],
  'tower.admin.archunit': [
    { t: '리뷰에서 같은 지적이 반복된다. 사람의 기억력에 기대는 규칙이기 때문이다.' },
    { face: 'proud', who: '아잉', t: '규칙을 읽으라고 부탁하지 말고, 도구가 들고 다니게 해.' },
    { battle: { mon: 'archunit', level: 45, bg: 5, intro: '아크유닛이 나타났다!' } },
  ],

  // ── BACK 구역
  'tower.back.opensearch': [
    { t: '숙소 재고와 요금이 외부에서 수시로 갱신된다. 변경마다 개별 재색인을 부르고 있다.' },
    { face: 'focused', who: '아잉', t: '다국어 텍스트에 다중 필터 조합이야. DB LIKE도 pgvector도 아니고 형태소·필터 기반이 맞아.' },
    { who: '아잉', t: 'Bulk로 묶어서 RTT를 chunk당 1회로. hot path 연산은 미리 계산해서 요청 경로에서 빼고.' },
    { battle: { mon: 'opensearch', level: 50, bg: 5, intro: '오픈서치가 나타났다!' } },
  ],
  'tower.back.resilience': [
    { t: '호텔 콘텐츠 생성과 14개 언어 번역이 LLM에 의존한다. 단일 프로바이더에 묶여 있다.' },
    { face: 'thinking', who: '아잉', t: '장애 때 파이프라인 전체가 멈춰. 재시도만으로는 연쇄 지연을 못 막고.' },
    { who: '아잉', t: '실패 비용이 큰 곳일수록 실패 경로를 먼저 설계하는 거야.' },
    { battle: { mon: 'resilience', level: 52, bg: 5, intro: '리질리언스가 나타났다!' } },
  ],
  'tower.back.outbox': [
    { t: '쿠폰이다. 발급·사용·취소가 전부 돈과 직결된다.' },
    { face: 'focused', who: '아잉', t: '레거시 계층 위에 얹으면 규칙이 서비스 코드에 흩어져. 새 바운디드 컨텍스트로 가자.' },
    { who: '아잉', t: '동기 호출로 발급하면 유실되거나 중복돼. 분산락 + Outbox 워커로 구조에서 막는 거야.' },
    { battle: { mon: 'outbox', level: 54, bg: 5, intro: '아웃박스가 나타났다!' } },
  ],

  'tower.lead': [
    {
      require:
        'has.nextjs has.vanilla has.playwright has.fsd has.rbac has.archunit has.opensearch has.resilience has.outbox',
    },
    { who: '팀원', t: '세 구역 다 도셨네요.' },
    { who: '팀원', t: '근데 신기한 게, 이거 다 따로 배운 게 아니잖아요.' },
    { t: '혼자 배우는 법은 첫 회사에서, 나보다 잘하는 사람이 있다는 전제는 두 번째에서,' },
    { t: '아는 것을 도구로 만들어 넘기는 법은 세 번째에서 왔다.' },
    { face: 'wow', who: '아잉', t: 'ArchUnit도 codemod도 에이전트 스킬 CLI도 — 전부 세 번째 회사에서 배운 걸 도구로 바꾼 거였어.' },
    { t: `${J.zivo.lesson}` },
    { badge: 'connect' },
    { face: 'proud', who: '아잉', t: '연결 배지를 얻었다!' },
    { set: 'badge.connect' },
    { give: 'webgpu' },
    ...caught('webgpu', [{ face: 'wink', who: '아잉', t: '…그리고 이 게임도 그걸로 만들었어. 지금 네가 보고 있는 화면 말이야.' }]),
    { who: '팀원', t: '북쪽 길이 열렸어요. 마지막으로 물어볼 게 있대요.' },
  ],

  // ══ 7. 챔피언 로드 ══════════════════════════════════════════════
  'road.arrive': [
    { banner: '챔피언 로드' },
    { t: '해가 기울고 있다. 위로 올라가는 길 하나뿐이다.' },
  ],

  'road.recap': [
    { face: 'neutral', who: '아잉', t: '여기까지 오면서 네 도감이 꽤 찼네.' },
    { who: '아잉', t: '…근데 그거 알아? 도감은 네가 지나온 자리를 적은 거지, 네가 누구인지를 적은 게 아니야.' },
  ],

  'road.finale': [
    { fx: 'fade' },
    { face: 'focused', who: '아잉', t: FINALE.question },
    {
      choose: [
        {
          label: FINALE.options[0].label,
          then: [
            { face: 'thinking', who: '아잉', t: FINALE.rebuttal },
            { wait: 600 },
            { face: 'neutral', who: '아잉', t: FINALE.answer },
          ],
        },
        {
          label: FINALE.options[1].label,
          then: [
            { face: 'happy', who: '아잉', t: '…이미 알고 있었네.' },
            { wait: 400 },
            { face: 'neutral', who: '아잉', t: FINALE.answer },
          ],
        },
      ],
    },
    { wait: 800 },
    { face: 'cheer', who: '아잉', t: '{name}, 명예의 전당으로 가자.' },
    { scene: 'hall' },
  ],
};

/** 배지 없이 잡을 수 있는 야생 기술의 인카운터 대사. 짧게. */
export const WILD_LINES: Partial<Record<MonId, string>> = {
  spring: '풀숲에서 스프링이 튀어나왔다!',
  reactnative: '야생의 알엔몬이 나타났다!',
  aws: '야생의 에이더블유에스가 나타났다!',
  ainews: '뉴스몬이 지나간다!',
  insight: '인사이트가 나타났다!',
};
