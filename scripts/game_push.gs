/**
 * 🃏 쿼카의 농기구 덱 — 스프레드시트 GAME 탭 → GitHub data/game.json
 *
 * 설치 (한 번만)
 *  1) Apps Script 편집기에서 파일 추가(+) → 스크립트 → 이름 game → 이 코드 전체 붙여넣기 → 저장
 *  2) 함수 목록에서 pushGameJson 선택 → 실행 (처음 한 번 권한 허용). GAME 탭이 없으면 자동으로 만들어져요.
 *  3) 기존 '업데이트' 함수 맨 끝에 한 줄 추가:  pushGameJson();
 *     → 매일 업데이트할 때 GAME 탭도 같이 올라가요.
 *
 * GAME 탭 쓰는 법 (A 날짜 · B 행동 · C 조커)
 *  - 행동: BUY 구매 · UP 강화 · SELL 판매 · REROLL 상점 새로고침(C는 비움)
 *  - 조커: id(umb) 또는 이름(우산 쿼카) 둘 다 돼요
 *  - 줄 날짜의 "다음 월요일"부터 시작하는 주에 적용돼요. 주말에 적으면 다가오는 주 상점.
 *  - 대시보드 상점에서 고르고 📋 복사 → GAME 탭 A열 빈칸에 붙여넣기 하면 세 칸에 나눠 들어가요.
 *
 * 토큰은 기존 업데이트와 같은 스크립트 속성 GITHUB_TOKEN 을 써요(코드에 넣지 않음).
 */
var GAME_REPO = 'whitecoffee86/dashboard-daily-';
var GAME_BRANCH = 'main';
var GAME_PATH = 'data/game.json';
var GAME_SHEET = 'GAME';

function ensureGameSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(GAME_SHEET);
  if (!sh) {
    sh = ss.insertSheet(GAME_SHEET);
    sh.getRange(1, 1, 1, 4).setValues([['날짜', '행동', '조커', '메모']]);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('yyyy-mm-dd');
    sh.getRange(1, 6).setValue('BUY 구매 · UP 강화 · SELL 판매 · REROLL 새로고침 / 조커는 id 또는 이름 / 줄 날짜 다음 월요일 주에 적용');
  }
  return sh;
}

function pushGameJson() {
  var sh = ensureGameSheet_();
  var n = sh.getLastRow() - 1;
  var vals = n > 0 ? sh.getRange(2, 1, n, 3).getValues() : [];
  var rows = vals.filter(function (r) { return r[0] !== '' && r[1] !== ''; }).map(function (r) {
    var d = r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[0]).trim().slice(0, 10);
    return [d, String(r[1]).trim().toUpperCase(), String(r[2] || '').trim()];
  });
  var body = {
    note: '🃏 쿼카의 농기구 덱 — GAME 탭(A 날짜 · B 행동 · C 조커). 줄 날짜 다음 월요일 주에 적용.',
    updated: Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ssXXX"),
    rows: rows
  };
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('스크립트 속성 GITHUB_TOKEN 이 없어요');
  var url = 'https://api.github.com/repos/' + GAME_REPO + '/contents/' + GAME_PATH;
  var headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
  var sha = null;
  var got = UrlFetchApp.fetch(url + '?ref=' + GAME_BRANCH, { headers: headers, muteHttpExceptions: true });
  if (got.getResponseCode() === 200) {
    var cur = JSON.parse(got.getContentText());
    sha = cur.sha;
    try {
      var old = JSON.parse(Utilities.newBlob(Utilities.base64Decode(String(cur.content).replace(/\n/g, ''))).getDataAsString());
      if (JSON.stringify(old.rows) === JSON.stringify(rows)) return 'GAME 탭 변경 없음';
    } catch (e) {}
  }
  var payload = {
    message: 'game: GAME 탭 ' + rows.length + '줄',
    content: Utilities.base64Encode(JSON.stringify(body, null, 1), Utilities.Charset.UTF_8),
    branch: GAME_BRANCH
  };
  if (sha) payload.sha = sha;
  var res = UrlFetchApp.fetch(url, { method: 'put', headers: headers, contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) throw new Error('game.json 업로드 실패: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  return 'GAME 탭 ' + rows.length + '줄 올림';
}
