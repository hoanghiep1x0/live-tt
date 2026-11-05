import { describe, expect, it } from 'vitest';
import { doanGiaoThuc, tenGiaoThuc } from '@live/stage-sdk';

describe('đoán giao thức của kết nối AI', () => {
  it('khoá mở đầu sk-ant- là Anthropic, dù địa chỉ trỏ đâu', () => {
    expect(doanGiaoThuc('', 'sk-ant-api03-abc')).toBe('anthropic');
    expect(doanGiaoThuc('http://localhost:20128/v1', 'sk-ant-api03-abc')).toBe('anthropic');
    expect(doanGiaoThuc('', '  sk-ant-xyz  ')).toBe('anthropic');
  });

  it('địa chỉ có chữ anthropic là Anthropic — cổng trung chuyển chạy trên máy', () => {
    expect(doanGiaoThuc('https://api.anthropic.com', 'sk-gi-do')).toBe('anthropic');
    expect(doanGiaoThuc('http://127.0.0.1:8080/anthropic', 'abc')).toBe('anthropic');
    expect(doanGiaoThuc('HTTPS://API.ANTHROPIC.COM', 'abc')).toBe('anthropic');
  });

  it('để trống địa chỉ là Anthropic: nhà kiểu OpenAI luôn phải dán /v1', () => {
    expect(doanGiaoThuc('', 'abc')).toBe('anthropic');
    expect(doanGiaoThuc('   ', 'abc')).toBe('anthropic');
  });

  it('còn lại là kiểu OpenAI', () => {
    expect(doanGiaoThuc('https://api.openai.com/v1', 'sk-proj-abc')).toBe('openai');
    expect(doanGiaoThuc('http://localhost:20128/v1', 'abc')).toBe('openai');
    expect(doanGiaoThuc('https://openrouter.ai/api/v1', 'sk-or-abc')).toBe('openai');
  });

  it('tên hiện cho người đọc', () => {
    expect(tenGiaoThuc('anthropic')).toBe('Kiểu Anthropic');
    expect(tenGiaoThuc('openai')).toBe('Kiểu OpenAI');
  });
});
