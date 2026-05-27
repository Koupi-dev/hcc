import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    console.log('Login:', { userId, password })
    // TODO: 認証処理
    // 仮のローディング（実際の認証処理に置き換える）
    setTimeout(() => {
      setIsLoading(false)
      navigate('/chat')
    }, 2000)
  }

  return (
    <>
      <p className="page-subtitle">(元はまちりんぐちゃっと)</p>
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">はまちりんぐちゃっと にログイン</h1>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="userId">ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="IDを入力"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
            />
          </div>
          
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner"></span>
            ) : (
              'ログイン！'
            )}
          </button>
        </form>
      </div>
    </div>
    </>
  )
}