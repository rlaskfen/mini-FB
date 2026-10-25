import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// 한글 글꼴. dynamic-subset은 화면에 쓰인 글자 조각만 내려받아서 가볍다
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
