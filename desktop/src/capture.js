// Live Studio — nạp vào tab trang live của kênh (`kenh-<nick>`) trong hộp Trình duyệt của app, trước mọi script
// của trang (initialization_script, xem `live_tiktok.rs`). Chép lại khung "webcast" mà chính trang nhận —
// WebSocket /webcast/im/push và phản hồi HTTP /webcast/im/fetch — vào một hàng đợi nhỏ. Vỏ Rust đọc hàng đợi bằng
// eval (window.__tnLive.drain(), lệnh `kenh_rut`); trang quản lý giải mã (`client/manager/src/lib/tiktok-khung.ts`)
// rồi đẩy vào máy chủ (nguồn `webview`). Trang không có quyền gọi gì của app. Chép từ bản cũ (D:\Live\desktop).
(function () {
  if (window.top !== window || window.__tnLive) return;
  // Tab có thể bấm sang trang khác: chỉ chép trên chính TikTok.
  if (!/(^|\.)tiktok\.com$/i.test(location.hostname)) return;
  var MAX = 400;
  var queue = [];
  var sockets = 0;

  function toBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var text = '';
    for (var i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(text);
  }
  function push(kind, buffer) {
    try {
      if (queue.length >= MAX) queue.shift();
      queue.push({ k: kind, b: toBase64(buffer) });
    } catch (e) {
      /* khung hỏng: bỏ */
    }
  }
  var isWebcast = function (url) {
    var u = String(url || '');
    return /webcast/i.test(u) && /\/im\//i.test(u);
  };

  // Trang này chỉ để đọc sự kiện: tắt tiếng mọi video / âm thanh của trang (kể cả luồng live của chính kênh) —
  // không thì nghe lặp lại lời MC trễ vài giây, và LIVE Studio thu tiếng app sẽ dội ngược tiếng vào live.
  function mute(m) {
    try {
      m.muted = true;
      m.volume = 0;
    } catch (e) {
      /* bỏ qua */
    }
  }
  var nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    mute(this);
    return nativePlay.apply(this, arguments);
  };
  document.addEventListener(
    'volumechange',
    function (e) {
      var m = e.target;
      if (m instanceof HTMLMediaElement && (!m.muted || m.volume > 0)) mute(m);
    },
    true,
  );
  document.addEventListener('play', function (e) { if (e.target instanceof HTMLMediaElement) mute(e.target); }, true);
  if (window.AudioContext) {
    var NativeAudioContext = window.AudioContext;
    window.AudioContext = function () {
      var ctx = new (Function.prototype.bind.apply(NativeAudioContext, [null].concat([].slice.call(arguments))))();
      try { ctx.suspend(); } catch (e) { /* bỏ qua */ }
      ctx.resume = function () { return Promise.resolve(); };
      return ctx;
    };
    window.AudioContext.prototype = NativeAudioContext.prototype;
  }

  var NativeWebSocket = window.WebSocket;
  function CapturingWebSocket(url, protocols) {
    var ws = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
    if (isWebcast(url)) {
      sockets++;
      ws.addEventListener('message', function (e) {
        var data = e.data;
        if (data instanceof ArrayBuffer) push('ws', data);
        else if (data instanceof Blob) data.arrayBuffer().then(function (b) { push('ws', b); });
      });
      ws.addEventListener('close', function () { sockets = Math.max(0, sockets - 1); });
    }
    return ws;
  }
  CapturingWebSocket.prototype = NativeWebSocket.prototype;
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { CapturingWebSocket[k] = NativeWebSocket[k]; });
  window.WebSocket = CapturingWebSocket;

  var nativeFetch = window.fetch;
  window.fetch = function (input) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var pending = nativeFetch.apply(this, arguments);
    if (/webcast\/im\/fetch/i.test(url)) {
      pending.then(function (res) {
        res.clone().arrayBuffer().then(function (b) { push('fetch', b); }).catch(function () {});
      }).catch(function () {});
    }
    return pending;
  };

  // Trạng thái phòng live của kênh (2 = đang live, 4 = đã kết thúc) — hỏi chính API của trang mỗi 20 giây,
  // để app biết ngay lúc kênh lên live thay vì tải lại trang mù mỗi 90 giây.
  var liveStatus = null;
  function pollStatus() {
    var m = location.pathname.match(/^\/@([^/]+)\/live/);
    if (!m) return;
    nativeFetch('/api-live/user/room/?aid=1988&sourceType=54&uniqueId=' + encodeURIComponent(m[1]), { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var room = d && d.data && d.data.liveRoom;
        liveStatus = room && typeof room.status === 'number' ? room.status : null;
      })
      .catch(function () {});
  }
  setTimeout(pollStatus, 3000);
  setInterval(pollStatus, 20000);

  window.__tnLive = {
    drain: function () {
      var frames = queue;
      queue = [];
      return JSON.stringify({ frames: frames, sockets: sockets, url: location.href, live: liveStatus });
    },
  };
})();
