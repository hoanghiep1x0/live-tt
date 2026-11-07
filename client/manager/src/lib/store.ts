/** Trạng thái của cả trang quản lý, gom vào một chỗ.
 *
 *  Nguồn sự thật là backend, không phải state của React: mỗi hành động đi REST
 *  rồi nghe backend phát xuống qua WebSocket. Mở hai cửa sổ quản lý thì cả hai
 *  thấy cùng một thứ, và thiết kế đang chạy cũng vậy.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DesignInfo, Json } from '@live/contracts';
import type { SessionView } from '@live/contracts';
import { api, ApiError, CAU_NOI_MAC_DINH } from './api';
import type { ModuleState, SourceKind, SourceStatus } from './api';
import { connect } from './ws';
import { docOThemTab, laApp, tabWeb } from './desktop';

/** Chờ gõ xong rồi mới ghi. Gõ một câu cảm ơn mà mỗi ký tự một lần ghi đĩa
 *  thì vừa tốn vừa làm thiết kế đang live nhận cấu hình nửa vời. */
const CHO_GHI_MS = 350;
const TOAST_MS = 2400;

export interface Toast {
  text: string;
  loi: boolean;
}

export interface Manager {
  designs: DesignInfo[];
  live: string | null;
  mods: Record<string, ModuleState>;
  /** Phiên đang chạy, do backend giữ. `null` khi chưa phát phòng nào. */
  phien: SessionView | null;
  nguon: SourceStatus | null;
  dangTai: boolean;
  /** Lý do không nối được backend, `null` là đang nối được. */
  mat: string | null;
  wsSong: boolean;
  toast: Toast | null;
  xoaToast(): void;
  tai(): void;
  batLive(id: string): void;
  tatLive(): void;
  doiTen(id: string, ten: string): void;
  datStudio(id: string, url: string): void;
  resetData(id: string): void;
  batModule(moduleId: string, on: boolean): void;
  luuCauHinh(moduleId: string, config: Record<string, Json>): void;
  /** Bấm nút trên thẻ module, áp vào thiết kế đang phát. */
  bamNut(moduleId: string, op: string): void;
  doiNguon(kind: SourceKind): void;
  /** Nút "Kết nối Studio": nghe kênh `nick` qua cầu nối TikTok — dữ liệu đi
   *  thẳng từ máy chủ TikTok (docs/07 §7). Trong app thì mở sẵn luôn tab trang
   *  live của kênh (ẩn, đã tắt tiếng) cho MC gõ chát vào. */
  noiKenh(nick: string): void;
}

export function useManager(): Manager {
  const [designs, setDesigns] = useState<DesignInfo[]>([]);
  const [live, setLive] = useState<string | null>(null);
  const [mods, setMods] = useState<Record<string, ModuleState>>({});
  const [phien, setPhien] = useState<SessionView | null>(null);
  const [nguon, setNguon] = useState<SourceStatus | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [mat, setMat] = useState<string | null>(null);
  const [wsSong, setWsSong] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const liveRef = useRef<string | null>(null);
  liveRef.current = live;
  const nguonRef = useRef<SourceStatus | null>(null);
  nguonRef.current = nguon;
  const hen = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const choGhi = useRef(new Set<string>());

  const noi = useCallback((text: string, loi = false) => setToast({ text, loi }), []);

  const bat = useCallback(
    (e: unknown) => {
      const m = e instanceof ApiError ? e.message : 'có lỗi lạ, xem console';
      if (e instanceof ApiError && e.status === 0) setMat(m);
      noi(m, true);
    },
    [noi],
  );

  const taiModule = useCallback(async (designId: string | null) => {
    if (designId === null) {
      setMods({});
      return;
    }
    const { modules } = await api.modules(designId);
    setMods(modules);
  }, []);

  const tai = useCallback(() => {
    setDangTai(true);
    void (async () => {
      try {
        const ds = await api.designs();
        setDesigns(ds.designs);
        setLive(ds.live);
        await taiModule(ds.live);
        const [p, n] = await Promise.all([api.session(), api.source()]);
        setPhien(p.session);
        setNguon(n.source);
        setMat(null);
      } catch (e) {
        bat(e);
      } finally {
        setDangTai(false);
      }
    })();
  }, [bat, taiModule]);

  useEffect(tai, [tai]);

  // Nghe backend phát xuống. Không tự đoán: bấm xong thì chờ backend nói.
  useEffect(
    () =>
      connect({
        trangThai: setWsSong,
        tin(d) {
          if (d.t === 'live') {
            setLive(d.designId);
            // Danh sách thiết kế mang cả trạng thái phát, nên phải nạp lại.
            void (async () => {
              try {
                const ds = await api.designs();
                setDesigns(ds.designs);
                await taiModule(d.designId);
              } catch {
                // Mất mạng thì lớp hiện trạng đã báo, không cần toast thêm.
              }
            })();
          } else if (d.t === 'source') {
            // Đang nối → đang nhận, lỗi nguồn… đổi tức thì, không đợi tải lại.
            setNguon(d.source);
          } else if ('designId' in d && d.designId !== undefined) {
            // Tin của một phòng đang xem thử (chưa phát): của cửa sổ xem thử,
            // không phải của phòng đang phát mà trang này đang hiện.
            return;
          } else if (d.t === 'config') {
            // Đang chờ ghi của chính mình thì bỏ qua tin dội lại, nếu không ô
            // đang gõ bị nhảy về giá trị cũ.
            if (choGhi.current.has(d.moduleId)) return;
            const cfg = d.config;
            if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) return;
            setMods((p) => ({
              ...p,
              [d.moduleId]: { enabled: p[d.moduleId]?.enabled ?? false, config: cfg },
            }));
          } else if (d.t === 'modules') {
            const batList = new Set(d.enabled);
            setMods((p) => {
              const ra: Record<string, ModuleState> = {};
              for (const [k, v] of Object.entries(p)) ra[k] = { ...v, enabled: batList.has(k) };
              for (const k of d.enabled) ra[k] ??= { enabled: true, config: {} };
              return ra;
            });
          } else if (d.t === 'session') {
            setPhien(d.view);
          } else if (d.t === 'error') {
            noi(d.message, true);
          }
        },
      }),
    [noi, taiModule],
  );

  // Dọn hẹn giờ khi rời trang, để không ghi sau khi component đã tháo.
  useEffect(() => {
    const bang = hen.current;
    return () => {
      for (const t of bang.values()) clearTimeout(t);
      bang.clear();
    };
  }, []);

  useEffect(() => {
    if (toast === null) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const batLive = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await api.goLive(id);
          noi('Đã bắt đầu phát');
        } catch (e) {
          bat(e);
        }
      })();
    },
    [bat, noi],
  );

  const tatLive = useCallback(() => {
    void (async () => {
      try {
        await api.stopLive();
        noi('Đã dừng phát');
      } catch (e) {
        bat(e);
      }
    })();
  }, [bat, noi]);

  const doiTen = useCallback(
    (id: string, ten: string) => {
      void (async () => {
        try {
          await api.settings(id, { name: ten });
          tai();
          noi(`Đã đổi tên thành: ${ten}`);
        } catch (e) {
          bat(e);
        }
      })();
    },
    [bat, noi, tai],
  );

  const datStudio = useCallback(
    (id: string, url: string) => {
      void (async () => {
        try {
          await api.settings(id, { studioUrl: url.trim() === '' ? null : url });
          tai();
          noi(url.trim() === '' ? 'Đã xoá link Studio' : 'Đã lưu link Studio');
        } catch (e) {
          bat(e);
        }
      })();
    },
    [bat, noi, tai],
  );

  const resetData = useCallback(
    (id: string) => {
      void (async () => {
        try {
          const { cleared } = await api.reset(id);
          noi(cleared.length === 0 ? 'Không có dữ liệu phiên để xoá' : 'Đã xoá dữ liệu phiên');
        } catch (e) {
          bat(e);
        }
      })();
    },
    [bat, noi],
  );

  const batModule = useCallback(
    (moduleId: string, on: boolean) => {
      const designId = liveRef.current;
      if (designId === null) return;
      setMods((p) => ({
        ...p,
        [moduleId]: { enabled: on, config: p[moduleId]?.config ?? {} },
      }));
      void (async () => {
        try {
          await api.setEnabled(designId, moduleId, on);
        } catch (e) {
          bat(e);
          void taiModule(designId);
        }
      })();
    },
    [bat, taiModule],
  );

  const doiNguon = useCallback(
    (kind: SourceKind) => {
      void (async () => {
        try {
          // Gửi kèm kênh và địa chỉ đang có: chỉ gửi `{kind}` là kênh bị xoá
          // trắng mỗi lần đổi qua lại.
          const cu = nguonRef.current;
          const { source } = await api.setSource({
            kind,
            channel: cu?.channel ?? '',
            url: cu?.url ?? CAU_NOI_MAC_DINH,
          });
          setNguon(source);
          noi(kind === 'tat' ? 'Đã tắt nguồn sự kiện' : 'Đã đổi nguồn sự kiện');
        } catch (e) {
          bat(e);
        }
      })();
    },
    [bat, noi],
  );

  const noiKenh = useCallback(
    (nick: string) => {
      void (async () => {
        try {
          const { source } = await api.setSource({
            kind: 'bridge',
            channel: nick,
            url: nguonRef.current?.url ?? CAU_NOI_MAC_DINH,
          });
          setNguon(source);
          noi(`Đang nối tới live của @${nick}…`);
        } catch (e) {
          bat(e);
        }
        // Tab trang live của kênh: MC gõ chát vào đây (`desktop/src/chat_tiktok.rs`
        // chỉ tìm, không tự mở). Mở sẵn lúc bấm kết nối để khỏi phải vào hộp
        // Trình duyệt mở tay. Vỏ nạp `tat_tieng.js` cho tab kênh, nên trang
        // không phát tiếng live của chính kênh — không lặp giọng MC. Tab đã
        // mở thì vỏ để nguyên (không tải lại, không mất đăng nhập).
        const tab = laApp() ? docOThemTab(nick, Date.now()) : null;
        if (tab !== null) {
          try {
            await tabWeb.mo(tab.id, tab.url);
          } catch (e) {
            noi(`Chưa mở được trang live để chát: ${e instanceof Error ? e.message : String(e)}`, true);
          }
        }
      })();
    },
    [bat, noi],
  );

  const luuCauHinh = useCallback(
    (moduleId: string, config: Record<string, Json>) => {
      const designId = liveRef.current;
      if (designId === null) return;

      setMods((p) => ({
        ...p,
        [moduleId]: { enabled: p[moduleId]?.enabled ?? false, config },
      }));

      choGhi.current.add(moduleId);
      const cu = hen.current.get(moduleId);
      if (cu !== undefined) clearTimeout(cu);
      hen.current.set(
        moduleId,
        setTimeout(() => {
          hen.current.delete(moduleId);
          void (async () => {
            try {
              await api.setConfig(designId, moduleId, config);
            } catch (e) {
              bat(e);
              void taiModule(designId);
            } finally {
              choGhi.current.delete(moduleId);
            }
          })();
        }, CHO_GHI_MS),
      );
    },
    [bat, taiModule],
  );

  const bamNut = useCallback(
    (moduleId: string, op: string) => {
      const designId = liveRef.current;
      if (designId === null) return;
      void (async () => {
        try {
          await api.bamNut(designId, moduleId, op);
        } catch (e) {
          bat(e);
        }
      })();
    },
    [bat],
  );

  return {
    designs,
    live,
    mods,
    phien,
    nguon,
    dangTai,
    mat,
    wsSong,
    toast,
    xoaToast: useCallback(() => setToast(null), []),
    tai,
    batLive,
    tatLive,
    doiTen,
    datStudio,
    resetData,
    batModule,
    luuCauHinh,
    bamNut,
    doiNguon,
    noiKenh,
  };
}
