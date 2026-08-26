import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle toàn bộ dependency ngay khi khởi động dev server.
    // Nếu thiếu, Vite phát hiện dep mới giữa phiên và phải re-optimize:
    // lúc đó nó rename node_modules/.vite/deps -> deps_temp_*, và trên Windows
    // thao tác rename này bị EPERM nếu thư mục đang bị khóa (antivirus/OneDrive/
    // file watcher hoặc một dev server khác đang chạy song song).
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'jspdf',
      'lucide-react',
    ],
  },
  server: {
    watch: {
      // Không theo dõi cache/output để giảm khóa file trên Windows.
      ignored: ['**/node_modules/.vite/**', '**/dist/**'],
    },
  },
  test: {
    // jsdom cung cấp crypto.randomUUID và document cho các hàm trong lib.ts.
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})