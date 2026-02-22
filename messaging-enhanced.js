// Enhanced messaging functionality - Add this to /messages after the existing JavaScript

// Initialize Socket.IO and enhanced features
function initializeMessaging() {
    // Initialize Socket.IO if not already done
    if (!window.socket) {
        initializeSocket();
    }
    
    // Request notification permission
    requestNotificationPermission();
    
    // Load current user
    getCurrentUser().then(user => {
        currentUser = user;
        loadConversations();
    });
}

// Enhanced file upload with preview
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            showFilePreview(file);
        }
    });
}

// Enhanced conversation rendering with online status
function renderConversations() {
    const conversationsList = document.getElementById('conversationsList');
    conversationsList.innerHTML = '';

    if (conversations.length === 0) {
        conversationsList.innerHTML = '<div class="no-conversations">No conversations yet</div>';
        return;
    }

    conversations.forEach(conv => {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.dataset.userId = conv.other_user_id;
        
        const isOnline = onlineUsers.has(conv.other_user_id);
        
        conversationItem.innerHTML = `
            <div class="conversation-avatar">
                ${conv.other_user_avatar ? 
                    `<img src="${conv.other_user_avatar}" alt="${conv.other_user_name}">` :
                    getInitials(conv.other_user_name)
                }
                <div class="status-indicator ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="conversation-info">
                <div class="conversation-name">${conv.other_user_name}</div>
                <div class="conversation-last-message">${conv.last_message_content || 'No messages yet'}</div>
            </div>
            <div class="conversation-meta">
                <div class="conversation-time">${formatTime(conv.last_message_time)}</div>
                ${conv.unread_count > 0 ? `<div class="unread-count">${conv.unread_count}</div>` : ''}
            </div>
        `;
        
        conversationItem.addEventListener('click', () => openConversation(conv));
        conversationsList.appendChild(conversationItem);
    });
}

// Enhanced message sending with file support
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content && !selectedFile) return;
    
    try {
        const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId');
        const formData = new FormData();
        formData.append('recipientId', currentConversation.other_user_id);
        formData.append('content', content);
        formData.append('messageType', selectedFile ? 'file' : 'text');
        
        if (selectedFile) {
            formData.append('file', selectedFile);
        }
        
        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionId}`
            },
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            messageInput.value = '';
            selectedFile = null;
            document.getElementById('filePreview').style.display = 'none';
            
            // Message will be added via socket event
        } else {
            alert('Error sending message: ' + result.error);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}

// Add CSS for enhanced messaging features
const enhancedStyles = `
<style>
.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: absolute;
    bottom: 2px;
    right: 2px;
    border: 2px solid white;
}

.status-indicator.online {
    background-color: #4CAF50;
}

.status-indicator.offline {
    background-color: #9E9E9E;
}

.notification-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
}

.notification-content {
    margin-bottom: 8px;
}

.notification-title {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
}

.notification-message {
    color: #666;
    font-size: 14px;
}

.notification-close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #999;
}

.typing-indicator {
    padding: 8px 12px;
    background: #f0f0f0;
    border-radius: 12px;
    font-size: 12px;
    color: #666;
    margin: 8px 0;
    font-style: italic;
}

.file-preview {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
    display: flex;
    align-items: center;
    gap: 12px;
}

.file-icon {
    font-size: 24px;
}

.file-info {
    flex: 1;
}

.file-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
}

.file-size {
    font-size: 12px;
    color: #666;
}

.file-download {
    background: #007bff;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    text-decoration: none;
    font-size: 12px;
}

.preview-image {
    max-width: 200px;
    max-height: 200px;
    border-radius: 4px;
    margin-top: 8px;
}

.message-image {
    max-width: 300px;
    max-height: 300px;
    border-radius: 8px;
    margin-top: 8px;
}

.file-message {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', enhancedStyles);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeMessaging();
    setupFileUpload();
});
