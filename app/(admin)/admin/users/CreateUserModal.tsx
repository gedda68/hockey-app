// app/(admin)/admin/users/CreateUserModal.tsx
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
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
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

export default function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    associationId: currentUser?.associationId || null,
    associationName: "",
    clubId: currentUser?.clubId || null,
    clubName: "",
    emailVerified: false,
  });

  useEffect(() => {
    if (isOpen && currentUser?.role === "super-admin") {
      loadAssociations();
      loadClubs();
    }
  }, [isOpen, currentUser]);

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
    return passwordRequirements.every((req) => req.test(password));
  };

  const passwordsMatch =
    formData.password && formData.password === formData.confirmPassword;
  const passwordValid = validatePassword(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, associationName, clubName, ...dataToSend } =
        formData;

      // Add verification tracking if email is verified
      const submitData: any = { ...dataToSend };
      if (formData.emailVerified) {
        submitData.emailVerifiedAt = new Date().toISOString();
        submitData.emailVerifiedBy = currentUser?.userId;
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      toast.success("User created successfully!");
      onSuccess();
      onClose();

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "member",
        associationId: currentUser?.associationId || null,
        associationName: "",
        clubId: currentUser?.clubId || null,
        clubName: "",
        emailVerified: false,
      });
      setAssociationSearch("");
      setClubSearch("");
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between rounded-t-[2rem] z-10">
          <div>
            <h2 className="text-2xl font-black text-[#06054e] uppercase">
              Create New User
            </h2>
            <p className="text-sm text-slate-600 font-bold mt-1">
              Add a new user to the system
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
                  placeholder="John"
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
                  placeholder="Doe"
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
                  placeholder="john@example.com"
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
                  placeholder="+61 400 000 000"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
              Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                    placeholder="Enter password"
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
                  Confirm Password *
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
                    required
                    className={`w-full px-4 py-3 pr-12 bg-slate-50 border-2 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none ${
                      formData.confirmPassword
                        ? passwordsMatch
                          ? "border-green-500"
                          : "border-red-500"
                        : "border-slate-200"
                    }`}
                    placeholder="Re-type password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

          {/* Organization - Type-ahead dropdowns for super admin */}
          {currentUser?.role === "super-admin" && (
            <div>
              <h3 className="text-sm font-black uppercase text-slate-700 mb-4">
                Organization
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Association Type-ahead */}
                <div className="relative">
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    Association
                  </label>
                  <div className="relative">
                    <Search
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={formData.associationName || associationSearch}
                      onChange={(e) => {
                        setAssociationSearch(e.target.value);
                        setFormData({
                          ...formData,
                          associationName: e.target.value,
                        });
                        setShowAssociationDropdown(true);
                      }}
                      onFocus={() => setShowAssociationDropdown(true)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                      placeholder="Search associations..."
                    />
                  </div>
                  {showAssociationDropdown &&
                    filteredAssociations.length > 0 && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowAssociationDropdown(false)}
                        />
                        <div className="absolute z-20 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {filteredAssociations.map((assoc) => (
                            <button
                              key={assoc.associationId}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  associationId: assoc.associationId,
                                  associationName: assoc.name,
                                });
                                setAssociationSearch("");
                                setShowAssociationDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                            >
                              <Building2 size={18} className="text-slate-400" />
                              <div>
                                <p className="font-bold text-slate-900">
                                  {assoc.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {assoc.associationId}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  {formData.associationId && (
                    <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-blue-600" />
                        <span className="text-sm font-bold text-blue-800">
                          {formData.associationName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            associationId: null,
                            associationName: "",
                          })
                        }
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Club Type-ahead */}
                <div className="relative">
                  <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                    Club
                  </label>
                  <div className="relative">
                    <Search
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={formData.clubName || clubSearch}
                      onChange={(e) => {
                        setClubSearch(e.target.value);
                        setFormData({ ...formData, clubName: e.target.value });
                        setShowClubDropdown(true);
                      }}
                      onFocus={() => setShowClubDropdown(true)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 ring-yellow-400 outline-none"
                      placeholder="Search clubs..."
                    />
                  </div>
                  {showClubDropdown && filteredClubs.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowClubDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {filteredClubs.map((club) => (
                          <button
                            key={club.clubId}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                clubId: club.clubId,
                                clubName: club.name,
                              });
                              setClubSearch("");
                              setShowClubDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                          >
                            <Building2 size={18} className="text-slate-400" />
                            <div>
                              <p className="font-bold text-slate-900">
                                {club.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {club.clubId}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {formData.clubId && (
                    <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-green-600" />
                        <span className="text-sm font-bold text-green-800">
                          {formData.clubName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            clubId: null,
                            clubName: "",
                          })
                        }
                        className="text-green-600 hover:text-green-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
                  <ShieldCheck size={18} className="text-green-600" />
                  <span className="font-bold text-slate-900">
                    Mark email as verified
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Email will be marked as verified by{" "}
                  <strong>
                    {currentUser?.firstName} {currentUser?.lastName}
                  </strong>{" "}
                  on {new Date().toLocaleDateString()}
                </p>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-bold">
              ℹ️ User will be saved to the <strong>users</strong> collection in
              MongoDB with an <strong>active</strong> status.
              {formData.emailVerified &&
                " Email verification will be recorded."}
            </p>
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
              disabled={isLoading || !passwordValid || !passwordsMatch}
              className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
