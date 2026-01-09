"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "../../../../lib/constants";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: "Perfect for hobbyists and side projects.",
      features: ["3 Projects", "Basic Analytics", "Community Support"],
      buttonText: "Join for Free",
      isPopular: false,
    },
    {
      name: "Pro",
      monthlyPrice: 29,
      yearlyPrice: 24, // Price per month when billed yearly
      description: "Advanced features for growing startups.",
      features: [
        "Unlimited Projects",
        "Advanced Analytics",
        "Priority Support",
        "Custom Domains",
      ],
      buttonText: "Get Started",
      isPopular: true,
    },
    {
      name: "Enterprise",
      monthlyPrice: 99,
      yearlyPrice: 89,
      description: "Full power for large scale organizations.",
      features: [
        "Custom Contracts",
        "SLA Guarantee",
        "Dedicated Manager",
        "White-labeling",
      ],
      buttonText: "Contact Sales",
      isPopular: false,
    },
  ];

  return (
    <section className="py-2 px-4">
      <Link href={ROUTES.UMPIRE_ALLOCATIONS}>
        <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            Umpire Allocations
          </h2>
          <p className="text-sm text-slate-600">
            View umpire assignments for all matches
          </p>
        </div>
      </Link>
    </section>
  );
}
