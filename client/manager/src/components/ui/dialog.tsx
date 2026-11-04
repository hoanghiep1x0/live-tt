import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export const Dialog = Primitive.Root;

interface Props {
  /** Bề rộng: thẻ module dùng 'sm', cấu hình nhanh 'md', trình duyệt 'lg'. */
  size?: 'sm' | 'md' | 'lg';
  icon: ReactNode;
  title: string;
  desc?: string;
  children: ReactNode;
  foot?: ReactNode;
}

/** Modal dùng chung.
 *
 *  Dựng trên Radix nên có sẵn những thứ bản mẫu HTML không làm được: giam tiêu
 *  điểm bàn phím trong modal, Escape để đóng, trả tiêu điểm về nút vừa bấm. */
export function DialogBody({ size = 'sm', icon, title, desc, children, foot }: Props) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="backdrop" />
      <Primitive.Content className={cn('modal', `modal-${size}`)}>
        <div className="modal-head">
          <span className={size === 'sm' ? 'mod-icon' : 'brand-mark'}>{icon}</span>
          <div className="grow">
            <Primitive.Title asChild>
              <h2>{title}</h2>
            </Primitive.Title>
            {desc ? (
              <Primitive.Description asChild>
                <p>{desc}</p>
              </Primitive.Description>
            ) : null}
          </div>
          <Primitive.Close className="btn btn-icon btn-ghost" aria-label="Đóng">
            <X size={15} />
          </Primitive.Close>
        </div>
        <div className="modal-body">{children}</div>
        {foot ? <div className="modal-foot">{foot}</div> : null}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
