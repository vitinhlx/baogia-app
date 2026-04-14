'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { auth, provider } from '@/firebase/firebaseConfig'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { LogIn, LogOut, User as UserIcon } from 'lucide-react'

interface FirebaseAuthButtonProps {
  variant?: 'header' | 'footer'
}

export default function FirebaseAuthButton({ variant = 'footer' }: FirebaseAuthButtonProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsub()
  }, [])

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Error signing in with Google', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out', error)
    }
  }

  // Header variant — compact avatar + name
  if (variant === 'header') {
    if (user) {
      return (
        <div className="flex items-center gap-2 print:hidden">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || ''}
              className="w-8 h-8 rounded-full border-2 border-emerald-400 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-emerald-600" />
            </div>
          )}
          <span className="text-sm font-medium text-slate-700 hidden sm:inline max-w-[120px] truncate">
            {user.displayName}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1 px-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </Button>
        </div>
      )
    }
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignIn}
        disabled={isLoading}
        className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 print:hidden"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l-3 3-5-3z" />
          </svg>
        ) : (
          <LogIn className="w-4 h-4" />
        )}
        Đăng nhập
      </Button>
    )
  }

  // Footer variant — original style but improved
  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || ''}
            className="w-6 h-6 rounded-full border border-emerald-400"
            referrerPolicy="no-referrer"
          />
        ) : (
          <UserIcon className="w-4 h-4 text-emerald-600" />
        )}
        <span className="text-xs text-slate-600 hidden md:inline truncate max-w-[100px]">{user.displayName}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-slate-500 hover:text-red-600 px-2">
          <LogOut className="w-3 h-3 mr-1" />
          Thoát
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn} disabled={isLoading} className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50">
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l-3 3-5-3z" />
        </svg>
      ) : (
        <LogIn className="w-4 h-4" />
      )}
      Đăng nhập
    </Button>
  )
}
