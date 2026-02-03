'use client';

import { useEffect, useState } from 'react';
import { Search, MoreVertical, UserCheck, UserX, Mail, Calendar, Wallet } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    cards: number;
    deposits: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <p className="text-gray-400 mt-1">Manage your platform users</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Users List */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Balance</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Cards</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Deposits</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name || 'No name'}</p>
                          <p className="text-gray-400 text-sm flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 text-white">
                        <Wallet className="w-4 h-4 text-green-400" />
                        <span>${user.balance.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white">{user._count.cards}</td>
                    <td className="px-6 py-4 text-white">{user._count.deposits}</td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                          <UserX className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery ? 'No users found matching your search' : 'No users yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
