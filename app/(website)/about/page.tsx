"use client";

import React from "react";

export default function PricingPage() {
  // Not interactive currently; use a constant to avoid unused setter warning.
  const isYearly = false;

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
      yearlyPrice: 24,
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
      <div className="text-center mb-5 bg-[#66667e] p-2 rounded-lg mx-4">
        <h1 className="text-4xl font-extrabold sm:text-3xl text-yellow-200">
          About Brisbane Hockey
        </h1>
      </div>

      <div className="max-w-5xl mx-auto py-6">
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card bg-base-100 border border-base-300 shadow-sm relative ${
                plan.isPopular ? "border-primary shadow-xl scale-105 z-10" : ""
              }`}
            >
              {plan.isPopular && (
                <div className="badge badge-primary absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  MOST POPULAR
                </div>
              )}

              <div className="card-body">
                <h2 className="card-title text-xl">{plan.name}</h2>
                <p className="text-sm text-base-content/60">
                  {plan.description}
                </p>

                <div className="my-6">
                  <span className="text-4xl font-bold">
                    ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-base-content/50">/mo</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="card-actions">
                  <button
                    className={`btn btn-block ${
                      plan.isPopular ? "btn-primary" : "btn-outline"
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
