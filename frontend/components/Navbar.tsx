"use client"

import { Button } from "@/components/ui/button"
import { Gamepad2, Trophy, Zap, Users, LogOut, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Navbar() {
  const router = useRouter()
  const [username, setUsername] = useState<string>("")

  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [])

  function logoutHandler() {
    localStorage.removeItem("Authorization")
    localStorage.removeItem("username")
    router.push("/")
  }

  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 shadow-sm">
      {/* Logo */}
      <Link className="flex items-center justify-center pr-100" href="/">
        <Gamepad2 className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-2xl font-bold text-slate-900">QuizBattle</span>
      </Link>

      {/* Navigation Links */}
      <nav className="ml-1 flex gap-3">
        <Link href="/dashboard/my-games">
          <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 font-medium px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            My Games
          </Button>
        </Link>
        <Link href="/dashboard/my-requests">
          <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 font-medium px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            My Requests
          </Button>
        </Link>
        <Link href="/dashboard/active-games">
          <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 font-medium px-4 py-2">
            <Zap className="w-4 h-4 mr-2" />
            Active Games
          </Button>
        </Link>

        <Link href="/dashboard/player-requests">
          <Button variant="ghost" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 font-medium px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            Player Requests
          </Button>
        </Link>
      </nav>

      {/* Right Side - Username and Logout */}
      <div className="ml-auto flex items-center gap-3">
        {username && (
          <div className="flex items-center text-slate-700 font-medium px-3 py-2 bg-slate-50 rounded-md">
            <User className="w-4 h-4 mr-2" />
            <span>{username}</span>
          </div>
        )}

        <Button
          variant="ghost"
          className="text-slate-700 hover:text-red-600 hover:bg-red-50 font-medium px-4 py-2"
          onClick={logoutHandler}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  )
}
