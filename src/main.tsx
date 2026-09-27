import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BootGate from './components/BootGate'

// App は BootGate が Service Worker とキャッシュの準備を済ませてから読み込む（src/lib/serviceWorkerBoot.ts 参照）
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootGate />
  </StrictMode>,
)
