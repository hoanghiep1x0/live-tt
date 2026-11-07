import { lazy, Suspense } from 'react';
import type { StagePartProps } from '@live/stage-sdk';
import type { State } from './core';
import type { Config } from './manifest';

// Phần vẽ lớp học nặng (motion, 2.500 câu hỏi, CSS dựng sẵn) mà mọi thiết kế
// đều gói mọi module. Nạp lười: chỉ phòng nào thật sự vẽ lớp học mới tải chunk này.
const LopHoc = lazy(() => import('./view/LopHoc'));

export function Stage(props: StagePartProps<Config, State>) {
  return (
    <Suspense fallback={null}>
      <LopHoc {...props} />
    </Suspense>
  );
}
