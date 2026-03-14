"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { Sparkles, Mail, Github, Twitter, Instagram, Facebook } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error(error);
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 pb-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-500 to-purple-600">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Syncへようこそ</h1>
          <p className="text-purple-100 text-sm">
            AIでSNS運用をフルオートメーション化
          </p>
        </div>

        <div className="p-8 flex flex-col gap-4">
          <button
            onClick={() => handleSignIn("google")}
            disabled={isLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors font-medium relative"
          >
            {isLoading === "google" ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-700"></span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Googleでログイン
              </>
            )}
          </button>

          <button
            onClick={() => handleSignIn("twitter")}
            disabled={isLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors font-medium"
          >
            {isLoading === "twitter" ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            ) : (
              <>
                <Twitter className="w-5 h-5" fill="currentColor" />
                X (Twitter) でログイン
              </>
            )}
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">その他のログイン方法</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleSignIn("instagram")}
              disabled={isLoading !== null}
              className="flex-1 flex justify-center py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-pink-600"
            >
              <Instagram className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleSignIn("facebook")}
              disabled={isLoading !== null}
              className="flex-1 flex justify-center py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-blue-600"
            >
              <Facebook className="w-5 h-5" fill="currentColor" stroke="none"/>
            </button>
            <button
              onClick={() => handleSignIn("email")}
              disabled={isLoading !== null}
              className="flex-1 flex justify-center py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700"
            >
              <Mail className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            ログインすることで<a href="#" className="underline hover:text-slate-800">利用規約</a>と
            <a href="#" className="underline hover:text-slate-800">プライバシーポリシー</a>に同意したものとみなされます。
          </p>
        </div>
      </div>
    </div>
  );
}
