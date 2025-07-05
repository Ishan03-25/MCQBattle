"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, X, UserPlus, User, Clock, Gamepad2 } from "lucide-react"
import pusherClient from "@/lib/pusherClient"
import { toastPromise } from "@/utils/toast"
import { getAllMyGames } from "@/lib/api/game"
import { approvePlayerRequest, getRequestsForGame, rejectPlayerRequest } from "@/lib/api/player"

interface Game {
  id: string
  game: string
  userId: string
}

interface PlayerRequest {
  id: string
  gameId: string
  userId: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    email: string
    password: string
  }
}

export default function PlayerRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<PlayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [userGames, setUserGames] = useState<Map<string, Game>>(new Map())

  const fetchPlayerRequests = async () => {
    setLoading(true)

    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        console.error("No authorization token found.")
        return
      }

      // First, fetch the user's games
      const gamesResponse = await getAllMyGames(token)

      const gamesData = await gamesResponse
      const games = gamesData.games || []

      // Create a map of game IDs to game objects
      const gamesMap = new Map<string, Game>()
      games.forEach((game: Game) => {
        gamesMap.set(game.id, game)
      })
      setUserGames(gamesMap)

      // Now fetch requests for each game
      const allRequests: PlayerRequest[] = []

      for (const game of games) {
        const requestsResponse = await getRequestsForGame(game.id, token)
        const gameRequests = await requestsResponse
        allRequests.push(...gameRequests)
      }

      // Sort by creation date, newest first
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setRequests(allRequests)
    } catch (error) {
      console.error("Error fetching player requests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const username = localStorage.getItem("username")
    const token = localStorage.getItem("Authorization")

    if (!token || !username) {
      router.push("/auth")
    } else {
      setAuthorized(true)
      fetchPlayerRequests()
    }
  }, [router])

  // Set up Pusher subscription for each game
  useEffect(() => {
    if (!authorized || userGames.size === 0) return

    const channels = Array.from(userGames.keys()).map((gameId) => {
      const channel = pusherClient.subscribe(`game-${gameId}`)

      channel.bind("player-request", (data: { userId: string; requestId: string }) => {
        // Fetch the new request details
        const fetchNewRequest = async () => {
          try {
            const token = localStorage.getItem("Authorization")
            if (!token) return

            const response = await getRequestsForGame(gameId, token)
            console.log(response)
            const gameRequests = response
            const newRequest = gameRequests.find((req: PlayerRequest) => req.id === data.requestId)

            if (newRequest) {
              setRequests((prev) => [newRequest, ...prev])
            }
          } catch (error) {
            console.error("Error fetching new request:", error)
          }
        }

        fetchNewRequest()
      })

      return channel
    })

    // Clean up subscriptions on unmount
    return () => {
      channels.forEach((channel) => {
        pusherClient.unsubscribe(channel.name)
      })
    }
  }, [authorized, userGames])

  // Set up Pusher subscription for each request
  useEffect(() => {
    if (!authorized || requests.length === 0) return

    const channels = requests.map((request) => {
      // Use a combination of request ID and a timestamp to ensure uniqueness
      const channelName = `request-${request.id}`
      const channel = pusherClient.subscribe(channelName)

      channel.bind("request-cancelled", (data: { requestId: string; userId: string; status: string }) => {
        // Remove the cancelled request from the requests list
        setRequests((prev) => prev.filter((req) => req.id !== data.requestId))
      })

      return { name: channelName, channel }
    })

    // Clean up subscriptions on unmount
    return () => {
      channels.forEach((channelInfo) => {
        pusherClient.unsubscribe(channelInfo.name)
      })
    }
  }, [authorized, requests])

  if (authorized === null) return null

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    console.log(requestId)
    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        throw new Error("Authorization token not found")
      }

      await toastPromise(approvePlayerRequest(requestId, token), {
        success: "Request approved successfully",
        loading: "Approving request...",
        error: "Failed to approve request",
      })

      // Update the request status locally
      setRequests((prev) => prev.map((req) => (req.id === requestId ? { ...req, status: "APPROVED" } : req)))
    } catch (error) {
      console.error("Error approving request:", error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId)

    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        throw new Error("Authorization token not found")
      }

      await toastPromise(rejectPlayerRequest(requestId, token), {
        success: "Request rejected",
        loading: "Rejecting request...",
        error: "Failed to reject request",
      })

      // Update the request status locally
      setRequests((prev) => prev.map((req) => (req.id === requestId ? { ...req, status: "REJECTED" } : req)))
    } catch (error) {
      console.error("Error rejecting request:", error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const pendingRequests = requests.filter((req) => req.status === "PENDING")
  const processedRequests = requests.filter((req) => req.status !== "PENDING")

  return (
    <div className="min-h-screen bg-slate-50 pt-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <UserPlus className="h-6 w-6 text-blue-600 mr-2" />
              Player Requests
            </h1>
            <p className="text-slate-600 mt-1">
              Manage requests from players who want to join your games ({pendingRequests.length} pending)
            </p>
          </div>
        </div>

        {loading ? (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Loading Requests...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/5" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pending Requests */}
            <Card className="border border-slate-200 shadow-sm mb-6">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  Pending Requests ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Pending Requests</h3>
                    <p className="text-slate-600">You don't have any pending player requests for your games.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request, index) => (
                      <div
                        key={`pending-${request.id}-${index}`}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center text-slate-900 font-medium">
                              <User className="h-4 w-4 text-slate-500 mr-2" />
                              {request.user.username}
                            </div>
                            <span className="text-slate-500">wants to join</span>
                            <div className="flex items-center text-slate-900 font-medium">
                              <Gamepad2 className="h-4 w-4 text-slate-500 mr-1" />
                              {userGames.get(request.gameId)?.game || "Unknown Game"}
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-slate-500">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Requested on {formatDateTime(request.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={processingRequest === request.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingRequest === request.id}
                            size="sm"
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center">
                    <Check className="h-5 w-5 text-slate-600 mr-2" />
                    Processed Requests ({processedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {processedRequests.map((request, index) => (
                      <div
                        key={`processed-${request.id}-${index}`}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-25 opacity-75"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center text-slate-900 font-medium">
                              <User className="h-4 w-4 text-slate-500 mr-2" />
                              {request.user.username}
                            </div>
                            <span className="text-slate-500">requested to join</span>
                            <div className="flex items-center text-slate-900 font-medium">
                              <Gamepad2 className="h-4 w-4 text-slate-500 mr-1" />
                              {userGames.get(request.gameId)?.game || "Unknown Game"}
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-slate-500">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Requested on {formatDateTime(request.createdAt)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <Badge
                            variant="outline"
                            className={`${
                              request.status === "APPROVED"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }`}
                          >
                            {request.status.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
