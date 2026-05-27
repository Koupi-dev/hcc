import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Chat from './pages/Chat'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route path="/login" element={<Login />} />
        
        <Route path="/chat" element={<Navigate to="/chat/rule" replace />} />
        <Route path="/chat/:channelId" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App