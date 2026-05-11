import { useEffect, useState } from "react";
import {
  Home,
  User,
  Settings,
  LogOut,
  Activity,
  Users,
  CreditCard,
  TrendingUp,
  Banknote,
} from "lucide-react";
import { getProfile, getProfilePhotoBlob, ProfileResponse } from "../api";

interface DashboardProps {
  onGoProfile: () => void;
  onGoLoans: () => void;
  onLogout: () => void;
  onGoLanding: () => void;
}

function Dashboard({ onGoProfile, onGoLoans, onLogout, onGoLanding }: DashboardProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const displayName = profile?.first_name || profile?.username || "";
  const initials = profile?.first_name?.charAt(0).toUpperCase() || "U";

  useEffect(() => {
    let active = true;

    const loadDashboardProfile = async () => {
      try {
        const profileResponse = await getProfile();
        if (!active) return;
        setProfile(profileResponse);

        if (!profileResponse.photo_filename || !profileResponse.photo_mime_type) {
          setPhotoUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return null;
          });
          return;
        }

        const photoBlob = await getProfilePhotoBlob();
        if (!active || !photoBlob) {
          setPhotoUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return null;
          });
          return;
        }

        const nextPhotoUrl = URL.createObjectURL(photoBlob);
        setPhotoUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return nextPhotoUrl;
        });
      } catch {
      }
    };

    loadDashboardProfile();

    return () => {
      active = false;
      setPhotoUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
    };
  }, []);

  const stats = [
    {
      title: "Total Users",
      value: "2,350",
      change: "+180 from last month",
      icon: Users,
    },
    {
      title: "Active Sessions",
      value: "1,247",
      change: "+20% from last hour",
      icon: Activity,
    },
    {
      title: "Revenue",
      value: "$45,231",
      change: "+12% from last month",
      icon: CreditCard,
    },
    {
      title: "Growth",
      value: "+573",
      change: "+201 since last week",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold">Dashboard</span>
        </div>
        <nav className="space-y-1 p-4">
          <button className="flex w-full items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900">
            <Home className="h-4 w-4" />
            Home
          </button>
          <button
            onClick={onGoLoans}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <Banknote className="h-4 w-4" />
            Loans
          </button>
          <button
            onClick={onGoProfile}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <User className="h-4 w-4" />
            Profile
          </button>
          <button
            onClick={onGoLanding}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            <h1 className="text-lg font-semibold">
              Welcome back{displayName ? `, ${displayName}` : ""}!
            </h1>
            <p className="text-sm text-slate-600">
              Here's what's happening with your account today.
            </p>
          </div>
          <button
            onClick={onGoProfile}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span className="mr-2 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-semibold text-white">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onError={() => setPhotoUrl(null)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </span>
            Profile
          </button>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium">{stat.title}</h3>
                  <stat.icon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-slate-500">{stat.change}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold">Recent Activity</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Your recent actions and notifications.
                </p>
              </div>
              <div>
                <div className="space-y-4">
                  {[
                    {
                      action: "Profile updated",
                      time: "2 hours ago",
                      icon: User,
                    },
                    {
                      action: "Logged in from new device",
                      time: "5 hours ago",
                      icon: Activity,
                    },
                    {
                      action: "Password changed",
                      time: "2 days ago",
                      icon: Settings,
                    },
                    {
                      action: "Account created",
                      time: "1 week ago",
                      icon: Users,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <item.icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-slate-500">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold">Quick Actions</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Frequently used actions for your account.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  className="inline-flex w-full items-center justify-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  onClick={onGoProfile}
                >
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </button>
                <button
                  className="inline-flex w-full items-center justify-start rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={onGoProfile}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Change Password
                </button>
                <button
                  className="inline-flex w-full items-center justify-start rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={onGoProfile}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upload Photo
                </button>
                <button
                  className="inline-flex w-full items-center justify-start rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  onClick={onGoLanding}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Landing
                </button>
              </div>
            </div>
          </div>

          {/* Account Info */}
          {profile && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold">Account Information</h3>
                <p className="text-sm text-slate-600 mt-1">Your personal account details.</p>
              </div>
              <div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Email
                    </p>
                    <p className="text-sm">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Name
                    </p>
                    <p className="text-sm">{`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Username
                    </p>
                    <p className="text-sm">{profile.username || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Birthday
                    </p>
                    <p className="text-sm">{profile.birthday || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Member Since
                    </p>
                    <p className="text-sm">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
