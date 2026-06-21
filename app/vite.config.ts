import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// 완전 로컬 데스크톱 보조 SW.
// 웹(브라우저) + 데스크톱(Tauri) 양쪽에서 동일한 프론트엔드를 사용한다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Tauri: 콘솔을 지우지 않고, 고정 포트를 사용하며, Rust 소스 변경은 감시에서 제외
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
