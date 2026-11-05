import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ProviderInfo } from '../lib/api';
import { AiKhoDialog, TAB_AI } from './AiKhoDialog';

interface Props {
  onToast(text: string, loi?: boolean): void;
}

/** Thẻ "Kết nối AI" ở tab Tính năng chung — tính năng chung duy nhất: mọi loại
 *  phòng cùng dùng một kho khoá. Bấm thẻ mở đúng hộp kho AI của thanh trên. */
export function KetNoiAiCard({ onToast }: Props) {
  const [ds, setDs] = useState<ProviderInfo[] | null>(null);

  useEffect(() => {
    api.secrets().then(
      (kq) => setDs(kq.providers),
      () => setDs([]),
    );
  }, []);

  const dung = TAB_AI.filter((t) => ds?.some((p) => p.uses.includes(t.id)) === true);

  return (
    <article className="card mod" data-bat={ds !== null && ds.length > 0}>
      <AiKhoDialog
        onToast={onToast}
        onDoi={setDs}
        trigger={<button type="button" className="mod-hit" aria-label="Mở Kết nối AI" />}
      />

      <div className="mod-top">
        <span className="mod-icon">🤖</span>
        <div className="mod-text">
          <b>Kết nối AI</b>
          <span>Khoá và model AI dùng chung cho mọi phòng</span>
        </div>
      </div>

      <div className="hooks">
        <span className="q-lbl">
          {ds === null ? 'Đang đọc…' : ds.length === 0 ? 'Chưa có kết nối' : `${ds.length} kết nối`}
        </span>
        {dung.map((t) => (
          <span className="hook" key={t.id}>
            {t.ten}
          </span>
        ))}
      </div>
    </article>
  );
}
