// Real-time Notification System
class NotificationSystem {
    constructor() {
        this.socket = null;
        this.notifications = [];
        this.userId = null;
        this.listeners = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    // Initialize notification system
    async initialize(userId) {
        this.userId = userId;
        await this.connectWebSocket();
        this.loadStoredNotifications();
        this.setupEventListeners();
    }

    // Connect to WebSocket server
    async connectWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // Authenticate with user ID
                this.send({
                    type: 'auth',
                    userId: this.userId
                });
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.handleReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.handleReconnect();
        }
    }

    // Handle WebSocket reconnection
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
        } else {
            console.error('Max reconnection attempts reached');
            this.showConnectionError();
        }
    }

    // Send message through WebSocket
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, message not sent:', data);
        }
    }

    // Handle incoming WebSocket messages
    handleMessage(data) {
        switch (data.type) {
            case 'notification':
                this.handleNotification(data.payload);
                break;
            case 'message':
                this.handleNewMessage(data.payload);
                break;
            case 'favorite':
                this.handleFavoriteUpdate(data.payload);
                break;
            case 'connection_status':
                this.handleConnectionStatus(data.payload);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // Handle new notification
    handleNotification(notification) {
        this.addNotification(notification);
        this.showNotificationToast(notification);
        this.emit('notification', notification);
    }

    // Handle new message
    handleNewMessage(message) {
        this.addNotification({
            id: `msg_${message.id}`,
            type: 'message',
            title: `New message from ${message.senderName}`,
            message: message.content,
            timestamp: new Date().toISOString(),
            read: false,
            data: message
        });
        
        this.emit('message', message);
        this.updateUnreadCount();
    }

    // Handle favorite update
    handleFavoriteUpdate(data) {
        const action = data.action === 'added' ? 'added to' : 'removed from';
        this.addNotification({
            id: `fav_${data.profileId}_${Date.now()}`,
            type: 'favorite',
            title: `Profile ${action} favorites`,
            message: `${data.profileName} was ${action} your favorites`,
            timestamp: new Date().toISOString(),
            read: false,
            data: data
        });
        
        this.emit('favorite', data);
    }

    // Handle connection status
    handleConnectionStatus(status) {
        console.log('Connection status:', status);
        if (status.online) {
            this.hideConnectionError();
        }
    }

    // Add notification to list
    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        this.saveNotifications();
        this.updateNotificationUI();
    }

    // Show notification toast
    showNotificationToast(notification) {
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${notification.type}`;
        toast.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${notification.title}</span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="notification-body">
                    <p class="notification-message">${notification.message}</p>
                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                </div>
            </div>
        `;
        
        // Add styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            max-width: 400px;
            background: ${this.getNotificationColor(notification.type)};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Get notification color by type
    getNotificationColor(type) {
        const colors = {
            message: '#3b82f6',
            favorite: '#10b981',
            system: '#f59e0b',
            error: '#ef4444',
            success: '#10b981',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    // Format timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return date.toLocaleDateString();
    }

    // Update notification UI
    updateNotificationUI() {
        const container = document.getElementById('notifications-container');
        const badge = document.getElementById('notification-badge');
        
        if (container) {
            container.innerHTML = this.renderNotifications();
        }
        
        if (badge) {
            const unreadCount = this.notifications.filter(n => !n.read).length;
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    // Render notifications list
    renderNotifications() {
        if (this.notifications.length === 0) {
            return `
                <div class="notification-empty">
                    <p>No notifications</p>
                </div>
            `;
        }
        
        return this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 data-notification-id="${notification.id}"
                 onclick="notificationSystem.markAsRead('${notification.id}')">
                <div class="notification-icon">
                    ${this.getNotificationIcon(notification.type)}
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <span class="notification-title">${notification.title}</span>
                        <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                </div>
                <button class="notification-delete" onclick="event.stopPropagation(); notificationSystem.deleteNotification('${notification.id}')">
                    ×
                </button>
            </div>
        `).join('');
    }

    // Get notification icon by type
    getNotificationIcon(type) {
        const icons = {
            message: '💬',
            favorite: '❤️',
            system: '⚙️',
            error: '❌',
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Mark notification as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.updateNotificationUI();
            
            // Mark as read on server
            this.send({
                type: 'mark_read',
                notificationId: notificationId
            });
        }
    }

    // Delete notification
    deleteNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveNotifications();
        this.updateNotificationUI();
        
        // Delete from server
        this.send({
            type: 'delete_notification',
            notificationId: notificationId
        });
    }

    // Mark all notifications as read
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.updateNotificationUI();
        
        this.send({
            type: 'mark_all_read'
        });
    }

    // Update unread count
    updateUnreadCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        this.emit('unread_count', unreadCount);
    }

    // Save notifications to localStorage
    saveNotifications() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Failed to save notifications:', error);
        }
    }

    // Load stored notifications
    loadStoredNotifications() {
        try {
            const stored = localStorage.getItem('notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
                this.updateNotificationUI();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    // Show connection error
    showConnectionError() {
        const errorDiv = document.getElementById('connection-error');
        if (errorDiv) {
            errorDiv.style.display = 'block';
        }
    }

    // Hide connection error
    hideConnectionError() {
        const errorDiv = document.getElementById('connection-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // Event emitter
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    // Cleanup
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.listeners.clear();
    }
}

// Create global instance
const notificationSystem = new NotificationSystem();

// Add CSS animations
const notificationStyles = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-toast {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .notification-content {
        padding: 16px;
    }
    
    .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .notification-title {
        font-weight: 600;
        font-size: 14px;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    
    .notification-close:hover {
        background-color: rgba(255,255,255,0.2);
    }
    
    .notification-message {
        margin: 0;
        font-size: 14px;
        line-height: 1.4;
        opacity: 0.9;
    }
    
    .notification-time {
        font-size: 12px;
        opacity: 0.7;
    }
    
    .notification-item {
        display: flex;
        align-items: flex-start;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .notification-item:hover {
        background-color: rgba(255,255,255,0.05);
    }
    
    .notification-item.unread {
        background-color: rgba(59,130,246,0.1);
        border-left: 3px solid #3b82f6;
    }
    
    .notification-item.read {
        opacity: 0.7;
    }
    
    .notification-icon {
        font-size: 20px;
        margin-right: 12px;
        margin-top: 2px;
    }
    
    .notification-item .notification-content {
        flex: 1;
        padding: 0;
    }
    
    .notification-item .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }
    
    .notification-item .notification-title {
        font-weight: 600;
        font-size: 14px;
        color: #fff;
    }
    
    .notification-item .notification-time {
        font-size: 12px;
        color: rgba(255,255,255,0.6);
    }
    
    .notification-item .notification-message {
        font-size: 13px;
        color: rgba(255,255,255,0.8);
        margin: 0;
    }
    
    .notification-delete {
        background: none;
        border: none;
        color: rgba(255,255,255,0.4);
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        margin-left: 8px;
        border-radius: 4px;
        transition: all 0.2s;
    }
    
    .notification-delete:hover {
        color: #ef4444;
        background-color: rgba(239,68,68,0.1);
    }
    
    .notification-empty {
        text-align: center;
        padding: 32px 16px;
        color: rgba(255,255,255,0.6);
    }
    
    #notification-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}
