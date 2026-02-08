// components/admin/members/wizard/ReviewStep.tsx
"use client";

import { Edit2, CheckCircle, AlertCircle, Users } from "lucide-react";

export default function ReviewStep({
  formData,
  onEdit,
}: {
  formData: any;
  onEdit: (step: number) => void;
}) {
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const formatMonthYear = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month] = dateStr.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-800 font-bold">
          ✓ Please review all information before submitting. You can edit any
          section by clicking the edit button.
        </p>
      </div>

      {/* Personal Info */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-lg">
            Personal Information
          </h3>
          <button
            onClick={() => onEdit(1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {formData.personalInfo.salutation && (
            <InfoItem
              label="Salutation"
              value={formData.personalInfo.salutation}
            />
          )}
          <InfoItem
            label="First Name"
            value={formData.personalInfo.firstName}
          />
          {formData.personalInfo.middleName && (
            <InfoItem
              label="Middle Name"
              value={formData.personalInfo.middleName}
            />
          )}
          <InfoItem label="Last Name" value={formData.personalInfo.lastName} />
          <InfoItem
            label="Display Name"
            value={
              formData.personalInfo.displayName ||
              `${formData.personalInfo.firstName}${formData.personalInfo.middleName ? " " + formData.personalInfo.middleName : ""} ${formData.personalInfo.lastName}`
            }
            className="col-span-2"
          />
          <InfoItem
            label="Date of Birth"
            value={formData.personalInfo.dateOfBirth}
          />
          <InfoItem
            label="Age"
            value={`${calculateAge(formData.personalInfo.dateOfBirth)} years`}
          />
          <InfoItem label="Gender" value={formData.personalInfo.gender} />
        </div>

        {/* Related Members - Only show if they exist */}
        {formData.personalInfo.relatedMembers &&
          formData.personalInfo.relatedMembers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-300">
              <div className="flex items-center gap-2 mb-3">
                <Users className="text-blue-600" size={18} />
                <label className="text-xs font-black uppercase text-slate-400">
                  Related Members ({formData.personalInfo.relatedMembers.length}
                  )
                </label>
              </div>
              <div className="space-y-2">
                {formData.personalInfo.relatedMembers.map(
                  (member: any, index: number) => (
                    <div
                      key={member.id || index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {member.relationshipType}
                        </p>
                      </div>
                      {member.memberId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                          {member.memberId}
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
      </div>

      {/* Contact Info */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-lg">
            Contact Information
          </h3>
          <button
            onClick={() => onEdit(2)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Email" value={formData.contact.email} />
          <InfoItem label="Phone" value={formData.contact.phone || "-"} />
          <InfoItem label="Mobile" value={formData.contact.mobile || "-"} />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-lg">
            Emergency Contact
          </h3>
          <button
            onClick={() => onEdit(3)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem
            label="Name"
            value={formData.contact.emergencyContact.name}
          />
          <InfoItem
            label="Relationship"
            value={formData.contact.emergencyContact.relationship}
          />
          <InfoItem
            label="Phone"
            value={formData.contact.emergencyContact.phone}
          />
          <InfoItem
            label="Email"
            value={formData.contact.emergencyContact.email || "-"}
          />
        </div>
      </div>

      {/* Address */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-lg">Address</h3>
          <button
            onClick={() => onEdit(4)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem
            label="Street"
            value={formData.address.street}
            className="col-span-2"
          />
          <InfoItem label="Suburb" value={formData.address.suburb} />
          <InfoItem label="State" value={formData.address.state} />
          <InfoItem label="Postcode" value={formData.address.postcode} />
          <InfoItem label="Country" value={formData.address.country} />
        </div>
      </div>

      {/* Membership */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-lg">
            Membership Details
          </h3>
          <button
            onClick={() => onEdit(5)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem
              label="Club"
              value={formData.membership.clubName || "No Club Selected"}
            />
            <InfoItem label="Join Date" value={formData.membership.joinDate} />
            <InfoItem label="Status" value={formData.membership.status} />
          </div>

          {formData.membership.membershipTypes.length > 0 && (
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Membership Types
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.membership.membershipTypes.map((type: string) => (
                  <span
                    key={type}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {formData.roles && formData.roles.length > 0 && (
            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.roles.map((role: string) => (
                  <span
                    key={role}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-lg">
            Medical Information
          </h3>
          <button
            onClick={() => onEdit(6)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>

        {/* Medical Details */}
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">
              Medical Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label="Conditions"
                value={formData.medical?.conditions || "-"}
                className="col-span-2"
              />
              <InfoItem
                label="Medications"
                value={formData.medical?.medications || "-"}
                className="col-span-2"
              />
              <InfoItem
                label="Allergies"
                value={formData.medical?.allergies || "-"}
                className="col-span-2"
              />
              <InfoItem
                label="Doctor Name"
                value={formData.medical?.doctorName || "-"}
              />
              <InfoItem
                label="Doctor Phone"
                value={formData.medical?.doctorPhone || "-"}
              />
            </div>
          </div>

          {/* Medicare Details */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🏥</span>
              <h4 className="font-bold text-slate-700 text-sm uppercase">
                Medicare Details
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label="Medicare Number"
                value={formData.medical?.medicare?.number || "-"}
              />
              <InfoItem
                label="Reference Number (IRN)"
                value={formData.medical?.medicare?.referenceNumber || "-"}
              />
              <InfoItem
                label="Card Expiry"
                value={
                  formData.medical?.medicare?.expiryDate
                    ? formatMonthYear(formData.medical.medicare.expiryDate)
                    : "-"
                }
              />
              <InfoItem
                label="Card Color"
                value={
                  formData.medical?.medicare?.cardColor
                    ? formData.medical.medicare.cardColor
                        .charAt(0)
                        .toUpperCase() +
                      formData.medical.medicare.cardColor.slice(1)
                    : "-"
                }
              />
            </div>
          </div>

          {/* Private Health Insurance */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💳</span>
              <h4 className="font-bold text-slate-700 text-sm uppercase">
                Private Health Insurance
              </h4>
            </div>

            {formData.medical?.privateHealth?.hasInsurance ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="text-green-600" size={20} />
                  <span className="font-bold text-green-800">
                    Has Private Health Insurance
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Provider"
                    value={formData.medical.privateHealth.provider || "-"}
                  />
                  <InfoItem
                    label="Membership Number"
                    value={
                      formData.medical.privateHealth.membershipNumber || "-"
                    }
                  />
                  <InfoItem
                    label="Policy Type"
                    value={
                      formData.medical.privateHealth.policyType
                        ? formData.medical.privateHealth.policyType ===
                          "hospital-only"
                          ? "Hospital Only"
                          : formData.medical.privateHealth.policyType ===
                              "extras-only"
                            ? "Extras Only"
                            : formData.medical.privateHealth.policyType ===
                                "combined"
                              ? "Combined (Hospital + Extras)"
                              : "-"
                        : "-"
                    }
                  />
                  <InfoItem
                    label="Cover Level"
                    value={
                      formData.medical.privateHealth.coverLevel
                        ? formData.medical.privateHealth.coverLevel
                            .charAt(0)
                            .toUpperCase() +
                          formData.medical.privateHealth.coverLevel.slice(1)
                        : "-"
                    }
                  />
                  <InfoItem
                    label="Policy Expiry"
                    value={formData.medical.privateHealth.expiryDate || "-"}
                  />
                  <InfoItem
                    label="Ambulance Cover"
                    value={
                      formData.medical.privateHealth.ambulanceCover
                        ? "Yes"
                        : "No"
                    }
                  />
                  {formData.medical.privateHealth.emergencyNumber && (
                    <InfoItem
                      label="Emergency Number"
                      value={formData.medical.privateHealth.emergencyNumber}
                      className="col-span-2"
                    />
                  )}
                  {formData.medical.privateHealth.notes && (
                    <InfoItem
                      label="Additional Notes"
                      value={formData.medical.privateHealth.notes}
                      className="col-span-2"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-300">
                <AlertCircle className="text-slate-500" size={20} />
                <span className="text-slate-600 font-bold">
                  No Private Health Insurance
                </span>
              </div>
            )}
          </div>

          {/* Additional Medical Notes */}
          {formData.medical?.additionalNotes && (
            <div className="border-t pt-4">
              <InfoItem
                label="Additional Medical Notes"
                value={formData.medical.additionalNotes}
                className="col-span-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Additional Notes (if any) */}
      {formData.notes && (
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="font-black text-slate-900 text-lg mb-4">
            Additional Notes
          </h3>
          <p className="text-slate-700 whitespace-pre-wrap">{formData.notes}</p>
        </div>
      )}

      {/* Data Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-black text-blue-900 mb-2 flex items-center gap-2">
          <CheckCircle size={20} />
          Ready to Submit
        </h4>
        <p className="text-sm text-blue-800">
          All information has been collected. Click "Create Member" to save this
          member to the database.
        </p>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-black uppercase text-slate-400 mb-1 block">
        {label}
      </label>
      <p className="text-slate-900 font-bold break-words">{value}</p>
    </div>
  );
}
