# 익명 손글씨 입력 웹앱

GitHub Pages에서 동작하는 빌드 없는 정적 웹앱입니다.

- 익명 참여 아이디 자동 생성
- PC 마우스를 이용한 손글씨 입력
- 획별 좌표와 시간 기록
- 전체 초기화
- JSON 및 PNG 파일 다운로드

## 결과 저장 위치

완료하면 JSON과 PNG가 브라우저의 기본 Downloads(다운로드) 폴더에 저장됩니다. Chrome에서 여러 파일 다운로드 허용 여부를 묻는 경우 허용해야 두 파일이 모두 저장됩니다.

## 로컬 실행

정적 파일 서버를 사용해 프로젝트 루트의 `index.html`을 엽니다.

```powershell
python -m http.server 8000
```

시스템 Python이 없다면 VS Code Live Server 같은 정적 서버를 사용할 수 있습니다.

## GitHub Pages 배포

1. 이 폴더의 파일을 GitHub 저장소 기본 브랜치에 올립니다.
2. 저장소의 **Settings → Pages**로 이동합니다.
3. **Deploy from a branch**를 선택합니다.
4. 기본 브랜치와 `/ (root)` 폴더를 선택하고 저장합니다.
5. 표시된 HTTPS 주소에서 최신 Chrome으로 확인합니다.

상대 경로와 순수 HTML/CSS/JavaScript만 사용하므로 별도 빌드 명령은 필요하지 않습니다.

