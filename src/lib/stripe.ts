import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2026-02-25.clover", // latest stable version equivalent
  appInfo: {
    name: "Sync",
    version: "0.1.0",
  },
});
