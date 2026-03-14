"use client";

import React, { useState } from "react";
import { Check, Zap, Building2, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, priceId: string) => {
    setIsLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, priceId }),
      });
      const data = await res.json();
      if (data.url) {
        // Stripeの決済画面へリダイレクト
        window.location.href = data.url;
      } else {
        toast.error("決済の初期化に失敗しました。");
        setIsLoading(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("エラーが発生しました。");
      setIsLoading(null);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "¥0",
      period: "/月",
      description: "お試し利用に最適",
      features: ["毎月 3回 までの投稿自動化", "基本のAIモデル (GPT-4o mini)", "X (Twitter) のみ連携"],
      buttonText: "現在のプラン",
      buttonClass: "bg-slate-100 text-slate-500 cursor-default",
      icon: <Check size={24} className="text-slate-400" />
    },
    {
      id: "pro",
      name: "PRO",
      price: "¥1,980",
      period: "/月",
      stripePriceId: "price_mock_pro", // 実際の運用時はStripeのダッシュボードで発行したPrice IDに変更
      description: "本格的なSNS運用を始める方向け",
      features: [
        "毎月 100回 までの投稿自動化", 
        "高度なAIモデル (GPT-4o, Claude 3.5)", 
        "画像生成 AI (DALL-E 3利用可)",
        "複数SNS同時投稿 (X, Insta, FB)"
      ],
      buttonText: "PROにアップグレード",
      buttonClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all",
      icon: <Zap size={24} className="text-blue-500" />,
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "¥9,800",
      period: "/月",
      stripePriceId: "price_mock_enterprise", // 実際の運用時はStripeのダッシュボードで発行したPrice IDに変更
      description: "企業や代理店向けの無制限プラン",
      features: [
        "実行回数 無制限", 
        "すべてのAI・動画生成使い放題", 
        "ワークフロー無制限作成",
        "専任サポート"
      ],
      buttonText: "お問い合わせ",
      buttonClass: "bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all",
      icon: <Building2 size={24} className="text-slate-700" />
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-10">
      <header className="text-center max-w-2xl mx-auto mt-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
          最適なプランを選びましょう
        </h1>
        <p className="text-lg text-slate-500">
          用途に合わせた3つのプランをご用意しました。
          いつでも解約・アップグレードが可能です。
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative bg-white rounded-3xl p-8 flex flex-col border-2 ${
              plan.popular ? "border-blue-500 shadow-xl scale-105 z-10" : "border-slate-200 shadow-sm"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm">
                最も人気
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                {plan.icon}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{plan.name}</h2>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
              <span className="text-slate-500 font-medium">{plan.period}</span>
            </div>
            
            <p className="text-sm text-slate-500 mb-8 pb-8 border-b border-slate-100">
              {plan.description}
            </p>
            
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              {plan.features.map((feat, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-slate-700 font-medium">
                  <Check size={20} className="text-green-500 flex-shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSubscribe(plan.id, plan.stripePriceId as string)}
              disabled={isLoading !== null || plan.id === "free"}
              className={`w-full py-4 rounded-xl font-bold text-base flex justify-center items-center gap-2 ${plan.buttonClass}`}
            >
              {isLoading === plan.id ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              ) : (
                plan.buttonText
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-slate-50 border border-slate-200 rounded-3xl p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <CreditCard className="text-slate-400" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">お支払い方法の管理</h3>
            <p className="text-slate-500 text-sm">カード情報の更新や過去の請求書ダウンロートはこちらから</p>
          </div>
        </div>
        <button className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-sm transition-colors">
          カスタマーポータルへ
        </button>
      </div>
    </div>
  );
}
