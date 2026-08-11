/* 네 회사의 일대기. 게임의 서사 척추입니다.
   1~3번 회사는 본인 진술에서, 4번 회사(ZIVO)는 wiki.js의 커밋 분석 근거에서 왔습니다.
   근거 등급이 다르므로 `evidence` 필드로 구분해 둡니다 — 게임에서도 수치를 지어내지 않습니다. */

export const JOURNEY = [
  {
    n: 1,
    id: 'newbie',
    map: 'newbie-town',
    place: '뉴비마을',
    role: '신입',
    evidence: 'self',
    headline: '시킨 것만 하면 거기서 끝난다',
    // 오버월드에서 진입할 때 화면 위에 뜨는 한 줄
    banner: '뉴비마을 — 처음 받은 것은 Spring 하나였다',
    story: `첫 회사에서 맡은 것은 Spring 하나였습니다. 시키는 것만 하면 시키는 만큼만 남습니다.
퇴근하고 혼자 Spring Boot와 JPA를 붙여 보고, 화면이 없으면 아무도 안 쓴다는 걸 알고 React까지 건드렸습니다.
누가 시켜서가 아니라 만들고 싶은 게 있어서 배웠습니다.
그러다 "이 정도면 밖에서도 되겠다"는 근거 없는 자신감이 생겼고, 그 자신감으로 이직을 결심했습니다.`,
    lesson: '배움은 허락을 받고 시작하는 게 아니다.',
    badge: 'confidence',
    gets: ['spring', 'springboot', 'jpa', 'react'],
  },
  {
    n: 2,
    id: 'harbor',
    map: 'wave-harbor',
    place: '파도항구',
    role: '경력',
    evidence: 'self',
    headline: '실력자는 생각보다 훨씬 많았다',
    banner: '파도항구 — 자신감이 꺾인 곳',
    story: `두 번째 회사에서 React Native와 AWS를 처음 만졌습니다. 배운 건 분명히 늘었습니다.
그런데 옆자리와의 실력 차가 배운 양으로 메워지지 않았습니다. 같은 문제를 봐도
그 사람은 두 수 앞을 보고 있었고, 저는 방금 배운 것을 대입해 보고 있었습니다.
그때 처음으로 제대로 졌습니다. 세상에 실력자는 아주 많았습니다.`,
    lesson: '기술을 몇 개 아는지는 실력의 이름이 아니었다.',
    badge: 'humility',
    gets: ['reactnative', 'aws'],
  },
  {
    n: 3,
    id: 'share',
    map: 'share-village',
    place: '공유마을',
    role: '동료',
    evidence: 'self',
    headline: '영감은 위가 아니라 옆에서 왔다',
    banner: '공유마을 — 새 동료들이 알려 준 것',
    story: `세 번째 회사에서 만난 신입 동료들이 저를 바꿨습니다.
새로 나온 것을 먼저 읽고, 읽은 것을 팀에 그냥 던져 놓는 사람들이었습니다.
AI 뉴스, 새 도구, 남의 실패담까지. 자기가 다 이해한 뒤에 공유하는 게 아니라
이해하려고 공유하고 있었습니다.
저는 그때까지 혼자 배워서 혼자 잘하는 게 성장인 줄 알았습니다. 아니었습니다.`,
    lesson: '아는 것을 꺼내 놓는 순간부터 그것은 팀의 것이 된다.',
    badge: 'insight',
    gets: ['insight', 'ainews'],
  },
  {
    n: 4,
    id: 'zivo',
    map: 'zivo-city',
    place: 'ZIVO 시티',
    role: '풀스택 리드',
    evidence: 'git',
    headline: '이제야 앞의 셋이 하나로 연결된다',
    banner: 'ZIVO 시티 — 지금 서 있는 곳',
    story: `의료관광 플랫폼 ZIVO에서 웹 프론트엔드를 사실상 단독으로 세우고,
어드민의 공통 인프라와 권한 시스템을 리드하고, 백엔드에서는 검색·AI·쿠폰·통계를 주도했습니다.
세 저장소 합계 5,200여 커밋. 하지만 여기서 실제로 쓴 것은 커밋 수가 아니라 앞의 세 곳에서 가져온 것들입니다.
혼자 배우는 법(1), 나보다 잘하는 사람이 있다는 전제(2), 아는 것을 도구로 만들어 팀에 넘기는 법(3).
ArchUnit·codemod·에이전트 스킬 CLI는 전부 세 번째 회사에서 배운 것을 도구로 바꾼 결과입니다.`,
    lesson: '문제를 만나면 필요한 기술을 연결해서 실제 서비스까지 만든다.',
    badge: 'connect',
    gets: ['nextjs', 'fsd', 'playwright', 'rbac', 'opensearch', 'resilience', 'outbox', 'archunit', 'vanilla', 'webgpu'],
  },
];

export const BADGES = {
  confidence: { name: '자신감 배지', hue: '#F2814F', from: '뉴비마을', got: '혼자서도 배울 수 있다는 것' },
  humility: { name: '겸손 배지', hue: '#A8DDF0', from: '파도항구', got: '져 봐야 아는 것' },
  insight: { name: '공유 배지', hue: '#7FA65C', from: '공유마을', got: '꺼내 놓아야 커지는 것' },
  connect: { name: '연결 배지', hue: '#B8B0E8', from: 'ZIVO 시티', got: '이어 붙여야 서비스가 되는 것' },
};

/** 챔피언 로드의 마지막 문답. 어느 쪽을 골라도 엔딩은 같습니다 — 그게 주제입니다. */
export const FINALE = {
  question: '너는 어떤 개발자가 되고 싶었지?',
  options: [
    { key: 'stack', label: '기술 스택이 많은 개발자' },
    { key: 'connect', label: '문제를 만나면 필요한 기술을 연결하는 개발자' },
  ],
  // 스택을 고르면 되묻고, 연결을 고르면 바로 받습니다. 결론은 하나.
  rebuttal: `…도감을 열어 볼까. 18개를 다 잡았어도, 그건 네가 무엇을 할 수 있는지 말해 주지 않아.
Spring만 하던 곳에서 React를 붙인 것도, 진 다음에 다시 배운 것도,
동료가 던져 준 뉴스 하나로 도구를 만든 것도 — 전부 목록에는 안 적히는 것들이야.`,
  answer: `"기술 스택이 많은 개발자"보다
"문제를 만나면 필요한 기술을 연결해서 실제 서비스까지 만드는 개발자".

네 도감에 적힌 건 지나온 자리지, 네가 누구인지가 아니야.`,
};
