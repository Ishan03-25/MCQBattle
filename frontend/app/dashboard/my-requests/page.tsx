"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { X, UserCheck, Clock, Gamepad2, ArrowRight } from "lucide-react"
import pusherClient from "@/lib/pusherClient"
import { toastPromise, toastSuccess } from "@/utils/toast"
import { getMyPlayerRequests, cancelPlayerRequest } from "@/lib/api/player"

interface Game {
  id: string
  game: string
  userId: string
}

interface MyPlayerRequest {
  id: string
  gameId: string
  userId: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  createdAt: string
  updatedAt: string
  game: Game
}

export default function MyRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<MyPlayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchMyRequests = async () => {
    setLoading(true)

    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        console.error("No authorization token found.")
        return
      }

      const data = await getMyPlayerRequests(token)

      // Sort by creation date, newest first
      const sortedRequests = (data || []).sort(
        (a: MyPlayerRequest, b: MyPlayerRequest) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      setRequests(sortedRequests)
    } catch (error) {
      console.error("Error fetching my requests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const username = localStorage.getItem("username")
    const token = localStorage.getItem("Authorization")
    const userId = localStorage.getItem("userId")

    if (!token || !username) {
      router.push("/auth")
    } else {
      setAuthorized(true)
      setCurrentUserId(userId)
      fetchMyRequests()
    }
  }, [router])

  // Set up Pusher subscription for each game the user has requested to join
  useEffect(() => {
    if (!authorized || !currentUserId || requests.length === 0) return

    const gameIds = [...new Set(requests.map((req) => req.gameId))]

    // Subscribe to game channels for both approval and rejection notifications
    const gameChannels = gameIds.map((gameId) => {
      const channel = pusherClient.subscribe(`game-${gameId}`)

      // Listen for when the user's request is approved
      channel.bind("player-approved", (data: { userId: string }) => {
        if (data.userId === currentUserId) {
          // Find the request that was approved
          const approvedRequest = requests.find(
            (req) => req.gameId === gameId && req.userId === currentUserId && req.status === "PENDING",
          )

          if (approvedRequest) {
            // Update the request status locally
            setRequests((prev) =>
              prev.map((req) => (req.id === approvedRequest.id ? { ...req, status: "APPROVED" } : req)),
            )

            // Show a success toast notification
            toastSuccess(`Your request to join "${approvedRequest.game.game}" has been approved!`)
          }
        }
      })

      // Listen for when a player request is rejected
      channel.bind("player-rejected", (data: { requestId: string; gameId: string; message: string }) => {
        console.log("Player rejected:", data) // For debugging
        console.log("Hello");
        // Find the request that was rejected (check if it belongs to current user)
        const rejectedRequest = requests.find((req) => req.id === data.requestId && req.userId === currentUserId)

        if (rejectedRequest) {
          // Update the request status locally
          setRequests((prev) => prev.map((req) => (req.id === data.requestId ? { ...req, status: "REJECTED" } : req)))

          // Show the exact message from the backend
          toastSuccess(data.message || `Your request to join "${rejectedRequest.game.game}" was rejected.`)
        }
      })

      return channel
    })

    // Clean up subscriptions on unmount
    return () => {
      gameChannels.forEach((channel) => {
        pusherClient.unsubscribe(channel.name)
      })
    }
  }, [authorized, currentUserId, requests])

  if (authorized === null) return null

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequest(requestId)

    try {
      const token = localStorage.getItem("Authorization")
      if (!token) {
        throw new Error("Authorization token not found")
      }

      await toastPromise(cancelPlayerRequest(requestId, token), {
        success: "Request cancelled successfully",
        loading: "Cancelling request...",
        error: "Failed to cancel request",
      })

      // Update the request status locally
      setRequests((prev) => prev.map((req) => (req.id === requestId ? { ...req, status: "CANCELLED" } : req)))
    } catch (error) {
      console.error("Error cancelling request:", error)
    } finally {
      setCancellingRequest(null)
    }
  }

  const handleJoinGame = (gameId: string) => {
    router.push(`/game/${gameId}/lobby`)
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
  const approvedRequests = requests.filter((req) => req.status === "APPROVED")
  const otherRequests = requests.filter((req) => req.status !== "PENDING" && req.status !== "APPROVED")

  return (
    <div className="min-h-screen bg-slate-50 pt-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
              My Requests
            </h1>
            <p className="text-slate-600 mt-1">Track your requests to join games ({pendingRequests.length} pending)</p>
          </div>
          <Button
            onClick={fetchMyRequests}
            variant="outline"
            className="border-slate-200 text-slate-700"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {loading ? (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Loading Your Requests...</CardTitle>
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
                    <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Pending Requests</h3>
                    <p className="text-slate-600">You don't have any pending requests to join games.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-slate-500">You requested to join</span>
                            <div className="flex items-center text-slate-900 font-medium">
                              <Gamepad2 className="h-4 w-4 text-slate-500 mr-1" />
                              {request.game.game}
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-slate-500">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Requested on {formatDateTime(request.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={cancellingRequest === request.id}
                            size="sm"
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approved Requests */}
            {approvedRequests.length > 0 && (
              <Card className="border border-slate-200 shadow-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center">
                    <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                    Approved Requests ({approvedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {approvedRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-slate-500">You were approved to join</span>
                            <div className="flex items-center text-slate-900 font-medium">
                              <Gamepad2 className="h-4 w-4 text-slate-500 mr-1" />
                              {request.game.game}
                            </div>
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                              approved
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-slate-500">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Requested on {formatDateTime(request.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleJoinGame(request.gameId)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Join Game
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Requests */}
            {otherRequests.length > 0 && (
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center">
                    <Clock className="h-5 w-5 text-slate-600 mr-2" />
                    Request History ({otherRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {otherRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-25 opacity-75"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-slate-500">You requested to join</span>
                            <div className="flex items-center text-slate-900 font-medium">
                              <Gamepad2 className="h-4 w-4 text-slate-500 mr-1" />
                              {request.game.game}
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
                              request.status === "REJECTED"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
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

            {requests.length === 0 && !loading && (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-200 shadow-sm">
                <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">No Requests Found</h2>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  You haven't requested to join any games yet. Browse active games to find games to join!
                </p>
                <Button
                  onClick={() => router.push("/dashboard/active-games")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
                >
                  Browse Active Games
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
