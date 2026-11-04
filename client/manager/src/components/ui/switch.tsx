import * as Primitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

interface Props {
  checked: boolean;
  onCheckedChange(on: boolean): void;
  disabled?: boolean;
  small?: boolean;
  label: string;
}

/** Công tắc.
 *
 *  Radix lo phần bàn phím và `aria-checked`; hình dáng nổi 3D nằm ở `.switch`
 *  trong index.css, trạng thái đọc qua `data-state` mà Radix tự đặt. */
export function Switch({ checked, onCheckedChange, disabled, small, label }: Props) {
  return (
    <Primitive.Root
      className={cn('switch', small && 'switch-sm')}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled === true}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
