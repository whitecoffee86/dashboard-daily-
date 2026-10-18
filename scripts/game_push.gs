/**
 * 🃏 쿼카의 농기구 덱 — GAME 탭 ↔ 대시보드 (v2: 대시보드에서 클릭하면 바로 저장)
 *
 * 설치 (한 번만)
 *  1) Apps Script의 game.gs 내용을 이 코드로 전부 바꾸고 저장
 *  2) 함수 목록에서 setupGamePin 선택 → 실행 → 아래 '실행 로그'에 나온 6자리 PIN 확인
 *  3) Code.gs 의 function doGet(e) { 바로 다음 줄에 한 줄 추가:
 *       if (e && e.parameter && e.parameter.game) return gameWebApp_(e);
 *  4) 배포 → 배포 관리 → ✏️ 편집 → 버전: 새 버전 → 배포   (웹 앱 주소는 그대로예요)
 *  5) 대시보드 상점에서 처음 한 번 PIN 입력 (기기마다 한 번)
 *
 * 대시보드에서 구매·강화·판매·새로고침을 누르면 GAME 탭에 줄이 자동으로 추가되고 data/game.json 도 바로 올라가요.
 * GAME 탭을 직접 고쳐도 되고, 매일 업데이트(updateDashboard)의 pushGameJson() 이 그대로 올려요.
 * PIN 은 스크립트 속성 GAME_PIN 에만 저장돼요(코드·저장소에 없음). 다시 만들려면 setupGamePin 을 또 실행하세요.
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

function readGameRows_(sh) {
  sh = sh || ensureGameSheet_();
  var n = sh.getLastRow() - 1;
  var vals = n > 0 ? sh.getRange(2, 1, n, 3).getValues() : [];
  return vals.filter(function (r) { return r[0] !== '' && r[1] !== ''; }).map(function (r) {
    var d = r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[0]).trim().slice(0, 10);
    return [d, String(r[1]).trim().toUpperCase(), String(r[2] || '').trim()];
  });
}

function pushGameJson() {
  var rows = readGameRows_();
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

/** 6자리 PIN 만들기 → 실행 로그에서 확인 */
function setupGamePin() {
  var pin = String(Math.floor(100000 + Math.random() * 900000));
  PropertiesService.getScriptProperties().setProperty('GAME_PIN', pin);
  ensureGameSheet_();
  Logger.log('🃏 게임 PIN: ' + pin + '  ← 대시보드 상점에서 처음 한 번 입력하세요');
  return pin;
}

function kstToday_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function nextMonday_(s) {
  var d = new Date(s + 'T00:00:00Z'), k = (8 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + k);
  return d.toISOString().slice(0, 10);
}
function gameOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** 웹 앱: ?game=list | ?game=add&act=BUY&id=umb&pin=… | ?game=undo&pin=… */
function gameWebApp_(e) {
  var p = e.parameter || {};
  try {
    if (p.game === 'list') return gameOut_({ ok: true, rows: readGameRows_() });
    var pin = PropertiesService.getScriptProperties().getProperty('GAME_PIN');
    if (!pin) return gameOut_({ ok: false, error: 'PIN이 아직 없어요. Apps Script에서 setupGamePin 을 실행하세요.' });
    if (String(p.pin || '') !== pin) return gameOut_({ ok: false, error: 'PIN이 달라요', badPin: true });
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var sh = ensureGameSheet_(), today = kstToday_();
      if (p.game === 'add') {
        var act = String(p.act || '').toUpperCase(), id = String(p.id || '').replace(/[^a-z]/g, '');
        if (['BUY', 'UP', 'SELL', 'REROLL'].indexOf(act) < 0) return gameOut_({ ok: false, error: '알 수 없는 행동: ' + act });
        if (act !== 'REROLL' && !id) return gameOut_({ ok: false, error: '조커가 비었어요' });
        sh.appendRow([today, act, act === 'REROLL' ? '' : id, '대시보드']);
        sh.getRange(sh.getLastRow(), 1).setNumberFormat('yyyy-mm-dd');
      } else if (p.game === 'undo') {
        var last = sh.getLastRow();
        if (last > 1) {
          var r = sh.getRange(last, 1, 1, 4).getValues()[0];
          var d = r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Seoul', 'yyyy-MM-dd') : String(r[0]).slice(0, 10);
          if (String(r[3]) === '대시보드' && nextMonday_(d) === nextMonday_(today)) sh.deleteRow(last);
          else return gameOut_({ ok: false, error: '되돌릴 수 있는 건 이번 상점에서 대시보드로 고른 마지막 줄뿐이에요', rows: readGameRows_(sh) });
        }
      } else return gameOut_({ ok: false, error: '알 수 없는 요청' });
      SpreadsheetApp.flush();
      var msg = pushGameJson();
      return gameOut_({ ok: true, rows: readGameRows_(sh), pushed: msg });
    } finally { lock.releaseLock(); }
  } catch (err) {
    return gameOut_({ ok: false, error: String(err && err.message || err) });
  }
}
