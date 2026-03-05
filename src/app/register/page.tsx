"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-toastify"
import { registerUser } from "@/app/actions/authActions"
import { Zap, ArrowRight, Lock, Mail, User } from "lucide-react"

export default function Register() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    const email = (formData.get("email") as string).trim().toLowerCase()
    const password = formData.get("password") as string

    // Client-side validation
    if (name.length < 1 || name.length > 100) {
      toast.error("Please enter a valid name (1-100 characters)")
      setLoading(false)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address")
      setLoading(false)
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      setLoading(false)
      return
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Password must contain uppercase, lowercase, and a number")
      setLoading(false)
      return
    }

    try {
      const res = await registerUser(name, email, password)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Account created successfully")
        // Sign in immediately
        const loginRes = await signIn("credentials", { email, password, redirect: false })
        if (loginRes?.ok) {
          router.push("/dashboard")
        }
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-indigo items-center justify-center p-12">
        <div className="relative z-10 max-w-md text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-8">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Join ProjectTracker</h1>
          <p className="text-indigo-100 text-lg leading-relaxed">
            Get started with powerful project management, goal tracking, and career analytics.
          </p>
          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex-1">
              <div className="text-3xl font-bold text-white">Free</div>
              <div className="text-xs text-indigo-200 mt-1">To get started</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex-1">
              <div className="text-3xl font-bold text-white">Fast</div>
              <div className="text-xs text-indigo-200 mt-1">Setup in seconds</div>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -left-10 -bottom-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="absolute right-20 bottom-20 w-40 h-40 rounded-full bg-white/10" />
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-indigo">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">ProjectTracker</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
            <p className="text-muted-foreground mt-2">Sign up to start tracking your projects</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required
                  className="pl-10 h-11 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="pl-10 h-11 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a strong password"
                  required
                  className="pl-10 h-11 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl gradient-indigo border-0 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 text-sm font-semibold"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
