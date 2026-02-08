// components/admin/members/wizard/MedicalStep.tsx
"use client";

export default function MedicalStep({
  data: incomingData,
  onChange,
  errors,
}: {
  data: any;
  onChange: (data: any) => void;
  errors: Record<string, string>;
}) {
  // Defensive: Ensure data and nested objects exist to prevent runtime crashes
  const data = incomingData || {};
  const medicare = data.medicare || {};
  const privateHealth = data.privateHealth || {};

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-bold">
          ℹ️ All medical information is optional but recommended for safety and
          emergency purposes.
        </p>
      </div>

      {/* Medical Conditions */}
      <div>
        <h3 className="font-black text-slate-900 mb-4 text-lg uppercase tracking-tight">
          Medical Information
        </h3>

        <div className="space-y-6">
          {/* Conditions */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Medical Conditions
            </label>
            <textarea
              value={data.conditions || ""}
              onChange={(e) =>
                onChange({ ...data, conditions: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              rows={3}
              placeholder="Any medical conditions we should be aware of..."
            />
          </div>

          {/* Medications */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Current Medications
            </label>
            <textarea
              value={data.medications || ""}
              onChange={(e) =>
                onChange({ ...data, medications: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              rows={3}
              placeholder="List any current medications..."
            />
          </div>

          {/* Allergies */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Allergies
            </label>
            <textarea
              value={data.allergies || ""}
              onChange={(e) => onChange({ ...data, allergies: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              rows={3}
              placeholder="Any allergies (medication, food, etc.)..."
            />
          </div>

          {/* Doctor Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Doctor Name
              </label>
              <input
                type="text"
                value={data.doctorName || ""}
                onChange={(e) =>
                  onChange({ ...data, doctorName: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                placeholder="Dr. John Smith"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Doctor Phone
              </label>
              <input
                type="tel"
                value={data.doctorPhone || ""}
                onChange={(e) =>
                  onChange({ ...data, doctorPhone: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                placeholder="07 1234 5678"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Medicare Details */}
      <div className="border-t pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-xl">🏥</span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
              Medicare Details
            </h3>
            <p className="text-xs text-slate-500 font-bold italic">
              Australian Medicare information
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medicare Number */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Medicare Number
            </label>
            <input
              type="text"
              value={medicare.number || ""}
              onChange={(e) =>
                onChange({
                  ...data,
                  medicare: {
                    ...medicare,
                    number: e.target.value,
                  },
                })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              placeholder="1234 56789 0"
              maxLength={11}
            />
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">
              10 digits (e.g., 1234 56789 0)
            </p>
          </div>

          {/* Individual Reference Number (IRN) */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Reference Number (IRN)
            </label>
            <input
              type="text"
              value={medicare.referenceNumber || ""}
              onChange={(e) =>
                onChange({
                  ...data,
                  medicare: {
                    ...medicare,
                    referenceNumber: e.target.value,
                  },
                })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
              placeholder="1"
              maxLength={1}
            />
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">
              Position on the card (1-9)
            </p>
          </div>

          {/* Medicare Card Expiry */}
          <div>
            <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
              Medicare Card Expiry
            </label>
            <input
              type="month"
              value={medicare.expiryDate || ""}
              onChange={(e) =>
                onChange({
                  ...data,
                  medicare: {
                    ...medicare,
                    expiryDate: e.target.value,
                  },
                })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Private Health Insurance Details */}
      <div className="border-t pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xl">💳</span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
              Private Health Insurance
            </h3>
            <p className="text-xs text-slate-500 font-bold italic">
              Optional - Only if you have private cover
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Has Private Health Insurance Toggle */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <input
              type="checkbox"
              id="hasPrivateHealth"
              checked={privateHealth.hasInsurance || false}
              onChange={(e) =>
                onChange({
                  ...data,
                  privateHealth: {
                    ...privateHealth,
                    hasInsurance: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 text-blue-600 rounded-lg focus:ring-2 ring-yellow-400 border-slate-300"
            />
            <label
              htmlFor="hasPrivateHealth"
              className="font-black text-slate-900 cursor-pointer text-sm"
            >
              I have Private Health Insurance
            </label>
          </div>

          {/* Private Health Details - Only show if they have insurance */}
          {privateHealth.hasInsurance && (
            <div className="space-y-6 pl-4 border-l-4 border-blue-200 mt-4 animate-in fade-in slide-in-from-left-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Provider */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={privateHealth.provider || ""}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        privateHealth: {
                          ...privateHealth,
                          provider: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="e.g., BUPA, Medibank, HCF"
                  />
                </div>

                {/* Membership Number */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                    Membership Number
                  </label>
                  <input
                    type="text"
                    value={privateHealth.membershipNumber || ""}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        privateHealth: {
                          ...privateHealth,
                          membershipNumber: e.target.value,
                        },
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="Enter membership number"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                  Private Health Notes
                </label>
                <textarea
                  value={privateHealth.notes || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      privateHealth: {
                        ...privateHealth,
                        notes: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  rows={2}
                  placeholder="Any specific level of cover or notes..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Medical Notes */}
      <div className="border-t pt-8">
        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
            Additional Medical Notes
          </label>
          <textarea
            value={data.additionalNotes || ""}
            onChange={(e) =>
              onChange({ ...data, additionalNotes: e.target.value })
            }
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            rows={3}
            placeholder="Any other medical information that may be relevant..."
          />
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4">
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
          <span className="text-slate-900 uppercase">Privacy Notice:</span> All
          medical information is stored securely and will only be accessed in
          case of emergency. This information is protected under the Australian
          Privacy Act 1988.
        </p>
      </div>
    </div>
  );
}
