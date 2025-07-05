"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Gamepad2, Clock, User, UserPlus, LogIn, X } from "lucide-react"
import pusherClient from "@/lib/pusherClient"
import { toastPromise, toastSuccess, toastError } from "@/utils/toast"
import { getAllGames } from "@/lib/api/game"
import { sendPlayerRequest } from "@/lib/api/player"
import { getMyPlayerRequests } from "@/lib/api/player"

interface Player {
  id: string
  userId: string
  gameId: string
}

interface Game {
  id: string
  game: string
  userId: string
  createdAt: string
  status: "WAITING" | "ACTIVE" | "COMPLETED"
  players?: { id: string; userId: string; gameId: string }[]
  user: {
    id: string
    username: string
    email: string
    password: string
  }
}

interface PusherGameEvent {
  id: string
  game: string
  creator: string
  status: string
  createdAt: string
}

interface RequestStatus {
  [gameId: string]: "none" | "pending" | "approved" | "rejected" | "player"
}

export default function ActiveGamesPage() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [joiningGame, setJoiningGame] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>({})

  const fetchActiveGames = async () => {
    setLoading(true)

    try {
      const token = localStorage.getItem("Authorization")
      const userId = localStorage.getItem("userId")

      if (!token || !userId) {
        console.error("No authorization token or userId found.")
        return
      }

      // Fetch all games
      const response = await getAllGames()
      const data = await response

      // Filter to only show WAITING games and exclude user's own games
      const waitingGames = (data || []).filter((game: Game) => game.status === "WAITING" && game.userId !== userId)

      setGames(waitingGames)

      // Fetch user's existing requests
      const myRequestsData = await getMyPlayerRequests(token)
      const myRequests = myRequestsData || []

      // Set initial request status based on player status and existing requests
      const initialRequestStatus: RequestStatus = {}
      waitingGames.forEach((game: Game) => {
        const isPlayer = game.players?.some((player) => player.userId === userId)

        if (isPlayer) {
          initialRequestStatus[game.id] = "player"
        } else {
          // Check if user has an existing request for this game
          const existingRequest = myRequests.find((req: any) => req.gameId === game.id)

          if (existingRequest) {
            switch (existingRequest.status) {
              case "PENDING":
                initialRequestStatus[game.id] = "pending"
                break
              case "APPROVED":
                initialRequestStatus[game.id] = "approved"
                break
              case "REJECTED":
                initialRequestStatus[game.id] = "rejected"
                break
              default:
                initialRequestStatus[game.id] = "none"
            }
          } else {
            initialRequestStatus[game.id] = "none"
          }
        }
      })

      setRequestStatus(initialRequestStatus)
    } catch (error) {
      console.error("Error fetching active games:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const username = localStorage.getItem("username")
    const token = localStorage.getItem("Authorization")
    const userId = localStorage.getItem("userId")

    if (!token || !username || !userId) {
      router.push("/auth")
    } else {
      setAuthorized(true)
      setCurrentUser({ id: userId, username })
      fetchActiveGames()
    }
  }, [router])

  // Set up Pusher subscription for general game events
  useEffect(() => {
    if (!authorized || !currentUser) return

    const channel = pusherClient.subscribe("games")

    channel.bind("new-game", (newGameEvent: PusherGameEvent) => {
      if (newGameEvent.status === "WAITING") {
        // Convert Pusher event to Game format
        const newGame: Game = {
          id: newGameEvent.id,
          game: newGameEvent.game,
          userId: "", // Not provided in Pusher event
          createdAt: newGameEvent.createdAt,
          status: newGameEvent.status as "WAITING",
          players: [], // Empty players array for new games
          user: {
            id: "", // Not provided in Pusher event
            username: newGameEvent.creator,
            email: "",
            password: "",
          },
        }

        // Only add if it's not the current user's game
        if (newGame.userId !== currentUser.id) {
          setGames((prevGames) => {
            const gameExists = prevGames.some((game) => game.id === newGame.id)
            if (!gameExists) {
              return [newGame, ...prevGames]
            }
            return prevGames
          })

          // Set initial request status
          setRequestStatus((prev) => ({
            ...prev,
            [newGame.id]: "none",
          }))
        }
      }
    })

    // Add listener for game deletion
    channel.bind("game-deleted", (deletedGameEvent: { gameId: string }) => {
      setGames((prevGames) => prevGames.filter((game) => game.id !== deletedGameEvent.gameId))
      setRequestStatus((prev) => {
        const newStatus = { ...prev }
        delete newStatus[deletedGameEvent.gameId]
        return newStatus
      })
    })

    // Clean up subscription on unmount
    return () => {
      pusherClient.unsubscribe("games")
    }
  }, [authorized, currentUser])

  // Set up Pusher subscriptions for individual game channels - similar to my-requests page
  useEffect(() => {
    if (!authorized || !currentUser || games.length === 0) return

    const gameIds = [...new Set(games.map((game) => game.id))]

    // Subscribe to game channels for both approval and rejection notifications
    const gameChannels = gameIds.map((gameId) => {
      const channel = pusherClient.subscribe(`game-${gameId}`)

      // Listen for when the user's request is approved
      channel.bind("player-approved", (data: { userId: string }) => {
        console.log("Player approved event received:", data)

        if (data.userId === currentUser.id) {
          // Update the request status to approved
          setRequestStatus((prev) => ({
            ...prev,
            [gameId]: "approved",
          }))

          // Find the game name for the toast
          const approvedGame = games.find((game) => game.id === gameId)
          if (approvedGame) {
            toastSuccess(`Your request to join "${approvedGame.game}" has been approved!`)
          }
        }
      })

      // Listen for when a player request is rejected
      channel.bind(
        "player-rejected",
        (data: { requestId: string; userId: string; gameId: string; message: string }) => {
          console.log("Player rejected event received:", data)

          // Check if the rejected user is the current user
          if (data.userId === currentUser.id && data.gameId === gameId) {
            // Update the request status to rejected
            setRequestStatus((prev) => ({
              ...prev,
              [gameId]: "rejected",
            }))

            // Show the exact message from the backend
            toastError(data.message || "Your request was rejected.")
          }
        },
      )

      return channel
    })

    // Clean up subscriptions on unmount
    return () => {
      gameChannels.forEach((channel) => {
        pusherClient.unsubscribe(channel.name)
      })
    }
  }, [authorized, currentUser, games])

  if (authorized === null) return null

  const handleJoinRequest = async (gameId: string) => {
    setJoiningGame(gameId)

    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        throw new Error("Authorization token not found")
      }

      await toastPromise(sendPlayerRequest(gameId, token), {
        success: "Join request sent successfully",
        loading: "Sending join request...",
        error: "Failed to send join request",
      })

      // Update request status to pending
      setRequestStatus((prev) => ({
        ...prev,
        [gameId]: "pending",
      }))
    } catch (error) {
      console.error("Error sending join request:", error)
    } finally {
      setJoiningGame(null)
    }
  }

  const handleJoinLobby = (gameId: string) => {
    router.push(`/game/${gameId}/lobby`)
  }

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date()
    const gameDate = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - gameDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getButtonContent = (gameId: string) => {
    const status = requestStatus[gameId] || "none"
    const isJoining = joiningGame === gameId

    switch (status) {
      case "player":
        return {
          text: "Join Lobby",
          disabled: false,
          onClick: () => handleJoinLobby(gameId),
          className: "w-full bg-green-600 hover:bg-green-700 text-white font-medium",
          icon: <LogIn className="w-4 h-4 mr-2" />,
        }
      case "pending":
        return {
          text: "Request Sent",
          disabled: true,
          onClick: () => {},
          className: "w-full bg-yellow-500 text-white font-medium cursor-not-allowed",
          icon: <UserPlus className="w-4 h-4 mr-2" />,
        }
      case "approved":
        return {
          text: "Join Lobby",
          disabled: false,
          onClick: () => handleJoinLobby(gameId),
          className: "w-full bg-green-600 hover:bg-green-700 text-white font-medium",
          icon: <LogIn className="w-4 h-4 mr-2" />,
        }
      case "rejected":
        return {
          text: "Request Rejected",
          disabled: true,
          onClick: () => {},
          className: "w-full bg-red-500 text-white font-medium cursor-not-allowed",
          icon: <X className="w-4 h-4 mr-2" />,
        }
      default:
        return {
          text: isJoining ? "Sending Request..." : "Send Join Request",
          disabled: isJoining,
          onClick: () => handleJoinRequest(gameId),
          className: "w-full bg-blue-600 hover:bg-blue-700 text-white font-medium",
          icon: <UserPlus className="w-4 h-4 mr-2" />,
        }
    }
  }

  const getStatusBadge = (gameId: string) => {
    const status = requestStatus[gameId] || "none"

    switch (status) {
      case "player":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
            joined
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
            pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
            approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">
            rejected
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Gamepad2 className="h-6 w-6 text-blue-600 mr-2" />
              Active Games
            </h1>
            <p className="text-slate-600 mt-1">
              Join waiting games and start battling! {games.length} game{games.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <Button
            onClick={fetchActiveGames}
            variant="outline"
            className="border-slate-200 text-slate-700"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
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
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Waiting Games</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              There are no games waiting for players right now. Check back later or create your own game!
            </p>
            <Button
              onClick={() => router.push("/dashboard/create-game")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
            >
              Create Your Own Game
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const buttonConfig = getButtonContent(game.id)
              const statusBadge = getStatusBadge(game.id)

              return (
                <Card
                  key={game.id}
                  className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-slate-900 text-lg mb-1 line-clamp-2">{game.game}</CardTitle>
                        <CardDescription className="text-slate-600 flex items-center">
                          <User className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          Created by {game.user.username}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          waiting
                        </Badge>
                        {statusBadge}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="flex items-center text-slate-600">
                        <Trophy className="w-4 h-4 mr-2 text-slate-500" />
                        Quiz Game
                      </div>
                      <div className="flex items-center text-slate-600">
                        <User className="w-4 h-4 mr-2 text-slate-500" />
                        {game.players?.length || 0} player{(game.players?.length || 0) !== 1 ? "s" : ""} joined
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {formatTimeAgo(game.createdAt)}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={buttonConfig.onClick}
                        disabled={buttonConfig.disabled}
                        className={buttonConfig.className}
                      >
                        {buttonConfig.icon}
                        {buttonConfig.text}
                      </Button>
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
