// components/admin/members/wizard/AddressStep.tsx
"use client";

export default function AddressStep({
  data,
  onChange,
  errors,
}: {
  data: any;
  onChange: (data: any) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      {/* Street */}
      <div>
        <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
          Street Address *
        </label>
        <input
          type="text"
          value={data.street}
          onChange={(e) => onChange({ ...data, street: e.target.value })}
          className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
            errors.street ? "border-red-500" : "border-slate-200"
          }`}
          placeholder="123 Main Street"
        />
        {errors.street && (
          <p className="text-red-500 text-xs mt-1 font-bold">{errors.street}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Suburb */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
            Suburb *
          </label>
          <input
            type="text"
            value={data.suburb}
            onChange={(e) => onChange({ ...data, suburb: e.target.value })}
            className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
              errors.suburb ? "border-red-500" : "border-slate-200"
            }`}
            placeholder="Brisbane"
          />
          {errors.suburb && (
            <p className="text-red-500 text-xs mt-1 font-bold">
              {errors.suburb}
            </p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
            State *
          </label>
          <select
            value={data.state}
            onChange={(e) => onChange({ ...data, state: e.target.value })}
            className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
              errors.state ? "border-red-500" : "border-slate-200"
            }`}
          >
            <option value="QLD">Queensland</option>
            <option value="NSW">New South Wales</option>
            <option value="VIC">Victoria</option>
            <option value="SA">South Australia</option>
            <option value="WA">Western Australia</option>
            <option value="TAS">Tasmania</option>
            <option value="NT">Northern Territory</option>
            <option value="ACT">Australian Capital Territory</option>
          </select>
          {errors.state && (
            <p className="text-red-500 text-xs mt-1 font-bold">
              {errors.state}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Postcode */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
            Postcode *
          </label>
          <input
            type="text"
            value={data.postcode}
            onChange={(e) => onChange({ ...data, postcode: e.target.value })}
            className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 ${
              errors.postcode ? "border-red-500" : "border-slate-200"
            }`}
            placeholder="4000"
            maxLength={4}
          />
          {errors.postcode && (
            <p className="text-red-500 text-xs mt-1 font-bold">
              {errors.postcode}
            </p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
            Country
          </label>
          <input
            type="text"
            value={data.country}
            onChange={(e) => onChange({ ...data, country: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
          />
        </div>
      </div>
    </div>
  );
}
