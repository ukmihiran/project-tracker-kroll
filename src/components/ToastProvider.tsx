"use client"

import { ToastContainer, Slide } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { useTheme } from "next-themes"

export default function ToastProvider() {
  const { resolvedTheme } = useTheme()

  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      transition={Slide}
      limit={5}
      className="!z-[99999]"
      toastClassName={() =>
        "relative flex items-center p-4 mb-2 min-h-[64px] rounded-xl shadow-lg border backdrop-blur-sm cursor-pointer text-sm font-medium " +
        (resolvedTheme === "dark"
          ? "bg-[#1e293b]/95 border-[#334155] text-[#e2e8f0]"
          : "bg-white/95 border-[#e2e8f0] text-[#1a1d2e]")
      }
    />
  )
}
