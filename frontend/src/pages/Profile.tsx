import { FormEvent, useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  FileText,
  Lock,
  Upload,
  ArrowLeft,
  LogOut,
  Save,
} from "lucide-react";
import {
  ProfileResponse,
  getProfile,
  updatePassword,
  updateProfile,
  uploadPhoto,
} from "../api";

interface ProfileProps {
  onBackHome: () => void;
  onLogout: () => void;
}

function Profile({ onBackHome, onLogout }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = async () => {
    setError("");
    setLoadingProfile(true);

    try {
      const response = await getProfile();
      setProfile(response);
      setFullName(response.full_name || "");
      setPhone(response.phone || "");
      setBio(response.bio || "");
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Unable to fetch profile.");
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await updateProfile({ fullName, phone, bio });
      setProfile(response.profile);
      setSuccess(response.message);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Failed to update profile.");
      }
    }
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await updatePassword({ newPassword });
      setSuccess(response.message);
      setNewPassword("");
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Failed to update password.");
      }
    }
  };

  const handleUploadPhoto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!photoFile) {
      setError("Please choose a photo file first.");
      return;
    }

    try {
      const response = await uploadPhoto(photoFile);
      setSuccess(`${response.message} (${response.file_reference})`);
      setPhotoFile(null);
      await loadProfile();
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Failed to upload photo.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
            <p className="text-slate-600">
              Manage your account settings and preferences
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBackHome}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {loadingProfile ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
            <p className="mt-4 text-slate-600">Loading profile...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Overview */}
            {profile && (
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Account Overview</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Your account information at a glance
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-white text-2xl font-bold">
                      {profile.full_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 grid gap-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <span>{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-slate-500" />
                        <span>{profile.full_name || "Not set"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Profile Form */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Edit Profile</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Update your personal information
                </p>
              </div>
              <div>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium text-slate-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        id="fullName"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        id="phone"
                        placeholder="+1 234 567 8900"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="bio" className="text-sm font-medium text-slate-700">Bio</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <textarea
                        id="bio"
                        placeholder="Tell us about yourself"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="min-h-[100px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </button>
                </form>
              </div>
            </div>

            {/* Change Password */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Change Password</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Update your password to keep your account secure
                </p>
              </div>
              <div>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        id="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Update Password
                  </button>
                </form>
              </div>
            </div>

            {/* Upload Photo */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Profile Photo</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Upload a new profile photo (JPG or PNG)
                </p>
              </div>
              <div>
                <form onSubmit={handleUploadPhoto} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="photo" className="text-sm font-medium text-slate-700">Select Photo</label>
                    <input
                      id="photo"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;