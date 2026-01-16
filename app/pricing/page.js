"use client";
import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();

  const plans = [
    {
      name: "Free",
      price: "0",
      period: "/ เดือน",
      description: "สำหรับเริ่มต้นใช้งานส่วนตัวหรือทีมขนาดเล็ก",
      features: [
        { name: "1 ทีม", included: true },
        { name: "สมาชิกสูงสุด 5 คน", included: true },
        { name: "จัดการ Task พื้นฐาน", included: true },
        { name: "Board View", included: true },
        { name: "Gantt Chart", included: false },
        { name: "Dashboard สรุปผล", included: false },
        { name: "Priority Support", included: false },
      ],
      buttonText: "เริ่มต้นใช้งานฟรี",
      buttonColor: "bg-gray-500 hover:bg-gray-600",
      popular: false,
    },
    {
      name: "Pro",
      price: "299",
      period: "/ เดือน",
      description: "สำหรับทีมที่ต้องการเครื่องมือบริหารจัดการครบครัน",
      features: [
        { name: "ไม่จำกัดจำนวนทีม", included: true },
        { name: "สมาชิกสูงสุด 20 คน", included: true },
        { name: "จัดการ Task ไม่จำกัด", included: true },
        { name: "Board View & Calendar", included: true },
        { name: "Gantt Chart", included: true },
        { name: "Dashboard สรุปผล", included: true },
        { name: "Priority Support", included: false },
      ],
      buttonText: "เลือกแพ็กเกจ Pro",
      buttonColor: "bg-purple-500 hover:bg-purple-600",
      popular: true,
    },
    {
      name: "ProMax",
      price: "599",
      period: "/ เดือน",
      description: "สำหรับองค์กรที่ต้องการความยืดหยุ่นสูงสุด",
      features: [
        { name: "ไม่จำกัดจำนวนทีม", included: true },
        { name: "ไม่จำกัดจำนวนสมาชิก", included: true },
        { name: "ฟีเจอร์ทุกอย่างใน Pro", included: true },
        { name: "ระบบจัดการ Role ขั้นสูง", included: true },
        { name: "Export รายงานขั้นสูง", included: true },
        { name: "API Access", included: true },
        { name: "Priority Support 24/7", included: true },
      ],
      buttonText: "เลือกแพ็กเกจ ProMax",
      buttonColor: "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#fce4ec] to-[#ede7f6] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-base font-semibold text-purple-600 tracking-wide uppercase">Pricing</h2>
        <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
          เลือกแพ็กเกจที่เหมาะกับทีมของคุณ
        </p>
        <p className="mt-4 text-xl text-gray-500">
          เริ่มต้นใช้งานฟรีได้ทันที อัปเกรดเมื่อคุณพร้อมขยายทีม
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${
              plan.popular ? "border-purple-500 transform md:-translate-y-4" : "border-transparent"
            } transition-all duration-300 hover:shadow-2xl`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Popular
              </div>
            )}
            <div className="p-6 sm:p-8 flex-1">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-4 flex items-baseline text-gray-900">
                <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="ml-1 text-xl font-semibold text-gray-500">฿ {plan.period}</span>
              </p>
              <p className="mt-4 text-gray-500">{plan.description}</p>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-start">
                    <div className="flex-shrink-0">
                      {feature.included ? (
                        <CheckIcon className="h-6 w-6 text-green-500" aria-hidden="true" />
                      ) : (
                        <XMarkIcon className="h-6 w-6 text-gray-300" aria-hidden="true" />
                      )}
                    </div>
                    <p className={`ml-3 text-base ${feature.included ? "text-gray-700" : "text-gray-400"}`}>
                      {feature.name}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 sm:p-8 bg-gray-50">
              <button
                onClick={() => router.push('/register')}
                className={`w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-white ${plan.buttonColor} md:py-4 md:text-lg md:px-10 transition-colors`}
              >
                {plan.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-12">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 underline">
              ย้อนกลับ
          </button>
      </div>
    </div>
  );
}