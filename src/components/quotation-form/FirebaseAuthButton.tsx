'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { auth, provider } from '@/firebase/firebaseConfig'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'

export default function FirebaseAuthButton() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsub()
  }, [])

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Error signing in with Google', error)
      alert('Đăng nhập thất bại.')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out', error)
      alert('Đăng xuất thất bại.')
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Xin chào, {user.displayName}</span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Đăng xuất
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn}>
      Đăng nhập Google
    </Button>
  )
}
