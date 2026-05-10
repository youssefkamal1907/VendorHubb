import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import toast from 'react-hot-toast';
import { notifAPI, getSignalRNotificationsUrl } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hubConnection, setHubConnection] = useState(null);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    if (hubConnection) hubConnection.stop();
    setHubConnection(null);
  }, [hubConnection]);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notifAPI.getAll();
      const data = res.data.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch { /* silent */ }
  }, [user]);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    await notifAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  // Connect SignalR when user logs in
  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const token = localStorage.getItem('token');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${getSignalRNotificationsUrl()}?access_token=${token}`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    connection.on('ReceiveNotification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Show toast based on type
      const icons = { NewOrder: '🛒', ProductApproved: '✅', ProductRejected: '❌', VendorApproved: '🎉', VendorRejected: '❌' };
      toast(notif.message, { icon: icons[notif.type] || '🔔', duration: 5000 });
    });

    connection.start().catch(() => {});
    setHubConnection(connection);

    return () => connection.stop();
  }, [user?.id]); // eslint-disable-line

  return (
    <AuthContext.Provider value={{ user, login, logout, notifications, unreadCount, markAllRead, loadNotifications }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
