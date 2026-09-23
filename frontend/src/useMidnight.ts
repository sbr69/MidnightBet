import { useContext } from 'react';
import { MidnightContext } from './midnight-context';

export function useMidnight() {
  const context = useContext(MidnightContext);
  if (!context) {
    throw new Error('useMidnight must be used within a MidnightProvider');
  }
  return context;
}
