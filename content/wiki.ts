/* iron(박상욱)에 대한 지식 베이스.
   커밋 분석과 실제 이력에서만 옮겼습니다 — 지어낸 수치는 한 줄도 없습니다.
   LLM에는 이 글이 그대로 근거 문단으로 들어가고, 모델이 없을 때는 그대로 답이 됩니다. */

import type { WikiChunk } from './types.ts';

export const WIKI: WikiChunk[] = [
  {
    id: 'who',
    title: '박상욱 (iron) — 종합 프로필',
    tags: '누구 소개 이름 아이언 iron 박상욱 상욱 개발자 프로필 자기소개 경력 강점 어떤사람 요약',
    text: `박상욱(iron, 아이언)은 의료관광 플랫폼 ZIVO의 풀스택 리드 개발자입니다.
2025년 10월부터 2026년 7월까지 약 9개월간 웹 프론트엔드를 사실상 단독 구축하고,
어드민의 공통 인프라·아키텍처·권한 시스템을 리드했으며, 백엔드에서는 검색·AI·쿠폰·통계 도메인을
주도한 최다 기여자였습니다. 세 저장소 합계 5,200여 커밋.
Redis 격리·운영 메트릭·Elastic Beanstalk/ALB 배포 계약까지 AWS 운영 경계도 함께 다뤘습니다.
강점은 화면 단위 구현보다 FRONT ↔ ADMIN ↔ BACK의 계약을 실제 테스트와 운영 문서까지 연결한 데 있습니다.
영향력의 성격은 기능 구현량이 아니라 팀의 작업 방식 자체를 설계한 데 있습니다 —
아키텍처 규율(FSD, DDD/Hexagonal, ArchUnit 강제), 팀 규약의 문서화(AGENTS.md 단일 소스, 성능 예산),
버그를 구조로 차단하는 설계(전역 에러 핸들링 일원화, 권한 훅 일원화, 디자인 토큰 codemod).
연락처는 sangwookp9591@gmail.com.`,
  },
  {
    id: 'repos',
    title: '세 저장소에서의 포지션',
    tags: '저장소 레포 repo 커밋 점유율 기여도 몇개 얼마나 규모 통계 숫자 pr 풀리퀘스트',
    text: `ZIVO_FRONT(Next.js 웹): 1,947 / 1,997 커밋, 약 98%. 단독 오너이며 PR 440개를 셀프 운영했고 src 약 12.2만 라인.
ZIVO_ADMIN(React 백오피스): 약 1,781 / 2,607 커밋, 약 68%. 리드로서 shared 코어 인프라에만 713커밋, FSD 전환 주도.
ZIVO_BACK(Spring Boot API): 1,512 / 4,649 커밋, 약 33%로 저장소 1위. 검색·AI·쿠폰·프로모션·통계 도메인 주도.
근거는 세 저장소의 git 이력 분석(2026-07-02 기준)입니다.
2026-07-21에는 checkout 없이 세 저장소의 모든 ref 625개(로컬 branch + 원격 ref 합집합)를 다시 셌습니다.
전체 고유 커밋 10,037개, 그중 iron의 non-merge 커밋 4,280개, patch-id 중복 31개를 뺀 patch-distinct 4,249개입니다
(BACK 1,622 · FRONT 1,490 · ADMIN 1,168). 위 점유율과 수가 다른 것은 기준이 다르기 때문입니다 —
위는 main 기준에 merge 포함, 아래는 전 브랜치 기준에 non-merge만입니다.
어느 쪽이든 커밋 수는 기여 범위를 설명하는 보조 근거일 뿐 성과 지표로 환산하지 않습니다.`,
  },
  {
    id: 'front',
    title: 'FRONT — 글로벌 의료관광 웹 0→1 (14개 언어, QR 주문·결제)',
    tags: '프론트 프론트엔드 front next nextjs react 웹 단독 14개언어 다국어 i18n qr 주문 seo 구축 0에서1 vanilla-extract sprinkles 스타일링',
    text: `해외 환자·여행객 대상이라 앱 설치 장벽 없이 검색 유입(SEO)으로 도달하고, 매장에서 QR 스캔부터
결제까지 웹에서 끊김 없이 끝나야 했습니다. 시장 검증 단계에서는 웹이 곧 제품이었습니다.
앱 우선 대신 웹을 선행하고, 검증 후 Flutter로 신규 개발을 이관하며 웹은 유지보수로 돌리는 단계적 전략을 실행했습니다.
스타일링은 StyleX를 검토했으나 Next.js/Turbopack 호환성과 zero-runtime을 고려해 vanilla-extract + Sprinkles로 옮겼고,
i18n은 쿠키 locale 대신 URL locale 세그먼트(14개 언어)를 택했습니다 — SEO 인덱싱과 CDN 캐시 적중 때문입니다.
Next.js 16 App Router + React 19 + FSD 단방향 의존 구조로 짓고, 위반은 phase별 리팩토링(refactor 커밋 349건)으로 해소했습니다.
성능 예산(FCP<1.5s / LCP<2.5s / CLS<0.1)을 명문화하고 가상 리스트, 지도 클러스터링, lazy loading으로 지켰습니다.`,
  },
  {
    id: 'payment',
    title: 'FRONT — 결제의 실패 경로를 먼저 설계',
    tags: '결제 결제창 페이먼트 payment eximbay 실패 취소 이탈 에러코드 oauth 카카오 로그인 리다이렉트 인앱브라우저 모달 재시도',
    text: `결제(Eximbay)는 성공 경로보다 실패 경로를 먼저 설계했습니다.
결제창에서 뒤로가기로 취소하면 즉시 재시도할 수 있게 했고, 0원 결제를 분기했으며,
매장 주문불가 에러코드(QR_STORE_037~042)마다 안내 모달을 따로 뒀습니다.
카카오 인앱 브라우저에서 외부 브라우저로 넘어가는 OAuth 크로스 컨텍스트 복귀는
세션에 저장하는 대신 state에 redirect를 동봉해 stateless로 풀었습니다.`,
  },
  {
    id: 'test',
    title: 'FRONT — 결제 E2E 자가검증 하네스, 플레이크 0',
    tags: '테스트 e2e playwright 플레이크 flaky 하이드레이션 mock stomp 품질 ci burnin 검증 자동화',
    text: `QR 주문에서 결제까지는 외부 결제사와 WebSocket에 의존해 수동 QA로는 회귀를 놓치기 쉬웠고,
실서버 연동 E2E는 느리고 불안정해 CI에 넣을 수 없었습니다.
스테이징 연동 대신 의존성 0의 Node mock 서버와 STOMP CONNECTED 프레임 스텁을 직접 만들었습니다 —
프레임워크 도입이 아니라 최소 구현으로.
React 하이드레이션 레이스로 생기던 플레이크는 sleep으로 덮지 않고 clickUntil/clickWhen 유틸로 구조적으로 없앴고,
CI에서 --repeat-each=10 burn-in으로 정량 검출했습니다. 결과는 전 구간 플레이크 0이고,
설계 방법론은 팀 문서(docs/E2E_테스트_설계_방법론.md)로 남겼습니다.
같은 규칙을 어드민 회원가입 흐름에도 적용해, 전면 mock과 role 기반 selector,
trace/screenshot 아티팩트, CI 게이트를 두 저장소에서 같은 방식으로 돌립니다.`,
  },
  {
    id: 'cart',
    title: 'FRONT — QR 장바구니 복구와 서버 reconcile',
    tags: '장바구니 카트 cart 담기 복구 restore reconcile 로그인 비로그인 병합 상태머신 유실 중복 정합성 qr',
    text: `QR로 담은 장바구니는 로그인 전후로 상태가 갈립니다. 비로그인 로컬 장바구니와 서버 장바구니 중
어느 쪽이 정본인지 클라이언트가 정하면, 담은 것이 사라지거나 두 번 담깁니다.
병합 규칙을 화면 코드에 흩는 대신 cart/restore 호출과 서버 확정 reconcile 흐름으로 옮겨
정본을 서버 한 곳에 뒀습니다. 복구 상태 머신은 페이지에서 떼어 독립 모듈(cart-restore-flow)로 추출했습니다 —
상태 전이가 컴포넌트에 붙어 있으면 테스트할 수 있는 단위가 아니기 때문입니다.
단위 테스트 260라인과 QR 장바구니 Playwright 시나리오로 복구 경로를 고정했습니다.`,
  },
  {
    id: 'perm',
    title: 'ADMIN — RBAC 하이브리드 권한 시스템',
    tags: '권한 rbac gbac abac 롤 역할 퍼미션 permission 접근제어 보안 어드민 백오피스 usePermission 훅 감사',
    text: `백오피스 사용자가 관리자·스태프·파트너로 늘면서 메뉴·기능·지표 노출을 역할별로 통제해야 했습니다.
권한 체크가 페이지마다 흩어지면 누락이 곧 데이터 유출입니다.
전면 세분권한 전환 대신 하이브리드를 택했습니다 — 파트너는 기존 level 기반을 유지하고,
관리자/스태프만 menuCode + action(VIEW/CREATE/UPDATE/DELETE/EXPORT) 세분 모델을 적용해 마이그레이션 리스크를 줄였습니다.
백엔드는 RBAC + GBAC(그룹) + ABAC(리소스) 하이브리드로 설계하고 10개 테이블 마이그레이션(V026)과 프론트 계약을 정렬했습니다.
분산된 체크는 usePermission 훅 하나로 모아 ProtectedRoute·사이드바 필터링·컬럼/정렬 게이팅까지 훅 레벨에서 강제했고,
권한 변경 이력(old/new)을 로깅해 감사 추적을 남겼습니다. 7개 컨트롤러·10개 엔티티 규모를 풀스택으로 완결했습니다.`,
  },
  {
    id: 'infra',
    title: 'ADMIN — 공통 인프라와 팀 규약 (사실상 플랫폼 오너)',
    tags: '공통 shared 인프라 아키텍처 fsd 계층 전환 리드 규약 문서 agents codemod 토큰 디자인시스템 리뷰 게이트 15명 협업 거버넌스',
    text: `기여자 15명이 드나드는 어드민에서 도메인 페이지는 나눠 맡아도, API 레이어·에러 처리·디자인 토큰 같은
공통 기반이 흔들리면 전체가 무너집니다.
규칙 문서가 CLAUDE.md·README·폴더별로 중복되며 드리프트해서, AGENTS.md를 단일 소스로 두고 나머지를 포인터로 바꿨습니다.
mutation 에러 토스트가 전역과 로컬에서 이중 발생하던 고질 버그는 개별 수정 대신
QueryClient 전역 onError 단일 소스 규약으로 계층에서 차단했습니다.
FSD 계층(app→pages→widgets→shared→stores) 전환을 리팩토링 브랜치 시리즈로 주도했고,
StyleX 디자인 토큰 강제는 codemod 스크립트(tokens:check/fix)로 자동화했습니다 — 리뷰가 아니라 도구로 집행하려고.
shared 코어(API 레이어 4계층화, Lexical 에디터, 공통 훅)에 713커밋으로 오너십을 가졌고,
"몇 줄로 되는 기능에 라이브러리 추가 금지" 같은 의존성 게이트를 명문화했습니다.`,
  },
  {
    id: 'merch',
    title: 'ADMIN+BACK — 운영 화면을 전 계층 계약으로 (머천다이징 · 리뷰 진열)',
    tags: '머천다이징 진열 상품 배치 보드 국가별 테마 미리보기 퍼널 funnel 지표 리뷰 후기 큐레이션 showcase 읽기모델 mybatis flyway 운영자 파트너 편의 핸드오프',
    text: `국가마다 다른 테마·상품 진열 상태가 화면 여러 곳에 흩어져 있어, 운영자가 지금 무엇이 걸려 있는지
한 번에 볼 수 없었습니다. 국가 단위 편집 흐름으로 평면화하고 배치 보드·상품 추가·미리보기·funnel 지표를
같은 화면 문맥에 붙였습니다. 구현만이 아니라 UX 재설계와 핸드오프 문서를 같이 남겨
후속 API 연결 기준을 고정했습니다(실제 변경 26개 파일).
리뷰 진열은 어드민 화면 하나로 끝나지 않습니다. 후보 선택·도메인/포토 필터·순서 변경·다국어 섹션 제목을
어드민에 구현하면서 백엔드의 aggregate, JPA/MyBatis 읽기 모델, Flyway DDL, 사용자 showcase API까지
계약을 맞췄습니다(어드민 12개 파일, 백엔드 35개). 화면과 API를 따로 세면 같은 일이 두 번 세어지므로
대표 영역은 프론트 하나로 잡습니다.
실제로 이 도구들을 쓰는 파트너·운영자 쪽에서 쓰기 편하다는 평을 받은 작업입니다.`,
  },
  {
    id: 'back',
    overview: true,   // 아래 search·ai·coupon이 이 조각의 세부다
    title: 'BACK — 검색·AI·쿠폰·통계 주도',
    tags: '백엔드 back spring springboot 스프링 스프링부트 java 자바 서버 api 최다기여 도메인 호텔',
    text: `Spring Boot API 저장소에서 1,512 커밋으로 최다 기여자(약 33%)였습니다.
검색·AI·쿠폰·프로모션·통계 도메인을 주도했고, 호텔 도메인에만 227커밋이 있습니다.
성능 개선은 OpenSearch 재색인 파이프라인, 회복탄력성은 멀티 LLM 프로바이더 계층,
정합성은 쿠폰의 DDD/Hexagonal + Outbox로 각각 다뤘습니다.`,
  },
  {
    id: 'modules',
    title: 'BACK — 멀티모듈 재설계와 JDK 21 이관',
    tags: '구조 재설계 리팩토링 멀티모듈 모듈 분리 gradle 그래들 도메인 domain api worker batch app jdk21 자바21 버전 업그레이드 virtual thread 가상스레드 spi 포트 어노테이션 layerfirst domainfirst 마이그레이션',
    text: `단일 모듈에 계층(controller/service/repository)으로만 나뉜 백엔드는 도메인이 늘수록
어디까지가 한 도메인인지 컴파일러가 못 막습니다. 배치·워커·API가 같은 스프링 컨텍스트를 공유해서
배치 하나가 무거워지면 API 응답이 같이 느려지는 것도 구조 문제였습니다.
계층 우선(layer-first)에서 도메인 우선(domain-first)으로 옮기고, Gradle 멀티모듈로
zivo-domain + zivo-api · zivo-worker · zivo-batch · zivo-app을 갈랐습니다.
도메인 간 호출은 직접 참조 대신 SPI 포트로만 열고, 실행 역할은 @ConditionalOnRole로 게이팅해
같은 코드가 역할별로 다른 빈만 올리도록 했습니다.
런타임은 JDK 21로 올려 가상 스레드를 쓰고, Spring Boot 3.5로 맞췄습니다.
전 도메인을 한 번에 옮기지 않고 쿠폰을 레퍼런스로 삼아 base 아키텍처 설계 문서를 먼저 쓰고,
그 템플릿으로 도메인을 하나씩 이관했습니다 — 큰 이관일수록 기준이 코드보다 먼저 있어야 합니다.
@NotifyOn · @ApiResponseWrapper · @Loggable 같은 횡단 관심사는 커스텀 어노테이션으로 걷어냈습니다.`,
  },
  {
    id: 'search',
    title: 'BACK — 호텔 검색·재색인 파이프라인 (OpenSearch)',
    tags: '검색 opensearch 재색인 인덱싱 bulk 성능 최적화 n+1 쿼리 느림 응답시간 onda webhook 스냅샷 호텔',
    text: `숙소 재고·요금이 외부(Onda webhook)에서 수시로 갱신되는데, 변경마다 개별 재색인을 호출하고
검색 hot path에서 같은 연산과 N+1 쿼리를 반복하는 것이 병목이었습니다.
검색엔진은 DB LIKE나 pgvector 대신 형태소·필터 기반 OpenSearch를 택했습니다 — 다국어 텍스트에 다중 필터 조합이라서.
재색인은 문서 단위 인덱싱 대신 Bulk API chunk 배치로 바꿔 RTT를 chunk당 1회로 줄였고,
검색 hot path의 매칭 연산은 Snapshot에 미리 계산해 요청 경로에서 걷어냈습니다.
stay-window 재계산의 N+1을 없애고 statement_timeout 가드를 두고 어드민 트리거를 비동기화해
성능과 장애 반경을 같이 관리했습니다. 재색인 Job 모니터링과 검색 테스트 콘솔도 직접 만들었습니다.
성능·안정성 계열 커밋 67건.`,
  },
  {
    id: 'ai',
    title: 'BACK — 멀티 LLM 회복탄력 계층과 외부 API 비용',
    tags: 'llm gemini claude openai 프로바이더 fallback 서킷브레이커 circuitbreaker resilience4j 장애 회복탄력 콘텐츠생성 비용 절감 place api 모델티어',
    text: `호텔 콘텐츠 생성과 14개 언어 번역이 LLM에 의존하는데, 단일 프로바이더에 묶이면
장애 때 파이프라인 전체가 멈추고 비용도 통제할 수 없었습니다.
Gemini/Claude/OpenAI를 AiProvider 인터페이스로 추상화하고 도메인별 모델 티어(ModelTierExecutor)를 둬서
품질·비용·가용성을 도메인 단위로 조절했습니다.
재시도만으로는 연쇄 지연을 못 막아 Resilience4j CircuitBreaker를 43개 지점에 적용하고 fallback 모델 체인을 붙였으며,
프로바이더 health check와 병렬 처리, 어드민의 AI 상태 콘솔까지 만들었습니다.
비용은 Google Place API 호출 언어를 14개에서 3개로 줄이고 캐시 TTL을 올리고 이미지를 최적화해
품질 손실 범위를 명시적으로 관리하며 낮췄습니다. 특정 LLM이 죽어도 파이프라인은 안 멈춥니다.`,
  },
  {
    id: 'i18n',
    title: 'BACK — LLM 번역 파이프라인과 감사 로그',
    tags: '번역 translation 다국어 로케일 locale 언어 zh 중국어 간체 rtl 자동번역 llm연동 품질 검수 감사 audit 배치 hs 상품명 39개',
    text: `호텔·상품·기준정보는 사람이 번역을 따라잡을 수 없는 속도로 늘어납니다.
LLM을 붙여 자동 번역하되, 번역은 붙이는 순간 "언제 무엇이 어떤 근거로 바뀌었는지"를 잃기 쉬워
번역 감사 로그를 따로 남기고 계측 축을 도메인에 넣었습니다.
중국어 간체는 HS 류 기준정보와 상품명을 축으로 나눠 신설했습니다 — 기준정보와 상품명은
번역 품질 기준이 다르고, 한 축으로 뭉치면 한쪽 오역이 다른 쪽으로 번집니다.
리뷰에서 나온 배송 차단 회귀와 배치 크래시 등 30건은 번역만 고치는 대신 회귀 경로까지 같이 막았고,
귀속 축 오염 차단과 경계 명시는 코드 리뷰 지적을 받아 반영했습니다.
사용자 웹은 14개 언어, 앱(Flutter)은 39개 로케일과 RTL, 서버 동적 번역까지 이 파이프라인 위에 있습니다.`,
  },
  {
    id: 'coupon',
    title: 'BACK+ADMIN — 쿠폰 도메인 0→1 (DDD/Hexagonal + Outbox)',
    tags: '쿠폰 coupon outbox 아웃박스 패턴 shedlock archunit 정합성 유실 중복 분산락 트랜잭션 돈 발급 트리거 testcontainers zonky 파티셔닝 바운디드컨텍스트 멱등 역연산 동시성',
    text: `첫 로그인·첫 채팅 같은 행위 트리거 발급, 발급 범위(scope), 대량 사용 이력의 정합성까지 —
돈과 직결되는 도메인을 레거시 계층 위에 얹으면 규칙이 서비스 코드에 흩어져 통제가 안 됩니다.
그래서 domain/application/infrastructure/interfaces의 Hexagonal 구조로 새 바운디드 컨텍스트를 신설하고
ArchUnit 테스트로 의존 방향을 CI에서 강제했습니다.
트리거 발급은 동기 호출 대신 ShedLock 분산락 기반 Outbox 워커로 처리해 유실과 중복을 구조에서 막았습니다(멀티 인스턴스 안전).
테스트는 Docker Desktop 29.x와 Testcontainers 비호환을 만나 쿠폰 IT만 zonky embedded-postgres(Docker-free)로 옮기고
기존 도메인은 Testcontainers를 유지했으며, 그 결정 근거를 pom.xml에 주석으로 남겼습니다.
usage 테이블 파티셔닝을 포함한 스키마와 Aggregate, 정책 CRUD, 유저 쿠폰함을 phase로 나눠 구현하고
어드민 대시보드·템플릿·트리거 설정 UI(95커밋)까지 풀스택으로 끝냈습니다.
다회·월 N회·무한 사용 모델은 DDL과 발급 시점 스냅샷, consume/cancel 역연산으로 설계했습니다.
동시 중복 적용과 전체 취소 뒤 재적용은 DB 락에 기대지 않고 앱 계층의 멱등 권위와 결정적 조회로 다루고,
실제 동시성 통합 테스트로 검증했습니다.
백엔드 쿠폰 커밋 118건(도메인의 74%), 테스트 101건.`,
  },
  {
    id: 'promotion',
    title: 'BACK — 프로모션 발송을 역할로 나눠 검증',
    tags: '프로모션 발송 푸시 알림 마케팅 대상자 산출 quiet hours 조용한시간 예약 즉시 chunk worker 스케줄러 역할분리 critic 리뷰어 반례 게이트 testcontainers 통합테스트',
    text: `대상자 산출·정책·스케줄러·chunk worker가 한 흐름에 얽혀 있어, 한 사람이 한 관점으로 리뷰하면
누락이 그대로 발송 사고가 됩니다.
구현을 한 번에 끝내는 대신 tech-lead 계획 · implementer 변경 정리 · critic-reviewer 반례 탐색을
독립 산출물로 나누고, 무엇을 수용할지는 직접 판정했습니다.
게이트는 사람이 아니라 테스트입니다 — ArchUnit, PostgreSQL Testcontainers 통합 테스트 7개,
정책·worker 단위 테스트 8종을 단계마다 통과해야 다음으로 넘어갔습니다.
quiet hours와 예약·즉시 발송의 분기는 hexagonal use case와 dispatch policy로 갈랐습니다.`,
  },
  {
    id: 'carry',
    title: 'BACK+ADMIN — Carry·Trade·OCR: 미확정 계약을 숨기지 않기',
    tags: 'carry 캐리 물류 배송 통관 trade ocr 영수증 인식 벤더 외부 계약 미확정 리스크 등록부 프로토타입 mock 목업 경계분리 포트어댑터 미병합 브랜치',
    text: `물류사마다 상태 코드와 응답 형식이 다르고 OCR은 비동기인데, 정작 벤더 계약이 확정되지 않은
상태에서 설계를 시작해야 했습니다. 하나의 도메인으로 뭉개면 벤더가 정해질 때 전부 다시 짜야 합니다.
carry · carry.trade · ocr을 각각 경계로 분리하고 트랜잭션 범위·상태 코드·port-adapter·job 정본값을
정정 wave로 반복 검증했습니다. 확정되지 않은 벤더 계약은 그럴듯한 구현으로 덮지 않고
리스크 등록부에 남겼습니다 — 모르는 것을 코드로 감추면 나중에 그게 버그로 청구됩니다.
어드민은 백엔드 계약이 확정되기 전에 접수·상품·매장·운송 IA를 mock API 워크스페이스로 먼저 세워
화면과 계약의 간극을 재현 가능하게 만들었습니다(34개 파일, 시나리오 테스트 452라인, E2E 430라인).
이 어드민은 feat/zivo-carry-admin 브랜치에만 있는 프로토타입입니다 — main에 병합되지 않았고,
운영 중인 기능이라고 말하지 않습니다.`,
  },
  {
    id: 'ops',
    title: 'SYSTEM — 운영 경계: Redis 격리 · 메트릭 · 배포 계약',
    tags: '운영 인프라 시스템 redis 레디스 커넥션풀 고갈 타임아웃 캐시장애 prometheus 프로메테우스 micrometer 메트릭 게이지 적체 actuator aws 배포 elastic beanstalk alb nginx 헬스체크 환경변수 드리프트',
    text: `Redis 커넥션 풀이 고갈되면 요청이 무한 대기에 걸려, 캐시 하나가 서비스 전체를 세웁니다.
대기를 timeout으로 끊고 DB fallback을 유지해 캐시가 죽어도 응답은 나가게 했고,
애플리케이션 구성과 dev/prod 배포 변수를 같이 바꿔 환경 간 드리프트를 줄였습니다.
쿠폰 outbox와 Redis Stream 적체는 Micrometer gauge로 노출하고 Actuator 보안 경계와 테스트를 함께 뒀습니다 —
다만 대시보드나 경보로 무엇을 줄였다는 성과는 근거가 없어 말하지 않습니다.
AWS는 Elastic Beanstalk 환경변수 용량 제한을 정리하고, ALB 전환 뒤 health check를
실제 ALB → nginx Host 라우팅 계약에 맞췄습니다. 문서상 설정이 아니라 실제 경로에 맞춰야
헬스체크가 통과하면서 트래픽은 못 받는 상태를 피할 수 있습니다.`,
  },
  {
    id: 'team',
    title: '팀에 남긴 것 — 에이전트 스킬 CLI · PR 자동 리뷰 · 정보 공유',
    tags: '팀 협업 동료 공유 스터디 최신 기술 정보 트렌드 스킬 skill cli npx 배포 에이전트 agent 규칙 온보딩 pr 풀리퀘스트 코드리뷰 자동 깃허브액션 workflow 비개발자 프론트아닌 리뷰어',
    text: `팀에 남긴 것은 코드만이 아닙니다.
프로젝트 규칙이 사람의 기억과 리뷰에만 있으면 새로 온 사람마다 같은 지적을 반복해서 받습니다.
그래서 저장소별 아키텍처 규칙을 AI 에이전트 스킬 10종으로 만들고 npx 한 줄로 설치되는 CLI로 배포했습니다
(백엔드 아키텍처·복원력·GoF 패턴, 어드민 워크스페이스·신규 페이지·디자인 마이그레이션, StyleX 지뢰,
Flutter 아키텍처·패턴·다국어). 규칙을 읽으라고 부탁하는 대신 도구가 들고 다니게 한 것입니다.
어드민에는 PR이 열리면 AI가 한국어로 리뷰하는 GitHub Actions를 붙였습니다.
범용 리뷰가 아니라 그 저장소의 스택과 지뢰를 담은 프롬프트입니다 — mutation 에러 토스트 중복 금지,
StyleX 토큰 규칙, 권한 체크 없이 버튼만 숨기는 패턴, 로딩·빈 상태·에러 상태 누락, N+1과 불필요 렌더까지.
덕분에 프론트엔드가 주 전공이 아닌 팀원도 PR 화면에서 지적을 읽고 직접 고칠 수 있게 됐습니다.
액션은 커밋 SHA로 고정해 씁니다.
그 외에 최신 기술 동향을 정리해 팀에 공유하는 일을 꾸준히 했습니다.`,
  },
  {
    id: 'aiwork',
    title: 'AI를 쓰는 방식 — 정본과 금지사항을 먼저 정한다',
    tags: 'ai 인공지능 에이전트 agent claude codex mcp 바이브코딩 활용 방식 워크플로우 생산성 agents.md 규칙 단일소스 역할분리 critic healer 근거등급 검증 판단 맡기지않은',
    text: `AI가 코드를 대신 썼다고 말하지 않습니다. 실제 방식은 규칙을 먼저 고정하고 역할을 나눈 뒤
테스트·실제 화면·API 증거로 수용 여부를 정하는 흐름이고, 사람의 몫은 문제 경계·정본·금지사항·최종 검증입니다.
AGENTS.md를 단일 규칙원으로 두고 CLAUDE.md는 포인터로만 남겨 규칙이 복제되며 어긋나는 것을 막았습니다.
새 코드를 쓰기 전에 기존 shared·util·패턴을 먼저 찾게 하고, 구현 뒤에는 lint/build/test/E2E를 통과해야 합니다.
검증되지 않은 추론은 정본 문서에 섞지 않고 inbox와 리스크로 분리합니다.
E2E Healer에는 금지 규칙이 있습니다 — assertion을 약화하거나 앱 로직을 통과용으로 고치는 것은 금지이고,
실패는 증거 → 분류 → 교정 → 재검증의 닫힌 루프로만 처리하며 앱 버그로 판정되면 루프를 멈춥니다.
AI 활용 자체도 근거 등급으로 나눠 적습니다. 문서·설정에 방식이 직접 남은 것만 확인됨으로 두고,
Redis·검색·배포처럼 git으로 AI 사용을 증명할 수 없는 작업은 기술 업적만 주장하고 AI 활용은 주장하지 않습니다.
정본을 무엇으로 둘지, 쿠폰 멱등 권위와 취소 역연산 같은 도메인 불변식, 미확정 외부 계약을 구현으로
숨기지 않는 결정 — 이것들은 AI에 맡기지 않은 부분입니다.`,
  },
  {
    id: 'principles',
    title: '일하는 방식 세 가지',
    tags: '원칙 철학 방식 신념 principles 가치관 일하는 스타일 태도 기준',
    text: `1. 좋은 구조는 문서가 아니라 도구가 지킨다. ArchUnit·codemod·단일 훅으로 강제했습니다.
리뷰어의 기억력에 기대는 규칙은 규칙이 아닙니다.
2. 실패 비용이 큰 곳일수록 실패 경로를 먼저 설계한다. 결제의 이탈 흐름, LLM의 fallback 체인,
쿠폰의 Outbox — 성공 케이스는 누구나 만듭니다. 차이는 무너지는 방식에서 납니다.
3. 버그는 고치는 것이 아니라 재발이 불가능한 구조로 만드는 것. 이중 토스트는 전역 onError 규약으로,
E2E 플레이크는 하이드레이션 유틸과 burn-in으로 계층에서 차단했습니다.`,
  },
  {
    id: 'stack',
    title: '스택',
    tags: '스택 기술 언어 프레임워크 tech stack 사용 도구 라이브러리 다룰수있는 목록 리액트 넥스트 자바스크립트 타입스크립트',
    text: `프론트: Next.js 16, React 19, vanilla-extract + Sprinkles, StyleX, Vite, TanStack Query, Zustand, Playwright, TypeScript, FSD.
백엔드: Spring Boot 3.5, Java 21(가상 스레드), Gradle 멀티모듈, JPA, MyBatis, PostgreSQL, Flyway,
OpenSearch, Redis, ShedLock, Resilience4j, ArchUnit, Testcontainers, DDD/Hexagonal.
운영: AWS Elastic Beanstalk, ALB, nginx, GitHub Actions, Micrometer/Prometheus, Outbox, Redis Stream.
그 외: WebGPU/WGSL, three.js, 온디바이스 LLM(transformers.js), 멀티 LLM 프로바이더 연동, 이미지·영상 생성 파이프라인.`,
  },
  {
    id: 'site',
    title: '이 사이트',
    tags: '사이트 포트폴리오 이력서 만든 webgpu 스크롤 아잉 aing 마스코트 캐릭터 three 라이트하우스 오라클 채팅창 셰이더',
    text: `이 이력서 사이트는 스크롤이 카메라를 움직이는 하늘 위 세계입니다. 미리 렌더한 카메라 비행 영상을
스크롤 위치로 스크럽해 다섯 개의 섬(기원·검증·규율·지능·정합성) 안으로 날아 들어갑니다.
마스코트 Ai-ng(아잉)는 재사용 가능한 에셋 킷 — 표정 16종, 액션 16종, 모션 6종, GLB 3D 모델입니다.
초기 번들 185KB gzip(App Router 런타임 포함), 3D 원본 54MB를 1.19MB로 압축했습니다.
지금 이 검색창은 WebGPU 컴퓨트 셰이더로 파티클 1만 6천 개가 만드는 막이고, 답은 브라우저 안에서 도는 소형 언어 모델(Qwen3 0.6B, 약 570MB)이 합니다 — 질문은 서버로 나가지 않습니다.
사이트 자체는 Next.js 16 App Router로, 본문은 전부 서버 컴포넌트에서 렌더하고 AI 에이전트를 위해 Accept: text/markdown 협상과 llms.txt를 제공합니다.`,
  },
  {
    id: 'contact',
    title: '연락',
    tags: '연락 메일 이메일 email contact 채용 문의 연락처 깃허브 github 이직 제안',
    text: `메일: sangwookp9591@gmail.com. GitHub: sangwookp9591.
ZIVO Medical Tourism Platform, 2025.10 – 2026.07.`,
  },
  {
    id: 'caution',
    title: '하지 않은 일 (사실 정확성)',
    tags: 'rag pgvector 벡터 임베딩 nicepay 라인수 안한일 오해 주의 과장 사실 정확성 하지않은',
    text: `이력에 포함하지 않는 것들입니다.
RAG/pgvector는 계획과 인프라 준비(Dockerfile.postgres) 흔적만 있고 코드베이스에 구현이 없습니다 —
"RAG를 구축했다"고 말하지 않습니다. AI 기여는 멀티 LLM 프로바이더 계층으로 기술하는 것이 사실과 맞습니다.
백엔드 결제 코어(payment/nicepay 모듈)는 다른 기여자의 소유이며, iron의 결제 기여는 프론트엔드 결제 UX 흐름입니다.
라인 수 집계(+150만)는 lock 파일 같은 생성물이 섞일 수 있어 쓰지 않고, 커밋 수와 점유율로만 이야기합니다.
main에 병합되지 않은 작업(Carry 어드민)은 운영 중인 기능이 아니라 검증 가능한 프로토타입으로만 적습니다.
매출·전환율·처리속도·장애 감소율 같은 운영 수치는 git과 문서에 근거가 없어 쓰지 않습니다.
타인이 작성한 코드는 iron의 기여로 합치지 않았고, revert/rollback 커밋과 그 대상은 대표 업적에서 제외했습니다.`,
  },
];


// 라틴과 한글이 붙어 있으면 떼어 놓습니다. "ArchUnit을"을 한 토큰으로 두면 한글이
// 섞였다는 이유로 라틴 2-gram(ar·rc·ch…)이 생기는데, 태그 쪽 "archunit"은 순수 라틴이라
// 2-gram이 없어서 서로 영영 만나지 못합니다 — 조사 하나 붙였다고 검색이 통째로 빕니다.
const norm = (s: string) => s.toLowerCase()
  .replace(/([a-z0-9])([가-힣])/g, '$1 $2')
  .replace(/([가-힣])([a-z0-9])/g, '$1 $2')
  .replace(/[^a-z0-9가-힣]+/g, ' ')
  .trim();

// ponytail: 형태소 분석기 대신 2-gram + 토큰 매칭. 한국어 조사("iron은", "권한을")가 붙어도
// 2-gram이 뚫고 들어갑니다. 청크가 10개뿐이라 전체 스캔이 인덱스보다 쌉니다.
const words = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length > 1));

// 어느 조각에나 나올 법한 서술어들. 이걸 안 빼면 "설계"가 어쩌다 한 제목에만 있다는
// 이유로 희소어 취급을 받아, "쿠폰은 왜 새로 설계했어?"에 결제 조각이 1등을 합니다.
const STOP = new Set([
  '설계', '구현', '개발', '만들', '했어', '하나', '어떻게', '무엇', '뭐야', '뭔가',
  '대해', '이야기', '알려', '한거', '했나', '했는', '하는', '있어', '있나', '싶어',
  // 조각이 스무 개를 넘기면서, 어느 글에나 나올 법한 말이 어쩌다 한 조각에만 있다는
  // 이유로 희소어 취급을 받아 1순위를 가져가는 일이 생겼습니다("쿠폰 왜 새로 만들었어" → 팀 조각).
  '새로', '사람', '방식', '사용', '경우', '문제', '작업',
]);

const grams = (s: string) => {
  const out = words(s);
  // 2-gram은 제목·태그에만. 본문까지 넣으면 긴 청크가 우연한 음절 겹침으로 이기고,
  // "어떻게" 같은 기능어가 주제어와 같은 무게를 갖습니다.
  // 그리고 한글에만. 한글은 두 글자가 의미 단위지만 영문 두 글자는 아무 뜻도 없어서,
  // "archunit"의 ch가 "opensearch"에 걸리는 식으로 노이즈만 만듭니다.
  for (const w of [...out]) {
    if (!/[가-힣]/.test(w)) continue;
    for (let i = 0; i < w.length - 1; i++) out.add(w.slice(i, i + 2));
  }
  for (const g of STOP) out.delete(g);
  return out;
};

const HAY = WIKI.map((w) => {
  const tagHay = grams(`${w.title} ${w.tags}`);
  return { ...w, hay: new Set([...tagHay, ...words(w.text)]), tagHay };
});

// 문서 빈도. "iron", "커밋"처럼 거의 모든 조각에 나오는 말은 주제를 가르지 못하므로
// 가중치를 나눠 떨어뜨립니다 — 안 하면 이름만 들어가도 소개 조각이 1등을 합니다.
const DF = new Map<string, number>();
for (const w of HAY) for (const g of w.hay) DF.set(g, (DF.get(g) ?? 0) + 1);

const AVG_LEN = HAY.reduce((a, w) => a + w.hay.size, 0) / HAY.length;

// 이 위키는 통째로 한 사람에 대한 글이라, 이름은 어느 질문에 붙어도 주제를 못 가릅니다.
// 이름을 뺀 질문으로 먼저 찾고, 그러고도 남는 게 없을 때만 이름으로 찾습니다.
const NAME = /(iron|아이언|박상욱|상욱)/gi;

/** 질문과 관련 있는 위키 조각을 점수순으로. 매칭이 하나도 없으면 빈 배열. */
export function retrieve(query: string, k = 3): WikiChunk[] {
  const stripped = query.replace(NAME, ' ').trim();
  return rank(stripped, k) ?? rank(query, k) ?? [];
}

function rank(query: string, k: number): WikiChunk[] | null {
  const q = grams(query);
  if (!q.size) return null;
  const out = HAY.map((w) => {
    let s = 0;
    // DF는 바로 위에서 모든 조각의 hay를 훑어 채웠고, 여기 오는 g는 w.hay에 있는 것뿐입니다 — 반드시 있습니다.
    for (const g of q) if (w.hay.has(g)) s += (w.tagHay.has(g) ? 5 : 1) / DF.get(g)!;
    // 길이 정규화(BM25의 b항과 같은 꼴). 개요 조각은 온갖 말을 다 담고 있어서 안 나누면
    // "쿠폰"을 물어도 백엔드 개요가 1등을 하고, 제곱근으로 나누면 반대로 가장 짧은
    // 조각이 아무 질문에나 튀어나옵니다. 평균 길이 기준으로 완만하게만 눌러야 합니다.
    // 개요 조각은 거느린 세부 조각의 주제어를 전부 품고 있어서, 양보시키지 않으면
    // "쿠폰"을 물어도 쿠폰 조각이 아니라 백엔드 개요가 1등을 합니다.
    if (w.overview) s *= 0.55;
    return { w, s: s / (0.62 + 0.38 * (w.hay.size / AVG_LEN)) };
  })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((r) => r.w);
  return out.length ? out : null;
}

/** 모델 없이도 답이 되는 폴백: 가장 가까운 조각을 그대로 인용합니다. */
export function lookup(query: string): string {
  const hits = retrieve(query, 2);
  if (!hits.length) {
    return '그 질문은 이 위키에 없네요. 이력·저장소·기술 스택·일하는 방식에 대해 물어보시면 답할 수 있습니다.';
  }
  return hits.map((h) => `【${h.title}】\n${h.text}`).join('\n\n');
}
