/* グラスチェックリスト — Glass Checklist
 * 入力: D-pad（矢印キー）とタップ（Enter）のみ。Escape は PC 確認用の補助。
 * 依存ライブラリなし。DOM + Canvas（エフェクト）。
 * チェック状態・かくした項目・最後に使ったリストは localStorage に保存する。
 */
(function () {
  'use strict';

  var el = function (id) { return document.getElementById(id); };

  // ---------- プリセットリスト ----------
  var LISTS = [
    { id: 'out', emoji: '🚪', name: '外出前', msg: 'いってらっしゃい！', items: ['鍵', '財布', 'スマホ', '交通ICカード', 'ハンカチ・ティッシュ', '火の元（コンロ）', '窓・ベランダの鍵', 'エアコン・照明オフ', '天気と傘', 'モバイルバッテリー'] },
    { id: 'morning', emoji: '🌅', name: '朝のルーティン', msg: 'いい一日を！', items: ['水を一杯のむ', '顔を洗う', '歯みがき', '朝ごはん', '薬・サプリ', '天気予報をみる', 'きょうの予定を確認', '着替え・身だしなみ', 'ゴミ出し'] },
    { id: 'night', emoji: '🌙', name: '寝る前', msg: 'おやすみなさい。', items: ['玄関の鍵', '火の元チェック', 'スマホ・グラスを充電', '目覚ましをセット', '明日の服を用意', '歯みがき', 'エアコン・加湿器', '照明オフ'] },
    { id: 'travel', emoji: '✈️', name: '旅行の持ち物', msg: 'よい旅を！', items: ['パスポート・身分証', '航空券・予約の確認', '財布・カード', 'スマホ・充電器', 'モバイルバッテリー', '着替え', '下着・靴下', 'パジャマ', '洗面用具', '常備薬', '保険証', '変換プラグ', '折りたたみ傘', 'エコバッグ'] },
    { id: 'biz', emoji: '💼', name: '出張', msg: 'いってらっしゃい、がんばって！', items: ['名刺', 'ノートPC', 'PCの充電器', '資料・USBメモリ', '社員証', '新幹線・航空券', 'ホテル予約の確認', 'ワイシャツ・着替え', '洗面用具', 'スマホ充電ケーブル', '領収書入れ', '常備薬'] },
    { id: 'camp', emoji: '⛺', name: 'キャンプ', msg: 'たのしいキャンプを！', items: ['テント', 'ペグ・ハンマー', '寝袋', 'マット', 'ランタン', 'ヘッドライト', 'チェア・テーブル', 'バーナー・ガス缶', 'クッカー・食器', '食材・クーラーボックス', '飲み水', '着火剤・ライター', '虫よけ', 'ゴミ袋', 'レインウェア'] },
    { id: 'gym', emoji: '🏋️', name: 'ジム', msg: 'ナイスワークアウト！', items: ['会員証・アプリ', 'トレーニングウェア', '室内シューズ', 'タオル', '水ボトル', 'プロテイン', 'イヤホン', '帰りの着替え'] },
    { id: 'rain', emoji: '☔', name: '雨の日', msg: '足もとに気をつけて！', items: ['傘', '窓を閉める', '洗濯物を室内へ', '防水の靴', '替えの靴下', 'ハンドタオル', 'カバンの防水カバー', 'ビニール袋', 'いつもより5分早く出る'] },
    { id: 'bosai', emoji: '🎒', name: '防災バッグ', msg: 'そなえは万全！', items: ['飲み水（1人3L）', '非常食', '懐中電灯', 'モバイルバッテリー', '携帯ラジオ', '救急セット・常備薬', '現金（小銭も）', '身分証のコピー', '軍手', '簡易トイレ', '保温シート', 'マスク', 'ホイッスル'] }
  ];

  // ---------- 状態 ----------
  var mode = 'title';            // title / lists / check / edit / done / howto
  var menuIdx = 0, menuItems = [], menuEl = 'title-list', howtoFrom = 'title';
  var gridIdx = 1;               // 0 = もどる, 1.. = LISTS
  var cur = 0;                   // 開いているリスト
  var rows = [], rowIdx = 0;     // チェック画面の行
  var resetArmed = false, resetTimer = 0;
  var data = { checked: {}, hidden: {}, last: null };

  // ---------- 保存 ----------
  var KEY = 'glass-checklist-v1';
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { /* 保存できなくても動作には影響しない */ }
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s || typeof s !== 'object') return;
      if (s.checked && typeof s.checked === 'object') data.checked = s.checked;
      if (s.hidden && typeof s.hidden === 'object') data.hidden = s.hidden;
      if (typeof s.last === 'string' && listIndex(s.last) >= 0) data.last = s.last;
    } catch (e) { /* 壊れていたら初期値のまま */ }
  }
  function listIndex(id) {
    for (var i = 0; i < LISTS.length; i++) if (LISTS[i].id === id) return i;
    return -1;
  }
  function isChecked(li, i) { var a = data.checked[LISTS[li].id]; return !!(a && a.indexOf(i) >= 0); }
  function isHidden(li, i) { var a = data.hidden[LISTS[li].id]; return !!(a && a.indexOf(i) >= 0); }
  function setIn(obj, li, i, on) {
    var id = LISTS[li].id, a = obj[id] || [];
    var k = a.indexOf(i);
    if (on && k < 0) a.push(i);
    if (!on && k >= 0) a.splice(k, 1);
    obj[id] = a;
  }
  function visibleItems(li) {
    var out = [];
    for (var i = 0; i < LISTS[li].items.length; i++) if (!isHidden(li, i)) out.push(i);
    return out;
  }
  function progress(li) {
    var v = visibleItems(li), d = 0;
    for (var i = 0; i < v.length; i++) if (isChecked(li, v[i])) d++;
    return { done: d, total: v.length, hidden: LISTS[li].items.length - v.length };
  }

  // ---------- 共通 ----------
  var SCREENS = ['title', 'lists', 'check', 'done', 'howto'];
  function show(id, keep) {
    for (var i = 0; i < SCREENS.length; i++) {
      var s = SCREENS[i];
      el(s).classList.toggle('hidden', !(s === id || s === keep));
    }
    el('hud').classList.toggle('hidden', id === 'title');
  }
  var toastTimer = 0;
  function toast(t) {
    var e = el('toast');
    e.textContent = t;
    e.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { e.classList.remove('show'); }, 1600);
  }
  function clock() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  function setHud(left, right, cls) {
    el('hud-left').textContent = left;
    var r = el('hud-right');
    r.textContent = right == null ? clock() : right;
    r.className = cls || '';
  }

  // ---------- 汎用メニュー（タイトル・完了・つかいかた） ----------
  function renderList() {
    var box = el(menuEl);
    box.innerHTML = '';
    menuItems.forEach(function (it, i) {
      var b = document.createElement('div');
      b.className = 'rail-btn' + (i === menuIdx ? ' cur' : '');
      b.innerHTML = '<span>' + it.label + '</span>' + (it.sub ? '<small>' + it.sub + '</small>' : '');
      b.addEventListener('click', function () { menuIdx = i; renderList(); it.act(); });
      box.appendChild(b);
    });
  }
  function openTitle() {
    mode = 'title'; menuEl = 'title-list'; menuIdx = 0;
    menuItems = [];
    var li = data.last ? listIndex(data.last) : -1;
    if (li >= 0) {
      var p = progress(li);
      menuItems.push({ label: '▶ つづき：' + LISTS[li].emoji + ' ' + LISTS[li].name, sub: p.done + '/' + p.total, act: function () { openCheck(li); } });
      menuItems.push({ label: 'リスト一覧', sub: LISTS.length + 'こ', act: function () { openLists(); } });
    } else {
      menuItems.push({ label: '▶ リストをえらぶ', sub: LISTS.length + 'こ', act: function () { openLists(); } });
    }
    menuItems.push({ label: 'つかいかた', act: function () { openHowto('title'); } });
    show('title'); renderList();
  }
  function openHowto(from) {
    mode = 'howto'; menuEl = 'howto-list'; menuIdx = 0; howtoFrom = from;
    menuItems = [{ label: '← もどる', act: function () { from === 'lists' ? openLists() : openTitle(); } }];
    setHud('✅ つかいかた');
    show('howto'); renderList();
  }

  // ---------- リスト一覧 ----------
  function openLists(focus) {
    mode = 'lists';
    if (typeof focus === 'number') gridIdx = focus;
    else if (data.last && listIndex(data.last) >= 0) gridIdx = listIndex(data.last) + 1;
    setHud('✅ リストをえらぶ');
    show('lists'); renderGrid();
  }
  function renderGrid() {
    var g = el('grid');
    g.innerHTML = '';
    var back = document.createElement('div');
    back.className = 'card back' + (gridIdx === 0 ? ' cur' : '');
    back.innerHTML = '<div class="c-name">← もどる</div>';
    back.addEventListener('click', function () { gridIdx = 0; openTitle(); });
    g.appendChild(back);
    LISTS.forEach(function (L, i) {
      var p = progress(i), full = p.total > 0 && p.done === p.total;
      var c = document.createElement('div');
      c.className = 'card' + (gridIdx === i + 1 ? ' cur' : '') + (full ? ' full' : '');
      var meta = full ? '✔ ぜんぶOK' : (p.done + ' / ' + p.total);
      if (p.hidden) meta += '　かくし' + p.hidden;
      c.innerHTML = '<div class="c-emoji">' + L.emoji + '</div><div class="c-body"><div class="c-name">' + L.name + '</div>' +
        '<div class="c-meta">' + meta + '</div><div class="c-bar"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 0) + '%"></i></div></div>' +
        (data.last === L.id ? '<div class="c-badge">前回</div>' : '');
      c.addEventListener('click', function () { gridIdx = i + 1; openCheck(i); });
      g.appendChild(c);
    });
  }
  function gridMove(dx, dy) {
    var n = LISTS.length + 1;
    if (dx) gridIdx = (gridIdx + dx + n) % n;
    if (dy) {
      var t = gridIdx + dy * 2;
      if (t < 0) t = (n % 2 === 0 ? n : n + 1) + t;   // 上端から下端へ
      if (t >= n) t = t % 2;                          // 下端から上端へ
      if (t >= n) t = n - 1;
      gridIdx = t;
    }
    renderGrid();
  }

  // ---------- チェックリスト ----------
  var CHECK_SVG = '<svg viewBox="0 0 20 20"><path d="M4 10.5 L8.3 14.5 L16 5.5"/></svg>';
  function openCheck(li, focusRow) {
    cur = li;
    mode = 'check';
    data.last = LISTS[li].id; save();
    resetArmed = false;
    buildRows();
    if (typeof focusRow === 'number') rowIdx = Math.min(focusRow, rows.length - 1);
    else rowIdx = firstUnchecked(0);
    show('check');
    el('check-hint').textContent = '↑↓ えらぶ　タップ チェック';
    renderRows(true); updateSide(false);
  }
  function openEdit() {
    mode = 'edit';
    resetArmed = false;
    buildRows();
    rowIdx = 0;
    el('check-hint').textContent = '↑↓ えらぶ　タップ 表示／かくす';
    renderRows(true); updateSide(false);
  }
  function buildRows() {
    rows = [];
    var L = LISTS[cur];
    if (mode === 'edit') {
      rows.push({ t: 'act', label: '✓ 編集おわり', act: function () { openCheck(cur, 0); } });
      for (var i = 0; i < L.items.length; i++) rows.push({ t: 'edit', i: i });
      rows.push({ t: 'act', label: '👁 すべて表示にもどす', act: showAll });
    } else {
      rows.push({ t: 'act', label: '← リスト一覧へ', act: function () { openLists(cur + 1); } });
      var v = visibleItems(cur);
      for (var k = 0; k < v.length; k++) rows.push({ t: 'item', i: v[k] });
      rows.push({ t: 'act', id: 'reset', label: '↺ チェックをリセット', act: armReset });
      rows.push({ t: 'act', label: '✎ 項目をかくす（編集）', act: openEdit });
    }
  }
  function firstUnchecked(from) {
    for (var k = 0; k < rows.length; k++) {
      var j = (from + k) % rows.length, r = rows[j];
      if (r.t === 'item' && !isChecked(cur, r.i)) return j;
    }
    // ぜんぶチェック済みなら最初の項目
    for (k = 0; k < rows.length; k++) if (rows[k].t === 'item') return k;
    return 0;
  }
  function renderRows(full) {
    var box = el('rows');
    if (full) {
      box.innerHTML = '';
      rows.forEach(function (r, j) {
        var d = document.createElement('div');
        r.node = d;
        d.addEventListener('click', function () { rowIdx = j; renderRows(); activate(); });
        box.appendChild(d);
        paintRow(r);
      });
    }
    rows.forEach(function (r, j) { r.node.classList.toggle('cur', j === rowIdx); });
    // スクロール（カーソルを中央付近に）
    var RH = 56, VH = 520, total = rows.length * RH + 8;
    var off = rowIdx * RH - (VH / 2 - RH / 2);
    off = Math.max(0, Math.min(off, Math.max(0, total - VH)));
    box.style.transform = 'translateY(' + (-off) + 'px)';
  }
  function paintRow(r) {
    var d = r.node, L = LISTS[cur];
    var isCur = d.classList.contains('cur');
    if (r.t === 'act') {
      d.className = 'row act' + (r.id === 'reset' && resetArmed ? ' danger' : '');
      d.innerHTML = '<span class="label">' + (r.id === 'reset' && resetArmed ? 'もう一度タップでリセット' : r.label) + '</span>';
    } else if (r.t === 'item') {
      d.className = 'row' + (isChecked(cur, r.i) ? ' done' : '');
      d.innerHTML = '<div class="box">' + CHECK_SVG + '</div><span class="label">' + L.items[r.i] + '</span>';
    } else {
      var h = isHidden(cur, r.i);
      d.className = 'row' + (h ? ' hid' : '');
      d.innerHTML = '<span class="eye">' + (h ? '🙈' : '👁') + '</span><span class="label">' + L.items[r.i] + '</span><span class="vis">' + (h ? 'かくす' : '表示') + '</span>';
    }
    if (isCur) d.classList.add('cur');
  }
  function updateSide(bump) {
    var L = LISTS[cur], p = progress(cur), full = p.total > 0 && p.done === p.total;
    el('side-emoji').textContent = L.emoji;
    el('side-name').textContent = L.name;
    el('ring-done').textContent = p.done;
    el('ring-total').textContent = '/' + p.total;
    var C = 414.69;
    el('ring-fg').style.strokeDashoffset = String(C * (1 - (p.total ? p.done / p.total : 0)));
    el('ring-wrap').classList.toggle('full', full);
    var sub = el('side-sub');
    if (mode === 'edit') { sub.textContent = '編集モード'; sub.className = ''; }
    else if (full) { sub.textContent = 'ぜんぶOK！'; sub.className = 'ok'; }
    else { sub.textContent = 'あと ' + (p.total - p.done) + ' こ'; sub.className = ''; }
    el('side-hid').textContent = p.hidden ? 'かくし中の項目 ' + p.hidden + ' こ' : '';
    if (bump) {
      var n = el('ring-num');
      n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
    }
    if (mode === 'edit') setHud(L.emoji + ' ' + L.name, '編集モード', 'edit');
    else setHud(L.emoji + ' ' + L.name);
  }

  function activate() {
    var r = rows[rowIdx];
    if (!r) return;
    if (r.t === 'act') { r.act(); return; }
    if (r.t === 'item') toggleCheck(r);
    else toggleHidden(r);
  }
  function toggleCheck(r) {
    var was = isChecked(cur, r.i);
    setIn(data.checked, cur, r.i, !was);
    save();
    paintRow(r);
    if (!was) {
      r.node.classList.add('pop', 'flash');
      setTimeout(function () { if (r.node) r.node.classList.remove('pop', 'flash'); }, 520);
      sparkle(r.node);
    }
    updateSide(true);
    var p = progress(cur);
    if (!was && p.done === p.total) {
      setTimeout(openDone, 520);
      return;
    }
    if (!was) {
      var from = rowIdx;
      setTimeout(function () {
        if (mode !== 'check' || rowIdx !== from) return;
        rowIdx = firstUnchecked(from);
        renderRows();
      }, 170);
    }
  }
  function toggleHidden(r) {
    var h = isHidden(cur, r.i);
    if (!h && visibleItems(cur).length <= 1) { toast('1つは表示しておいてください'); return; }
    setIn(data.hidden, cur, r.i, !h);
    save();
    paintRow(r);
    updateSide(false);
  }
  function showAll() {
    data.hidden[LISTS[cur].id] = [];
    save();
    rows.forEach(function (r) { if (r.t === 'edit') paintRow(r); });
    updateSide(false);
    toast('すべて表示にもどしました');
  }
  function armReset() {
    var r = rows[rowIdx];
    if (!resetArmed) {
      resetArmed = true;
      paintRow(r);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { resetArmed = false; if (mode === 'check') rows.forEach(function (x) { if (x.id === 'reset') paintRow(x); }); }, 2800);
      return;
    }
    resetArmed = false;
    clearTimeout(resetTimer);
    data.checked[LISTS[cur].id] = [];
    save();
    rows.forEach(function (x) { paintRow(x); });
    rowIdx = firstUnchecked(0);
    renderRows();
    updateSide(false);
    toast('チェックをリセットしました');
  }

  // ---------- 完了 ----------
  function openDone() {
    if (mode !== 'check') return;
    mode = 'done'; menuEl = 'done-list'; menuIdx = 0;
    var L = LISTS[cur], p = progress(cur);
    el('done-title').textContent = 'ぜんぶOK！';
    el('done-sub').textContent = L.emoji + ' ' + L.name + '　' + p.total + '/' + p.total + '　' + L.msg;
    menuItems = [
      { label: 'リスト一覧へ', act: function () { openLists(cur + 1); } },
      { label: '← リストを見る', act: function () { openCheck(cur, 0); } },
      { label: '↺ リセットしてもう一度', act: function () { data.checked[L.id] = []; save(); openCheck(cur); } }
    ];
    show('done', 'check'); renderList();
    confetti();
  }

  // ---------- エフェクト（Canvas） ----------
  var fx = el('fx'), ctx = fx.getContext('2d'), parts = [], fxRunning = false;
  var COLORS = ['#5ef0a0', '#7ce7ff', '#ffd166', '#ff9bd2', '#ffffff'];
  function sparkle(node) {
    var box = node.querySelector('.box');
    if (!box) return;
    var a = el('app').getBoundingClientRect(), b = box.getBoundingClientRect();
    var x = b.left - a.left + b.width / 2, y = b.top - a.top + b.height / 2;
    for (var i = 0; i < 14; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
      parts.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.05, life: 1, dec: 0.03 + Math.random() * 0.02, r: 2 + Math.random() * 2.5, c: COLORS[i % 2], sq: false });
    }
    runFx();
  }
  function confetti() {
    for (var i = 0; i < 140; i++) {
      var left = i % 2 === 0;
      parts.push({
        x: left ? -10 : 610, y: 380 + Math.random() * 120,
        vx: (left ? 1 : -1) * (4 + Math.random() * 7), vy: -(7 + Math.random() * 8),
        g: 0.22, life: 1, dec: 0.006 + Math.random() * 0.006, r: 3 + Math.random() * 4,
        c: COLORS[Math.floor(Math.random() * COLORS.length)], sq: true, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4
      });
    }
    runFx();
  }
  function runFx() {
    if (fxRunning) return;
    fxRunning = true;
    requestAnimationFrame(stepFx);
  }
  function stepFx() {
    ctx.clearRect(0, 0, 600, 600);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.life -= p.dec;
      if (p.life <= 0 || p.y > 640) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.fillStyle = p.c;
      if (p.sq) {
        p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(stepFx);
    else { fxRunning = false; ctx.clearRect(0, 0, 600, 600); }
  }

  // ---------- 入力 ----------
  function move(dir) {
    if (!menuItems.length) return;
    menuIdx = (menuIdx + dir + menuItems.length) % menuItems.length;
    renderList();
  }
  function rowMove(dir) {
    rowIdx = (rowIdx + dir + rows.length) % rows.length;
    renderRows();
  }
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'].indexOf(k) < 0) return;
    e.preventDefault();
    if (k === ' ') k = 'Enter';
    if (mode === 'lists') {
      if (k === 'ArrowRight') gridMove(1, 0);
      else if (k === 'ArrowLeft') gridMove(-1, 0);
      else if (k === 'ArrowDown') gridMove(0, 1);
      else if (k === 'ArrowUp') gridMove(0, -1);
      else if (k === 'Enter') { if (gridIdx === 0) openTitle(); else openCheck(gridIdx - 1); }
      else if (k === 'Escape') openTitle();
      return;
    }
    if (mode === 'check' || mode === 'edit') {
      if (k === 'ArrowUp' || k === 'ArrowLeft') rowMove(-1);
      else if (k === 'ArrowDown' || k === 'ArrowRight') rowMove(1);
      else if (k === 'Enter') activate();
      else if (k === 'Escape') { if (mode === 'edit') openCheck(cur, 0); else openLists(cur + 1); }
      return;
    }
    // リスト画面（title / done / howto）
    if (k === 'ArrowUp' || k === 'ArrowLeft') move(-1);
    else if (k === 'ArrowDown' || k === 'ArrowRight') move(1);
    else if (k === 'Enter') menuItems[menuIdx].act();
    else if (k === 'Escape') {
      if (mode === 'done') openCheck(cur, 0);
      else if (mode === 'howto') (howtoFrom === 'lists' ? openLists : openTitle)();
    }
  });

  // 時計を更新
  setInterval(function () {
    if (mode === 'lists' || mode === 'check') el('hud-right').textContent = clock();
  }, 10000);

  // ---------- 起動 ----------
  load();
  openTitle();
})();
