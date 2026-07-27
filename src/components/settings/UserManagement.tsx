"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { Shield, Trash2, Key, Users, Copy, Loader2, Plus, Settings2, Check, X } from "lucide-react";
import { auth } from "@/lib/firebase";

export function UserManagement() {
  const [users, setUsers] = useState<any>({});
  const [invites, setInvites] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { success, error } = useToast();
  const currentUser = auth.currentUser;

  const loadData = async () => {
    try {
      const data = await api.users.getUsers();
      setUsers(data.users || {});
      setInvites(data.invites || {});
    } catch (err) {
      console.error(err);
      error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateInvite = async (role: string) => {
    setGenerating(true);
    try {
      const { token } = await api.users.generateInvite(role);
      const inviteUrl = `${window.location.origin}/register?invite=${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      success(`Invite link for ${role} copied to clipboard!`);
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInvite = async (token: string) => {
    try {
      await api.users.deleteInvite(token);
      success("Invite deleted");
      loadData();
    } catch (err) {
      error("Failed to delete invite");
    }
  };

  const handleChangeRole = async (email: string, newRole: string) => {
    try {
      await api.users.changeRole(email, newRole);
      success("Role updated");
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || "Failed to change role");
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;
    try {
      await api.users.deleteUser(email);
      success("User deleted");
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || "Failed to delete user");
    }
  };

  const handleTogglePermission = async (email: string, permKey: string, currentValue: boolean) => {
    try {
      await api.users.updatePermissions(email, { [permKey]: !currentValue });
      success("Permissions updated");
      loadData();
    } catch (err: any) {
      error(err.response?.data?.error || "Failed to update permissions");
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  const userEntries = Object.entries(users);
  const inviteEntries = Object.entries(invites);

  return (
    <div className="space-y-6">
      {/* Users List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Active Users</h3>
          </div>
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-medium">
            {userEntries.length} Users
          </span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {userEntries.map(([email, user]: [string, any]) => (
            <div key={email} className="flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-4">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    {email}
                    {email === currentUser?.email && (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <select 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    value={user.role}
                    onChange={(e) => handleChangeRole(email, e.target.value)}
                    disabled={email === currentUser?.email || email === "setupg98@gmail.com"}
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="home_member">Home Member</option>
                    <option value="guest">Guest</option>
                  </select>

                  <button
                    onClick={() => setExpandedUser(expandedUser === email ? null : email)}
                    className={`p-2 rounded-lg transition-colors ${expandedUser === email ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                    title="Granular Permissions"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteUser(email)}
                    disabled={email === currentUser?.email || email === "setupg98@gmail.com"}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {expandedUser === email && (
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-100 dark:border-slate-700/50">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Granular Permissions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { key: "canUpload", label: "Upload Files" },
                      { key: "canDelete", label: "Delete Files" },
                      { key: "canShare", label: "Create Share Links" },
                      { key: "canDownload", label: "Download Files" }
                    ].map(perm => {
                      const defaultPermissions: any = {
                        super_admin: { canUpload: true, canDelete: true, canShare: true, canDownload: true },
                        admin: { canUpload: true, canDelete: true, canShare: true, canDownload: true },
                        home_member: { canUpload: true, canDelete: false, canShare: false, canDownload: true },
                        guest: { canUpload: false, canDelete: false, canShare: false, canDownload: true }
                      };
                      const roleDefaults = defaultPermissions[user.role] || defaultPermissions.guest;
                      const isEnabled = user.permissions?.[perm.key] ?? roleDefaults[perm.key];
                      const disabled = email === currentUser?.email || email === "setupg98@gmail.com";
                      
                      return (
                        <button
                          key={perm.key}
                          onClick={() => handleTogglePermission(email, perm.key, isEnabled)}
                          disabled={disabled}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            isEnabled
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400"
                              : "bg-white border-slate-200 text-gray-500 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-400"
                          } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-indigo-300"}`}
                        >
                          {perm.label}
                          {isEnabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite System */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-indigo-500" />
              Generate Invite Link
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create one-time secure links to invite people to your server.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <select id="role-select" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500">
              <option value="home_member">Home Member</option>
              <option value="guest">Guest</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button
              onClick={() => {
                const select = document.getElementById('role-select') as HTMLSelectElement;
                handleGenerateInvite(select.value);
              }}
              disabled={generating}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate
            </button>
          </div>
        </div>

        {inviteEntries.length > 0 && (
          <div className="mt-6 border-t border-slate-100 dark:border-slate-700/50 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Pending Invites</h4>
            <div className="space-y-2">
              {inviteEntries.map(([token, invite]: [string, any]) => (
                <div key={token} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      invite.role === 'super_admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' :
                      invite.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    }`}>
                      {invite.role.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created by {invite.createdBy} • {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/register?invite=${token}`);
                        success("Invite link copied!");
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvite(token)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Revoke invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
