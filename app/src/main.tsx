import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './state'
import './styles.css'

// 저장 영속성 요청 (NFR-08 하드닝) — 브라우저/웹뷰의 스토리지 eviction 방지.
// 진료 데이터(보조 사본)가 용량 압박 등으로 임의 삭제되지 않도록 한다.
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  void navigator.storage.persisted().then((p) => {
    if (!p) void navigator.storage.persist()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
