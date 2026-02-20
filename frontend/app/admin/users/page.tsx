'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types/admin';

// Mock data - replace with actual API calls
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://via.placeholder.com/40',
    role: 'CREATOR',
    status: 'ACTIVE',
    createdAt: '2026-01-15T10:30:00Z',
    lastLogin: '2026-02-20T08:00:00Z',
    totalContent: 25,
    earnings: 15420,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: 'https://via.placeholder.com/40',
    role: 'SUBSCRIBER',
    status: 'ACTIVE',
    createdAt: '2026-01-20T14:20:00Z',
    lastLogin: '2026-02-19T22:30:00Z',
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: 'CREATOR',
    status: 'SUSPENDED',
    createdAt: '2026-01-10T09:00:00Z',
    lastLogin: '2026-02-15T16:45:00Z',
    totalContent: 12,
    earnings: 5230,
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    role: 'SUBSCRIBER',
    status: 'PENDING',
    createdAt: '2026-02-18T11:00:00Z',
  },
  {
    id: '5',
    name: 'Tom Brown',
    email: 'tom@example.com',
    avatar: 'https://via.placeholder.com/40',
    role: 'CREATOR',
    status: 'INACTIVE',
    createdAt: '2025-12-01T08:30:00Z',
    lastLogin: '2026-01-10T14:00:00Z',
    totalContent: 5,
    earnings: 890,
  },
  {
    id: '6',
    name: 'Emily Davis',
    email: 'emily@example.com',
    avatar: 'https://via.placeholder.com/40',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2025-11-15T10:00:00Z',
    lastLogin: '2026-02-20T09:30:00Z',
  },
];

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  CREATOR: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SUBSCRIBER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  INACTIVE: 'bg-gray-500/20 text-gray-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchUsers = async () => {
      setIsLoading(true);
      // Replace with actual API call:
      // const res = await fetch('/api/v1/users');
      // const data = await res.json();
      
      await new Promise((resolve) => setTimeout(resolve, 600));
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
      setIsLoading(false);
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((user) => user.status === statusFilter);
    }

    setFilteredUsers(result);
  }, [searchQuery, roleFilter, statusFilter, users]);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    
    // Replace with actual API call:
    // await fetch(`/api/v1/users/${userId}/status`, {
    //   method: 'PATCH',
    //   body: JSON.stringify({ status: newStatus }),
    // });

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, status: newStatus as User['status'] } : user
      )
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="animate-pulse h-12 bg-slate-800 rounded-lg"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 mt-1">
              Manage {filteredUsers.length} of {users.length} users
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
            <span>+</span>
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  🔍
                </span>
              </div>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CREATOR">Creator</option>
              <option value="SUBSCRIBER">Subscriber</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Last Login</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No users found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || 'https://via.placeholder.com/40'}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              user.status === 'ACTIVE'
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-white transition-colors">
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Showing {filteredUsers.length} results
          </p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-slate-800 text-gray-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-4 py-2 bg-slate-800 text-gray-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
