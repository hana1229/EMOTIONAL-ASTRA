# EMOTIONAL ATLAS | 전체 교체용 파일 (v2)

이 ZIP은 기존 GitHub 저장소 `SOOM-PYO`에서 사용하던 **파일이 루트에 나란히 있는 구조**에 맞춰 제작했습니다.

## 업로드

1. ZIP 파일을 다운로드하고 압축을 풉니다.
2. GitHub 저장소 `SOOM-PYO`의 `main` 브랜치 최상위에 압축 해제한 **파일 10개를 전부** 업로드합니다.
3. 기존에 같은 이름의 파일이 있다면 변경 내역으로 반영합니다. 기존 파일을 삭제한 상태라면 그대로 업로드합니다.
4. `Commit changes`를 눌러 저장하고 GitHub Pages가 반영된 뒤 Cmd+Shift+R로 새로고침합니다.

## 파일 구성

```text
SOOM-PYO/
  index.html
  style.css
  app.js
  my.js
  organism.js
  storage.js
  world.js
  world.geojson
  wvs-summary.json
  README.md
```

**이 버전은 `css`, `js`, `data` 폴더를 만들지 않습니다.** 이 ZIP 안의 파일은 모두 `index.html`과 같은 위치에 있습니다.

**주의**: 실제 개인 기록은 브라우저 저장소에 있으며, GitHub 업로드로 동기화되지 않습니다. 같은 사이트 주소를 유지하고, `IndexedDB` 및 사이트 데이터를 지우지 마세요. 중요한 기록은 사이트 내 '기록 백업' 버튼으로 JSON 백업을 만드세요.

원본 WVS 미시자료는 포함되어 있지 않으며, 이 사이트의 `wvs-summary.json`은 이전 집계 기반입니다. 별도 사용/공개 조건은 원 출처를 확인하세요.

이번 패키지에는 기존의 WORLD EMOTION 연결 구성과 QUALI 형태·재질·유리병·선택 카드 업데이트가 포함되어 있습니다. 3D 재질 렌더링은 기기와 브라우저에 따라 다르며 모든 시각적 동작의 브라우저 검증이 완료된 것은 아닙니다.
