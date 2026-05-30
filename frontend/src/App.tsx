import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Chat from './pages/Chat'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route path="/login" element={<Login />} />
        
        {/* DM: /channels/@me/:internalUserId */}
        <Route path="/channels/@me/:internalUserId" element={<Chat />} />
        
        {/* テキストチャンネル: /channels/chat/:internalChannelId */}
        <Route path="/channels/chat/:internalChannelId" element={<Chat />} />
        
        {/* VC: /channels/vc/:internalChannelId */}
        <Route path="/channels/vc/:internalChannelId" element={<Chat />} />

        {/* デフォルト: 最初のテキストチャンネルにリダイレクト */}
        <Route path="/channels" element={<Navigate to="/channels/chat/10000000000000000001" replace />} />
        <Route path="/channels/*" element={<Navigate to="/channels/chat/10000000000000000001" replace />} />

        {/* 旧ルートからの移行 */}
        <Route path="/chat" element={<Navigate to="/channels/chat/10000000000000000001" replace />} />
        <Route path="/chat/*" element={<Navigate to="/channels/chat/10000000000000000001" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App