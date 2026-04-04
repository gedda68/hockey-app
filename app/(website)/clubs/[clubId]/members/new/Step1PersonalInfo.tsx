"use client";

import { User, Upload, X, Camera } from "lucide-react";
import TypeAheadSelect from "@/components/admin/TypeAheadSelect";

interface SalutationOption { salutationId: string; name: string }
interface GenderOption { genderId: string; name: string }

interface PersonalInfo {
  salutation: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  gender: string;
  photoUrl: string | null;
}

interface FormData {
  personalInfo: PersonalInfo;
  [key: string]: unknown;
}

interface Step1PersonalInfoProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  salutations: SalutationOption[];
  genders: GenderOption[];
  photoPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: () => void;
}

export function Step1PersonalInfo({
  formData,
  setFormData,
  salutations,
  genders,
  photoPreview,
  fileInputRef,
  handlePhotoChange,
  removePhoto,
}: Step1PersonalInfoProps) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
      <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
        <User size={24} />
        Personal Information
      </h2>

      {/* Profile Picture */}
      <div className="mb-8">
        <label className="text-xs font-black uppercase text-slate-400 ml-2">
          Profile Picture (Optional)
        </label>
        <div className="mt-2 flex items-center gap-6">
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Profile preview"
                className="w-32 h-32 rounded-2xl object-cover border-4 border-slate-200"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
              <Camera size={32} className="text-slate-400" />
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all"
            >
              <Upload size={18} />
              {photoPreview ? "Change Photo" : "Upload Photo"}
            </button>
            <p className="text-xs text-slate-500 mt-2">
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Salutation - Type Ahead */}
        <div>
          <TypeAheadSelect
            label="Salutation"
            options={salutations}
            value={formData.personalInfo.salutation}
            onChange={(value) =>
              setFormData({
                ...formData,
                personalInfo: {
                  ...formData.personalInfo,
                  salutation: value,
                },
              })
            }
            displayField="name"
            valueField="id"
            fullNameField="fullName"
            placeholder="Mr, Mrs, Dr..."
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400 ml-2">
            First Name *
          </label>
          <input
            type="text"
            required
            value={formData.personalInfo.firstName}
            onChange={(e) =>
              setFormData({
                ...formData,
                personalInfo: {
                  ...formData.personalInfo,
                  firstName: e.target.value,
                },
              })
            }
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            placeholder="John"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400 ml-2">
            Last Name *
          </label>
          <input
            type="text"
            required
            value={formData.personalInfo.lastName}
            onChange={(e) =>
              setFormData({
                ...formData,
                personalInfo: {
                  ...formData.personalInfo,
                  lastName: e.target.value,
                },
              })
            }
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            placeholder="Smith"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400 ml-2">
            Date of Birth *
          </label>
          <input
            type="date"
            required
            value={formData.personalInfo.dateOfBirth}
            onChange={(e) =>
              setFormData({
                ...formData,
                personalInfo: {
                  ...formData.personalInfo,
                  dateOfBirth: e.target.value,
                },
              })
            }
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-black uppercase text-slate-400 ml-2">
            Gender *
          </label>
          <select
            required
            value={formData.personalInfo.gender}
            onChange={(e) =>
              setFormData({
                ...formData,
                personalInfo: {
                  ...formData.personalInfo,
                  gender: e.target.value,
                },
              })
            }
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
          >
            <option value="">Select gender</option>
            {genders.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
