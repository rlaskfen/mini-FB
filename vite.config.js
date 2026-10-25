import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' → Vercel/Netlify/GitHub Pages 어디에 올려도 상대경로로 동작
export default defineConfig({
  plugins: [react()],
  base: './',
  // OneDrive 폴더는 모든 폴더가 reparse point라서 Vite가 심볼릭 링크로 오인해 node_modules를 못 찾는다.
  // 링크 해석을 끄면 해결된다. (프로젝트를 OneDrive 밖으로 옮기면 필요 없음)
  resolve: { preserveSymlinks: true },
})
