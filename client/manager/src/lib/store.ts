/** Trạng thái của cả trang quản lý, gom vào một chỗ.
 *
 *  Nguồn sự thật là backend, không phải state của React: mỗi hành động đi REST
 *  rồi nghe backend phát xuống qua WebSocket. Mở hai cửa sổ quản lý thì cả hai
 *  thấy cùng một thứ, và thiết kế đang chạy cũng vậy.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DesignInfo, Json } from '@live/contracts';
import type { SessionView } from '@live/contracts';
import { api, ApiError } from './api';
import type { ModuleState, SourceKind, SourceStatus } from './api';
import { connect } from './ws';

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
  doiNguon(kind: SourceKind): void;
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
          const { source } = await api.setSource({ kind });
          setNguon(source);
          noi(kind === 'tat' ? 'Đã tắt nguồn sự kiện' : 'Đã đổi nguồn sự kiện');
        } catch (e) {
          bat(e);
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
    doiNguon,
  };
}
