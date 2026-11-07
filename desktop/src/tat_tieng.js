// Live Studio — nạp vào tab trang live của kênh (`kenh-<nick>`) trước mọi script của trang (initialization_script,
// xem `trinh_duyet::script_nap_san`). Tab này chỉ để MC gõ chát: tắt tiếng mọi video / âm thanh của trang, kể cả
// luồng live của chính kênh — không thì lời MC vang lại trễ vài giây, LIVE Studio thu tiếng máy là dội ngược vào
// live, người xem nghe lặp giọng. Cùng cách tắt tiếng với `capture.js` (bản cũ D:\Live\desktop).
(function () {
  if (window.top !== window || window.__tnTatTieng) return;
  if (!/(^|\.)tiktok\.com$/i.test(location.hostname)) return;
  window.__tnTatTieng = true;

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
  // Trang (hay người bấm) bật tiếng lại: tắt ngay.
  document.addEventListener(
    'volumechange',
    function (e) {
      var m = e.target;
      if (m instanceof HTMLMediaElement && (!m.muted || m.volume > 0)) mute(m);
    },
    true,
  );
  document.addEventListener(
    'play',
    function (e) {
      if (e.target instanceof HTMLMediaElement) mute(e.target);
    },
    true,
  );
  // Tiếng phát qua Web Audio (không qua thẻ video): giữ AudioContext ở trạng thái dừng.
  if (window.AudioContext) {
    var NativeAudioContext = window.AudioContext;
    window.AudioContext = function () {
      var ctx = new (Function.prototype.bind.apply(NativeAudioContext, [null].concat([].slice.call(arguments))))();
      try {
        ctx.suspend();
      } catch (e) {
        /* bỏ qua */
      }
      ctx.resume = function () {
        return Promise.resolve();
      };
      return ctx;
    };
    window.AudioContext.prototype = NativeAudioContext.prototype;
  }
})();
