import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/socket'
import './Login.css'

export default function Login() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ accountId: userId, password }),
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('accountId', data.profile.accountId)
      localStorage.setItem('internalId', data.profile.internalId)
      localStorage.setItem('displayName', data.profile.displayName || data.profile.firstName)
      navigate('/channels')
    } catch (err: any) {
      setError(err.message || 'ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <p className="page-subtitle">(元はまちりんぐちゃっと)</p>
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">はまちりんぐちゃっと にログイン</h1>
        
        {error && <p style={{ color: '#f87171', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{error}</p>}

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