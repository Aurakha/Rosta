'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('ROSTA ServiceWorker registration successful with scope: ', reg.scope);
          })
          .catch((err) => {
            console.warn('ROSTA ServiceWorker registration failed: ', err);
          });
      });
    }
  }, []);

  return null;
}
