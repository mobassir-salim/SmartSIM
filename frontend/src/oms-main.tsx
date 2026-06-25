import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import OMSApp from './OMSApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OMSApp />
  </StrictMode>,
)
