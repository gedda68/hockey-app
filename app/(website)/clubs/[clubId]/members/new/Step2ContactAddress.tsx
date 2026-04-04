"use client";

import { Mail } from "lucide-react";
import SocialMediaEditor from "@/components/SocialMediaEditor";

interface SocialMediaLink {
  platform: string;
  username?: string;
  url: string;
  isPrivate: boolean;
  displayOrder: number;
}

interface Contact {
  primaryEmail: string;
  emailOwnership: string;
  phone: string;
  mobile: string;
}

interface Address {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

interface FormData {
  contact: Contact;
  address: Address;
  [key: string]: unknown;
}

interface Step2ContactAddressProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  socialMedia: SocialMediaLink[];
  setSocialMedia: React.Dispatch<React.SetStateAction<SocialMediaLink[]>>;
}

export function Step2ContactAddress({
  formData,
  setFormData,
  socialMedia,
  setSocialMedia,
}: Step2ContactAddressProps) {
  return (
    <>
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
          <Mail size={24} />
          Contact & Address
        </h2>

        <div className="space-y-6">
          {/* Contact Section */}
          <div>
            <h3 className="text-lg font-black text-slate-700 mb-4">
              Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contact.primaryEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: {
                        ...formData.contact,
                        primaryEmail: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  placeholder="john.smith@example.com"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Email Ownership
                </label>
                <select
                  value={formData.contact.emailOwnership}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: {
                        ...formData.contact,
                        emailOwnership: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                >
                  <option value="Own">Own</option>
                  <option value="Shared">Shared</option>
                  <option value="Parent">Parent/Guardian</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: { ...formData.contact, phone: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  placeholder="07 3123 4567"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={formData.contact.mobile}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact: {
                        ...formData.contact,
                        mobile: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  placeholder="0411 111 111"
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div>
            <h3 className="text-lg font-black text-slate-700 mb-4">
              Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: {
                        ...formData.address,
                        street: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Suburb
                </label>
                <input
                  type="text"
                  value={formData.address.suburb}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: {
                        ...formData.address,
                        suburb: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  placeholder="Brisbane"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  State
                </label>
                <select
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
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
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={formData.address.postcode}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow 4 digits for Australian postcodes
                    if (value === "" || /^\d{0,4}$/.test(value)) {
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          postcode: value,
                        },
                      });
                    }
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  placeholder="4000"
                  maxLength={4}
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 ml-2">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: {
                        ...formData.address,
                        country: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  placeholder="Australia"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6 mt-6">
        <SocialMediaEditor
          socialMedia={socialMedia}
          onChange={setSocialMedia}
          readOnly={false}
        />
      </div>
    </>
  );
}
