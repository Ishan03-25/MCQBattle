"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Users, Trophy, Clock, Brain, Target, Play, CheckCircle, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function HomePage() {

  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Link className="flex items-center justify-center" href="/">
          <Gamepad2 className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-2xl font-bold text-gray-900">QuizBattle</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="#how-it-works">
            How It Works
          </Link>
        </nav>
        <div className="ml-6 flex gap-2">
            <Button size="sm"
              onClick={()=>{router.push("/auth")}}
            >Sign In</Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-fit">
                    <Zap className="w-3 h-3 mr-1" />
                    Real-time Battles
                  </Badge>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Challenge Your Mind in
                    <span className="text-blue-600"> Real-Time MCQ Battles</span>
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl">
                    Create custom MCQ battles or join exciting games created by other players. Host your own quiz rooms,
                    accept challengers, and compete in real-time multiple choice battles.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700"
                      onClick={()=>{router.push("/dashboard/my-games")}}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Battle Now
                    </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Free to play
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    No downloads required
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Cross-platform
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-lg blur-3xl opacity-30"></div>
                  <Card className="relative bg-white/80 backdrop-blur border-0 shadow-2xl">
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-2">
                        <Badge variant="default" className="bg-green-600">
                          GAME LOBBY
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">Geography Masters</CardTitle>
                      <CardDescription>Created by Alex_Quiz</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-2">Category: World Geography</div>
                        <div className="text-sm text-gray-600 mb-4">Questions: 10 | Time: 30s each</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Sarah_K</span>
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm font-medium">Mike_Quiz</span>
                          <Badge variant="default" className="text-xs bg-green-600">
                            Accepted
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Quiz_Master</span>
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="text-sm text-gray-600">Players: 2/4</div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Start Game
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Why Choose QuizBattle?</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Experience the thrill of real-time competition with features designed for the ultimate quiz
                  experience.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Lightning Fast Battles</CardTitle>
                  <CardDescription>
                    Engage in rapid-fire MCQ battles with real-time responses and instant feedback.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Host Your Own Games</CardTitle>
                  <CardDescription>
                    Create custom quiz battles with your preferred settings and approve players who want to join.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Diverse Categories</CardTitle>
                  <CardDescription>
                    Choose from hundreds of categories including science, history, sports, and more.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                    <Trophy className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle>Competitive Rankings</CardTitle>
                  <CardDescription>
                    Climb the global leaderboards and earn achievements as you improve your skills.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                    <Target className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle>Adaptive Difficulty</CardTitle>
                  <CardDescription>
                    Questions adapt to your skill level, ensuring challenging yet fair gameplay.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
                    <Clock className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle>Time Pressure</CardTitle>
                  <CardDescription>
                    Quick thinking is rewarded with bonus points in our time-based scoring system.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">How It Works</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Create your own quiz battles or join existing games in four simple steps.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-6xl items-start gap-8 py-12 lg:grid-cols-4 lg:gap-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold">Create Your Game</h3>
                <p className="text-gray-500">
                  Set up your quiz battle by choosing category, difficulty, number of questions, and player limit.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold">Players Request to Join</h3>
                <p className="text-gray-500">
                  Your game appears in the lobby where other players can see it and send requests to join your battle.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold">Accept Players</h3>
                <p className="text-gray-500">
                  Review join requests and accept the players you want to battle with. You control who enters your game.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  4
                </div>
                <h3 className="text-xl font-bold">Start the Battle</h3>
                <p className="text-gray-500">
                  Once you have enough players, start the real-time MCQ battle and compete for the highest score!
                </p>
              </div>
            </div>

            {/* Alternative flow for joining games */}
            <div className="mt-16 text-center">
              <h3 className="text-2xl font-bold mb-8">Or Join an Existing Game</h3>
              <div className="mx-auto grid max-w-4xl items-start gap-8 lg:grid-cols-3 lg:gap-12">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    1
                  </div>
                  <h4 className="text-lg font-bold">Browse Games</h4>
                  <p className="text-gray-500">
                    Explore available games in the lobby and find battles that match your interests.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    2
                  </div>
                  <h4 className="text-lg font-bold">Request to Join</h4>
                  <p className="text-gray-500">Send a join request to the game creator and wait for their approval.</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    3
                  </div>
                  <h4 className="text-lg font-bold">Get Accepted & Play</h4>
                  <p className="text-gray-500">
                    Once accepted, join the battle and compete against other approved players.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-blue-600">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-white">
                  Ready to Test Your Knowledge?
                </h2>
                <p className="max-w-[600px] text-blue-100 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join millions of players in the ultimate real-time quiz battle experience. Your first battle is just
                  one click away.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100"
                  onClick={()=>{router.push("/dashboard/my-games")}}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Your First Battle
                </Button>
                  <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100"
                    onClick={()=>{router.push("/auth")}}
                  >
                    Create Account
                  </Button>
              </div>              
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">© 2024 QuizBattle. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy Policy
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Contact
          </Link>
        </nav>
      </footer>
    </div>
  )
}