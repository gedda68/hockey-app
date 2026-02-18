// app/(admin)/admin/users/EditUserModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLE_DEFINITIONS, type UserRole } from "@/lib/types/roles";
import {
  X,
  Save,
  Loader,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Search,
  Building2,
  Ban,
  AlertTriangle,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  associationId: string | null;
  clubId: string | null;
  status: "active" | "inactive" | "suspended";
  emailVerified: boolean;
  emailVerifiedAt?: string;
  emailVerifiedBy?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Association {
  associationId: string;
  name: string;
}

interface Club {
  clubId: string;
  name: string;
  associationId?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (pwd) => pwd.length >= 8 },
  {
    label: "At least 1 capital letter (A-Z)",
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  { label: "At least 1 number (0-9)", test: (pwd) => /[0-9]/.test(pwd) },
  {
    label: "At least 1 special character (!@#$%^&*)",
    test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  },
];

export default function EditUserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [verifierName, setVerifierName] = useState("");

  // Type-ahead state
  const [associations, setAssociations] = useState<Association[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [associationSearch, setAssociationSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");
  const [showAssociationDropdown, setShowAssociationDropdown] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "member" as UserRole,
    associationId: null as string | null,
    associationName: "",
    clubId: null as string | null,
    clubName: "",
    status: "active" as "active" | "inactive" | "suspended",
    emailVerified: false,
  });

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
        password: "",
        confirmPassword: "",
        role: user.role,
        associationId: user.associationId,
        associationName: "",
        clubId: user.clubId,
        clubName: "",
        status: user.status,
        emailVerified: user.emailVerified || false,
      });

      if (user.associationId) {
        loadAssociationName(user.associationId);
      }
      if (user.clubId) {
        loadClubName(user.clubId);
      }
      if (user.emailVerifiedBy) {
        loadVerifierName(user.emailVerifiedBy);
      }
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && currentUser?.role === "super-admin") {
      loadAssociations();
      loadClubs();
    }
  }, [isOpen, currentUser]);

  const loadAssociationName = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/associations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, associationName: data.name }));
      }
    } catch (error) {
      console.error("Error loading association:", error);
    }
  };

  const loadClubName = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/clubs/${id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, clubName: data.name }));
      }
    } catch (error) {
      console.error("Error loading club:", error);
    }
  };

  const loadVerifierName = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setVerifierName(`${data.firstName} ${data.lastName}`);
      }
    } catch (error) {
      console.error("Error loading verifier:", error);
    }
  };

  const loadAssociations = async () => {
    try {
      const response = await fetch("/api/admin/associations");
      if (response.ok) {
        const data = await response.json();
        setAssociations(data);
      }
    } catch (error) {
      console.error("Error loading associations:", error);
    }
  };

  const loadClubs = async () => {
    try {
      const response = await fetch("/api/admin/clubs");
      if (response.ok) {
        const data = await response.json();
        setClubs(data);
      }
    } catch (error) {
      console.error("Error loading clubs:", error);
    }
  };

  const filteredAssociations = associations.filter((assoc) =>
    assoc.name.toLowerCase().includes(associationSearch.toLowerCase())
  );

  const filteredClubs = clubs.filter((club) => {
    const matchesSearch = club.name
      .toLowerCase()
      .includes(clubSearch.toLowerCase());
    if (formData.associationId) {
      return matchesSearch && club.associationId === formData.associationId;
    }
    return matchesSearch;
  });

  const validatePassword = (password: string): boolean => {
    if (!changePassword || !password) return true;
    return passwordRequirements.every((req) => req.test(password));
  };

  const passwordsMatch =
    !changePassword || formData.password === formData.confirmPassword;
  const passwordValid = validatePassword(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (changePassword && !passwordValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    if (changePassword && !passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, associationName, clubName, ...dataToSend } =
        formData;

      const updateData: any = {
        firstName: dataToSend.firstName,
        lastName: dataToSend.lastName,
        email: dataToSend.email,
        phone: dataToSend.phone,
        role: dataToSend.role,
        associationId: dataToSend.associationId,
        clubId: dataToSend.clubId,
        status: dataToSend.status,
        emailVerified: dataToSend.emailVerified,
      };

      // Add verification tracking if being verified now
      if (dataToSend.emailVerified && !user?.emailVerified) {
        updateData.emailVerifiedAt = new Date().toISOString();
        updateData.emailVerifiedBy = currentUser?.userId;
      } else if (!dataToSend.emailVerified && user?.emailVerified) {
        // If unchecking verification, clear the fields
        updateData.emailVerifiedAt = null;
        updateData.emailVerifiedBy = null;
      }

      if (changePassword && dataToSend.password) {
        updateData.password = dataToSend.password;
      }

      const response = await fetch(`/api/admin/users/${user?.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      toast.success("User updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableRoles = (): UserRole[] => {
    if (!currentUser) return [];
    if (currentUser.role === "super-admin") {
      return Object.keys(ROLE_DEFINITIONS) as UserRole[];
    }
    if (currentUser.role === "association-admin") {
      return [
        "association-admin",
        "club-admin",
        "coach",
        "manager",
        "umpire",
        "volunteer",
        "member",
        "parent",
      ];
    }
    if (currentUser.role === "club-admin") {
      return ["coach", "manager", "volunteer", "member", "parent"];
    }
    return ["member"];
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between rounded-t-[2rem] z-10">
          <div>
            <h2 className="text-2xl font-black text-[#06054e] uppercase">
              Edit User
            </h2>
            <p className="text-sm text-slate-600 font-bold mt-1">
              Update user information and permissions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
              Security
            </h3>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => {
                  setChangePassword(e.target.checked);
                  if (!e.target.checked) {
                    setFormData({
                      ...formData,
                      password: "",
                      confirmPassword: "",
                    });
                  }
                }}
                className="w-5 h-5 rounded border-2 border-slate-300"
              />
              <span className="text-sm font-bold text-slate-700">
                Change Password
              </span>
            </label>

            {changePassword && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={changePassword}
                      className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required={changePassword}
                      className={`w-full px-4 py-3 pr-12 bg-slate-50 border-2 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none ${
                        formData.confirmPassword
                          ? passwordsMatch
                            ? "border-green-500"
                            : "border-red-500"
                          : "border-slate-200"
                      }`}
                      placeholder="Re-type new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <div className="mt-2 flex items-center gap-2">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle size={16} className="text-green-600" />
                          <span className="text-sm font-bold text-green-600">
                            Passwords match
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-red-600" />
                          <span className="text-sm font-bold text-red-600">
                            Passwords do not match
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-black uppercase text-slate-600 mb-3">
                    Password Requirements:
                  </p>
                  <div className="space-y-2">
                    {passwordRequirements.map((req, index) => {
                      const passes = req.test(formData.password);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          {passes ? (
                            <CheckCircle
                              size={16}
                              className="text-green-600 flex-shrink-0"
                            />
                          ) : (
                            <XCircle
                              size={16}
                              className="text-slate-300 flex-shrink-0"
                            />
                          )}
                          <span
                            className={`text-sm font-bold ${passes ? "text-green-700" : "text-slate-500"}`}
                          >
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
              Role & Permissions
            </h3>
            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
              >
                {getAvailableRoles().map((role) => {
                  const def = ROLE_DEFINITIONS[role];
                  return (
                    <option key={role} value={role}>
                      {def.icon} {def.label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Organization (same type-ahead as create - truncated for space) */}
          {currentUser?.role === "super-admin" && (
            <div>
              <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
                Organization
              </h3>
              <p className="text-sm text-slate-600">
                Use the type-ahead fields to change association/club (same as
                create modal)
              </p>
            </div>
          )}

          {/* Email Verification */}
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
              Email Verification
            </h3>
            <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-yellow-400 transition-colors">
              <input
                type="checkbox"
                checked={formData.emailVerified}
                onChange={(e) =>
                  setFormData({ ...formData, emailVerified: e.target.checked })
                }
                className="w-5 h-5 mt-0.5 rounded border-2 border-slate-300"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={18}
                    className={
                      formData.emailVerified
                        ? "text-green-600"
                        : "text-slate-400"
                    }
                  />
                  <span className="font-bold text-slate-900">
                    Email Verified
                  </span>
                </div>
                {user.emailVerified && user.emailVerifiedAt && (
                  <div className="mt-2 text-sm text-slate-600">
                    <p className="font-bold">
                      ✅ Verified on{" "}
                      {new Date(user.emailVerifiedAt).toLocaleDateString()}
                    </p>
                    {verifierName && <p>by {verifierName}</p>}
                  </div>
                )}
                {!formData.emailVerified && (
                  <p className="text-sm text-slate-600 mt-1">
                    Email is not verified
                  </p>
                )}
                {formData.emailVerified && !user.emailVerified && (
                  <p className="text-sm text-green-700 mt-1 font-bold">
                    Will be verified by {currentUser?.firstName}{" "}
                    {currentUser?.lastName} on save
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* User Status */}
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
              User Status
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.status === "active"
                    ? "bg-green-50 border-green-500"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === "active"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-bold text-sm">Active</p>
                  <p className="text-xs text-slate-600">Can log in</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.status === "inactive"
                    ? "bg-slate-50 border-slate-500"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={formData.status === "inactive"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-bold text-sm">Inactive</p>
                  <p className="text-xs text-slate-600">Cannot log in</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.status === "suspended"
                    ? "bg-red-50 border-red-500"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="suspended"
                  checked={formData.status === "suspended"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-bold text-sm">Suspended</p>
                  <p className="text-xs text-slate-600">Blocked</p>
                </div>
              </label>
            </div>

            {formData.status === "inactive" && (
              <div className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="text-yellow-600 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-bold text-yellow-800">
                      User will be deactivated
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      They will not be able to log in until reactivated by an
                      administrator.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {formData.status === "suspended" && (
              <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Ban
                    size={20}
                    className="text-red-600 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      User will be suspended
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Account will be blocked and require admin intervention to
                      restore access.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                (changePassword && (!passwordValid || !passwordsMatch))
              }
              className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
