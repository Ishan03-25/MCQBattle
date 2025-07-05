"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Play, Trash2, Trophy, Users, Gamepad2, Edit, Square } from "lucide-react"
import { deleteGame, getAllMyGames, startGame, endGame } from "@/lib/api/game"
import { toastPromise, toastSuccess } from "@/utils/toast"
import Pusher from "pusher-js"

interface Game {
  id: string
  game: string
  userId: string
  players: any[]
  questions: any[]
  answers: any[]
  createdAt: string
  status: "WAITING" | "ACTIVE" | "COMPLETED" | "STARTED"
}

export default function MyGamesPage() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const subscribedChannelsRef = useRef<Set<string>>(new Set())

  const fetchMyGames = async () => {
    setLoading(true)

    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        console.error("No authorization token found.")
        return
      }

      const response = await getAllMyGames(token)
      const data = response.games
      setGames(data || [])
    } catch (error) {
      console.error("Error fetching games:", error)
    } finally {
      setLoading(false)
    }
  }

  // Initialize Pusher once
  useEffect(() => {
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      })
    }

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect()
        pusherRef.current = null
      }
    }
  }, [])

  // Subscribe to game channels when games change
  useEffect(() => {
    if (!pusherRef.current || games.length === 0) return

    // Subscribe to new game channels
    games.forEach((game) => {
      const channelName = `game-${game.id}`

      if (!subscribedChannelsRef.current.has(channelName)) {
        const channel = pusherRef.current!.subscribe(channelName)
        subscribedChannelsRef.current.add(channelName)

        channel.bind("game-started", (data: { gameId: string; status: string; startedAt: string }) => {
          console.log("Game started event received:", data)

          setGames((prevGames) =>
            prevGames.map((g) => (g.id === data.gameId ? { ...g, status: "STARTED" as const } : g)),
          )

          const gameName = games.find((g) => g.id === data.gameId)?.game
          toastSuccess(`Game "${gameName}" has been started!`)
        })

        channel.bind("game-ended", (data: { gameId: string; status: string }) => {
          console.log("Game ended event received:", data)

          setGames((prevGames) =>
            prevGames.map((g) => (g.id === data.gameId ? { ...g, status: "COMPLETED" as const } : g)),
          )

          const gameName = games.find((g) => g.id === data.gameId)?.game
          toastSuccess(`Game "${gameName}" has been completed!`)
        })
      }
    })

    // Cleanup function to unsubscribe from channels that are no longer needed
    return () => {
      const currentGameIds = new Set(games.map((game) => game.id))

      subscribedChannelsRef.current.forEach((channelName) => {
        const gameId = channelName.replace("game-", "")
        if (!currentGameIds.has(gameId) && pusherRef.current) {
          pusherRef.current.unsubscribe(channelName)
          subscribedChannelsRef.current.delete(channelName)
        }
      })
    }
  }, [games])

  useEffect(() => {
    const username = localStorage.getItem("username")
    const token = localStorage.getItem("Authorization")

    if (!token || !username) {
      router.push("/auth")
    } else {
      setAuthorized(true)
      fetchMyGames()
    }
  }, [router])

  if (authorized === null) return null

  const handleDeleteGame = async (gameId: string) => {
    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        throw new Error("Authorization token not found")
      }

      await toastPromise(deleteGame(token, gameId), {
        success: "Game Deleted",
        loading: "Deleting Game",
        error: "There is some error in deleting game",
      })

      setGames((prevGames) => prevGames.filter((game) => game.id !== gameId))
    } catch (error) {
      console.error("Error deleting game:", error)
    }
  }

  const handleStartGame = async (gameId: string) => {
    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        throw new Error("Authorization token not found")
      }

      // Optimistically update the UI
      setGames((prevGames) => prevGames.map((g) => (g.id === gameId ? { ...g, status: "STARTED" as const } : g)))

      await startGame(token, gameId)
      toastSuccess("Game started successfully!")
    } catch (error) {
      console.error("Error starting game:", error)
      // Revert optimistic update on error
      fetchMyGames()
    }
  }

  const handleEndGame = async (gameId: string) => {
    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        throw new Error("Authorization token not found")
      }

      // Optimistically update the UI
      setGames((prevGames) => prevGames.map((g) => (g.id === gameId ? { ...g, status: "COMPLETED" as const } : g)))

      await endGame(token, gameId)
      toastSuccess("Game ended successfully!")
    } catch (error) {
      console.error("Error ending game:", error)
      // Revert optimistic update on error
      fetchMyGames()
    }
  }

  const handleEditGame = (gameId: string) => {
    router.push(`/dashboard/edit-games/${gameId}`)
  }

  const handleCreateGame = () => {
    router.push("/dashboard/create-game")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "STARTED":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
          text: "started",
        }
      case "ACTIVE":
        return {
          variant: "default" as const,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
          text: "active",
        }
      case "COMPLETED":
        return {
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
          text: "completed",
        }
      default:
        return {
          variant: "outline" as const,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
          text: "waiting",
        }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Trophy className="h-6 w-6 text-blue-600 mr-2" />
              My Games
            </h1>
            <p className="text-slate-600 mt-1">Manage and play your QuizBattle games</p>
          </div>
          <Button onClick={handleCreateGame} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2">
            <Plus className="w-4 h-4 mr-2" />
            Create New Game
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200 shadow-sm">
            <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Games Yet!</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              You haven't created any quiz games yet. Start your first game and challenge your friends!
            </p>
            <Button
              onClick={handleCreateGame}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Game
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const statusBadge = getStatusBadge(game.status)

              return (
                <Card
                  key={game.id}
                  className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-slate-900 text-lg mb-1 line-clamp-2">{game.game}</CardTitle>
                        <CardDescription className="text-slate-600">
                          Created on {new Date(game.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={statusBadge.variant} className={`ml-2 ${statusBadge.className}`}>
                        {statusBadge.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-slate-600">
                        <Users className="w-4 h-4 mr-2 text-slate-500" />
                        {game.players.length} players
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Trophy className="w-4 h-4 mr-2 text-slate-500" />
                        {game.questions.length} questions
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {game.status === "STARTED" ? (
                        <Button
                          onClick={() => handleEndGame(game.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          End Game
                        </Button>
                      ) : game.status === "COMPLETED" ? (
                        <Button
                          onClick={() => router.push(`/leaderboard/${game.id}`)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          View Results
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleStartGame(game.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Game
                        </Button>
                      )}

                      <Button
                        onClick={() => handleEditGame(game.id)}
                        variant="outline"
                        size="icon"
                        className="border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        disabled={game.status === "STARTED"}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            disabled={game.status === "STARTED"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white border-slate-200">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Game</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{game.game}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteGame(game.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
