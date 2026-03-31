/**
 * 全局 message 工具 —— 通过 antd App.useApp() 注入，避免静态调用警告。
 * 使用方式：
 *   import message from '@/utils/message';
 *   message.success('操作成功');
 */
import type { MessageInstance } from 'antd/es/message/interface';

let _instance: MessageInstance | null = null;

export function setMessageInstance(instance: MessageInstance): void {
  _instance = instance;
}

const message = {
  success: (...args: Parameters<MessageInstance['success']>) => _instance?.success(...args),
  error: (...args: Parameters<MessageInstance['error']>) => _instance?.error(...args),
  warning: (...args: Parameters<MessageInstance['warning']>) => _instance?.warning(...args),
  info: (...args: Parameters<MessageInstance['info']>) => _instance?.info(...args),
  loading: (...args: Parameters<MessageInstance['loading']>) => _instance?.loading(...args),
  open: (...args: Parameters<MessageInstance['open']>) => _instance?.open(...args),
  destroy: (key?: string | number) => _instance?.destroy(key),
};

export default message;
