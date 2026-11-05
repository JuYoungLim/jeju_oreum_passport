# 오름오름 — 제주 오름 도장깨기

오름 10곳을 둘러보고, 가고 싶은 오름을 찜하고, 다녀온 오름에 도장을 남기는 반응형 웹앱입니다.

## 실행

Node.js 22 이상이면 추가 패키지 설치 없이 실행합니다.

```sh
node scripts/serve.mjs
```

http://localhost:5173 에서 확인하세요. HTML 파일을 직접 여는 대신 서버로 실행해야 JSON을 읽을 수 있습니다.

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/serve.mjs --dist
```

## 기능과 화면

- 지역별 필터: 전체 / 제주시 / 서귀포시
- 찜하기: 카드와 상세 화면에서 토글, 찜한 오름 보기
- 방문 완료: 상세 화면에서 토글, 카드·상세 도장과 진행률 갱신, 방문한 오름 보기

화면은 목록(`#/`)과 상세(`#/oreum/saebyeol`) 두 종류입니다. URL로 화면과 필터를 유지하고 브라우저 뒤로가기를 지원합니다. 방문 완료를 다시 누르면 도장이 취소됩니다.

## JSON 저장 구조

`data/oreums.json`은 오름 기본 정보의 원본입니다. ID, 이름, 지역, 소개, 찜 여부, 방문 여부를 포함하며 위치와 공식 출처 등 표시용 필드도 함께 둡니다.

```json
{
  "id": "saebyeol",
  "name": "새별오름",
  "region": "제주시",
  "description": "오름 소개",
  "favorite": false,
  "visited": false
}
```

사용자 기록은 `localStorage`의 `oreumoreum.records.v1` 키에 전체 오름 배열을 JSON 문자열로 저장합니다. 찜·방문 상태만 복원하고 이름·소개는 최신 원본 JSON을 따릅니다. 새로고침과 같은 브라우저의 재방문에도 유지됩니다. 다른 기기·브라우저·도메인과 동기화되지 않으며 브라우저 데이터를 지우면 기록이 사라집니다. 저장이 차단된 환경은 화면 내 기록으로 동작하고 안내를 표시합니다. 서버의 원본 JSON 파일을 방문할 때마다 수정하지 않습니다.

소개는 제주특별자치도 및 비짓제주 정보를 바탕으로 짧게 요약했으며 상세 화면에서 원문을 볼 수 있습니다. 주소는 위치 정보이며 모든 주소가 탐방로 입구를 뜻하지는 않습니다. 사진 대신 직접 작성한 SVG 풍경 일러스트를 사용합니다. 외부 Google Fonts가 차단되어도 시스템 글꼴로 표시됩니다.

## GitHub와 Vercel 새 프로젝트 배포

1. GitHub에서 빈 저장소를 만듭니다(예: `jeju-oreum-passport`). 이 폴더에서 실행합니다.

```sh
git init -b main
git add .
git commit -m "Build Jeju oreum passport web app"
git remote add origin https://github.com/YOUR_ACCOUNT/jeju-oreum-passport.git
git push -u origin main
```

2. Vercel에서 **Add New → Project → Import Git Repository**로 저장소를 가져옵니다.
3. Framework Preset은 **Other**, Build Command는 `node scripts/build.mjs`, Output Directory는 `dist`입니다. `vercel.json`에도 설정되어 있습니다. Install Command는 비워 둡니다. 환경 변수와 데이터베이스가 필요하지 않습니다.
4. **Deploy**를 누르면 배포됩니다. 이후 `main`에 푸시하면 Vercel이 자동으로 다시 배포합니다. GitHub Actions는 푸시와 PR에서 데이터·저장 로직 테스트와 빌드를 실행합니다.

Vercel 공식 참고: https://vercel.com/docs/deployments/git/vercel-for-github

## 시연 순서

목록에서 제주시 필터 → 새별오름 하트 선택 → 카드 제목으로 상세 진입 → 방문 완료 → 목록으로 복귀하여 도장 확인 → 새로고침으로 기록 유지 확인. 상단 ‘찜한 오름’과 ‘나의 도장’에서도 상태를 확인할 수 있습니다.
