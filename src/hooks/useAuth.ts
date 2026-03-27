import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

interface AuthState {
  user: User | null
  isAdmin: boolean
  loading: boolean
}

export function useAuth(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true })

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        setState({ user: null, isAdmin: false, loading: false })
        return
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.email))
        setState({ user, isAdmin: adminDoc.exists(), loading: false })
      } catch {
        setState({ user, isAdmin: false, loading: false })
      }
    })
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return { ...state, logout }
}
