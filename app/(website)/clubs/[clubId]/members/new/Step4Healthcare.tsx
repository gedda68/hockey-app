"use client";

import { Heart } from "lucide-react";
import type { AddMemberFormData } from "./member-form-types";

interface HealthProviderOption { providerId: string; name: string }

interface Medicare {
  number: string;
  position: string;
  expiryMonth: string;
  expiryYear: string;
}

interface PrivateHealth {
  provider: string;
  membershipNumber: string;
  expiryDate: string;
}

interface Healthcare {
  medicare: Medicare | null;
  privateHealth: PrivateHealth | null;
}

interface Medical {
  conditions: string;
  medications: string;
  allergies: string;
}

interface Step4HealthcareProps {
  formData: AddMemberFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddMemberFormData>>;
  healthProviders: HealthProviderOption[];
  hasMedicare: boolean;
  setHasMedicare: React.Dispatch<React.SetStateAction<boolean>>;
  hasPrivateHealth: boolean;
  setHasPrivateHealth: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Step4Healthcare({
  formData,
  setFormData,
  healthProviders,
  hasMedicare,
  setHasMedicare,
  hasPrivateHealth,
  setHasPrivateHealth,
}: Step4HealthcareProps) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
      <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
        <Heart size={24} />
        Healthcare & Medical
      </h2>

      <div className="space-y-6">
        {/* Medicare */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="hasMedicare"
              checked={hasMedicare}
              onChange={(e) => {
                setHasMedicare(e.target.checked);
                if (!e.target.checked) {
                  setFormData({
                    ...formData,
                    healthcare: { ...formData.healthcare, medicare: null },
                  });
                } else {
                  setFormData({
                    ...formData,
                    healthcare: {
                      ...formData.healthcare,
                      medicare: {
                        number: "",
                        position: "",
                        expiryMonth: "",
                        expiryYear: "",
                      },
                    },
                  });
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400"
            />
            <label
              htmlFor="hasMedicare"
              className="text-lg font-black text-slate-700"
            >
              💳 I have Medicare
            </label>
          </div>

          {hasMedicare && formData.healthcare.medicare && (
            <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <label className="text-xs font-black uppercase text-green-700 ml-2">
                    Medicare Number (10 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.healthcare.medicare.number}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits
                      if (value === "" || /^\d{0,10}$/.test(value)) {
                        setFormData({
                          ...formData,
                          healthcare: {
                            ...formData.healthcare,
                            medicare: {
                              ...formData.healthcare.medicare!,
                              number: value,
                            },
                          },
                        });
                      }
                    }}
                    className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-green-700 ml-2">
                    Position (1-9)
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={formData.healthcare.medicare.position}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow single digit 1-9
                      if (value === "" || /^[1-9]$/.test(value)) {
                        setFormData({
                          ...formData,
                          healthcare: {
                            ...formData.healthcare,
                            medicare: {
                              ...formData.healthcare.medicare!,
                              position: value,
                            },
                          },
                        });
                      }
                    }}
                    className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-green-700 ml-2">
                    Expiry Month
                  </label>
                  <select
                    value={formData.healthcare.medicare.expiryMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          medicare: {
                            ...formData.healthcare.medicare!,
                            expiryMonth: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (m) => (
                        <option
                          key={m}
                          value={m.toString().padStart(2, "0")}
                        >
                          {m.toString().padStart(2, "0")}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-green-700 ml-2">
                    Expiry Year
                  </label>
                  <select
                    value={formData.healthcare.medicare.expiryYear}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          medicare: {
                            ...formData.healthcare.medicare!,
                            expiryYear: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-bold focus:ring-2 ring-green-400"
                  >
                    <option value="">Year</option>
                    {Array.from(
                      { length: 10 },
                      (_, i) => new Date().getFullYear() + i,
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Private Health Insurance */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="hasPrivateHealth"
              checked={hasPrivateHealth}
              onChange={(e) => {
                setHasPrivateHealth(e.target.checked);
                if (!e.target.checked) {
                  setFormData({
                    ...formData,
                    healthcare: {
                      ...formData.healthcare,
                      privateHealth: null,
                    },
                  });
                } else {
                  setFormData({
                    ...formData,
                    healthcare: {
                      ...formData.healthcare,
                      privateHealth: {
                        provider: "",
                        membershipNumber: "",
                        expiryDate: "",
                      },
                    },
                  });
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400"
            />
            <label
              htmlFor="hasPrivateHealth"
              className="text-lg font-black text-slate-700"
            >
              🏥 I have Private Health Insurance
            </label>
          </div>

          {hasPrivateHealth && formData.healthcare.privateHealth && (
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-blue-700 ml-2">
                    Provider
                  </label>
                  <select
                    value={formData.healthcare.privateHealth.provider}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          privateHealth: {
                            ...formData.healthcare.privateHealth!,
                            provider: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                  >
                    <option value="">Select provider</option>
                    {healthProviders.map((provider) => (
                      <option
                        key={provider.providerId}
                        value={provider.providerId}
                      >
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-blue-700 ml-2">
                    Membership Number
                  </label>
                  <input
                    type="text"
                    value={
                      formData.healthcare.privateHealth.membershipNumber
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          privateHealth: {
                            ...formData.healthcare.privateHealth!,
                            membershipNumber: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                    placeholder="ABC123456"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-blue-700 ml-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.healthcare.privateHealth.expiryDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthcare: {
                          ...formData.healthcare,
                          privateHealth: {
                            ...formData.healthcare.privateHealth!,
                            expiryDate: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Medical Information */}
        <div>
          <h3 className="text-lg font-black text-slate-700 mb-4">
            Medical Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                Medical Conditions
              </label>
              <textarea
                value={formData.medical?.conditions || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    medical: {
                      ...formData.medical,
                      conditions: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                rows={2}
                placeholder="e.g., Asthma, Diabetes"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                Medications
              </label>
              <textarea
                value={formData.medical?.medications || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    medical: {
                      ...formData.medical,
                      medications: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                rows={2}
                placeholder="e.g., Ventolin inhaler as needed"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">
                Allergies
              </label>
              <textarea
                value={formData.medical?.allergies || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    medical: {
                      ...formData.medical,
                      allergies: e.target.value,
                    },
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                rows={2}
                placeholder="e.g., Penicillin, Nuts"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
