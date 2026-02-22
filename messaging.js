// Messaging System API
const db = require('./auth.js')
const fileManager = require('./file-manager-cleanup');
const logger = require('./logger');
const path = require('path');
const fs = require('fs');

// Initialize messaging tables
async function initMessagingTables() {
    return new Promise((resolve, reject) => {
        // Create conversations table
        const conversationsTable = `
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user1_id INTEGER NOT NULL,
                user2_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user1_id) REFERENCES users(id),
                FOREIGN KEY (user2_id) REFERENCES users(id),
                UNIQUE(user1_id, user2_id)
            )
        `;

        // Create messages table
        const messagesTable = `
            CREATE TABLE IF NOT EXISTS messages_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                content TEXT,
                file_url TEXT,
                file_type TEXT,
                file_name TEXT,
                file_size INTEGER,
                message_type TEXT DEFAULT 'text',
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id),
                FOREIGN KEY (sender_id) REFERENCES users(id)
            )
        `;

        // Create message_read_status table for read receipts
        const readStatusTable = `
            CREATE TABLE IF NOT EXISTS message_read_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages_new(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(message_id, user_id)
            )
        `;

        db.serialize(() => {
            db.run(conversationsTable);
            db.run(messagesTable);
            db.run(readStatusTable, (err) => {
                if (err) {
                    logger.error('Error creating messaging tables:', err);
                    reject(err);
                } else {
                    logger.info('Messaging tables initialized successfully');
                    resolve();
                }
            });
        });
    });
}

// Get or create conversation between two users
async function getOrCreateConversation(user1Id, user2Id) {
    return new Promise((resolve, reject) => {
        // Try to find existing conversation
        const findQuery = `
            SELECT * FROM conversations 
            WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        `;
        
        db.get(findQuery, [user1Id, user2Id, user2Id, user1Id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row) {
                resolve(row);
            } else {
                // Create new conversation
                const createQuery = `
                    INSERT INTO conversations (user1_id, user2_id)
                    VALUES (?, ?)
                `;
                
                db.run(createQuery, [user1Id, user2Id], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, user1_id: user1Id, user2_id: user2Id });
                    }
                });
            }
        });
    });
}

// Send message
async function sendMessage(conversationId, senderId, content, messageType = 'text', fileInfo = null) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url, file_type, file_name, file_size)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            conversationId,
            senderId,
            content,
            messageType,
            fileInfo?.url || null,
            fileInfo?.type || null,
            fileInfo?.name || null,
            fileInfo?.size || null
        ];
        
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                // Update conversation timestamp
                updateConversationTimestamp(conversationId);
                
                // Return message details
                resolve({
                    id: this.lastID,
                    conversation_id: conversationId,
                    sender_id: senderId,
                    content,
                    message_type: messageType,
                    file_url: fileInfo?.url || null,
                    file_type: fileInfo?.type || null,
                    file_name: fileInfo?.name || null,
                    file_size: fileInfo?.size || null,
                    created_at: new Date().toISOString()
                });
            }
        });
    });
}

// Update conversation timestamp
function updateConversationTimestamp(conversationId) {
    const query = `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(query, [conversationId]);
}

// Get user conversations
async function getUserConversations(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                c.*,
                u1.first_name as user1_first_name,
                u1.last_name as user1_last_name,
                u1.role as user1_role,
                u2.first_name as user2_first_name,
                u2.last_name as user2_last_name,
                u2.role as user2_role,
                m.content as last_message,
                m.created_at as last_message_time,
                m.sender_id as last_message_sender,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_id != ?) as unread_count
            FROM conversations c
            LEFT JOIN users u1 ON c.user1_id = u1.id
            LEFT JOIN users u2 ON c.user2_id = u2.id
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.user1_id = ? OR c.user2_id = ?
            ORDER BY c.updated_at DESC
        `;
        
        db.all(query, [userId, userId, userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Format conversations
                const conversations = rows.map(row => {
                    const otherUser = row.user1_id === userId ? 
                        { id: row.user2_id, first_name: row.user2_first_name, last_name: row.user2_last_name, role: row.user2_role } :
                        { id: row.user1_id, first_name: row.user1_first_name, last_name: row.user1_last_name, role: row.user1_role };
                    
                    return {
                        id: row.id,
                        other_user: otherUser,
                        last_message: row.last_message,
                        last_message_time: row.last_message_time,
                        last_message_sender: row.last_message_sender,
                        unread_count: row.unread_count || 0,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    };
                });
                
                resolve(conversations);
            }
        });
    });
}

// Get conversation messages
async function getConversationMessages(conversationId, userId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                m.*,
                u.first_name,
                u.last_name,
                u.role
            FROM messages_new m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        db.all(query, [conversationId, limit, offset], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Mark messages as read
                markMessagesAsRead(conversationId, userId);
                
                // Reverse to get chronological order
                resolve(rows.reverse());
            }
        });
    });
}

// Mark messages as read
async function markMessagesAsRead(conversationId, userId) {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE messages_new 
            SET is_read = 1 
            WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
        `;
        
        db.run(query, [conversationId, userId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ marked_read: this.changes });
            }
        });
    });
}

// Delete message
async function deleteMessage(messageId, userId) {
    return new Promise((resolve, reject) => {
        const query = `
            DELETE FROM messages 
            WHERE id = ? AND sender_id = ?
        `;
        
        db.run(query, [messageId, userId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ deleted: this.changes > 0 });
            }
        });
    });
}

// Get unread message count
async function getUnreadCount(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) as count
            FROM messages_new m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE (c.user1_id = ? OR c.user2_id = ?) 
            AND m.sender_id != ? 
            AND m.is_read = 0
        `;
        
        db.get(query, [userId, userId, userId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count);
            }
        });
    });
}

// Save uploaded file info
async function saveFileInfo(conversationId, messageId, fileInfo) {
    return new Promise((resolve, reject) => {
        const uploadsDir = path.join(__dirname, 'uploads', 'messages');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const extension = path.extname(fileInfo.originalname);
        const filename = `${timestamp}_${messageId}${extension}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Move file to permanent location
        fs.rename(fileInfo.path, filePath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Update message with file info
            const updateQuery = `
                UPDATE messages 
                SET file_url = ?, file_type = ?, file_name = ?, file_size = ?
                WHERE id = ?
            `;
            
            const fileUrl = `/uploads/messages/${filename}`;
            
            db.run(updateQuery, [fileUrl, fileInfo.mimetype, fileInfo.originalname, fileInfo.size, messageId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        url: fileUrl,
                        type: fileInfo.mimetype,
                        name: fileInfo.originalname,
                        size: fileInfo.size
                    });
                }
            });
        });
    });
}

module.exports = {
    initMessagingTables,
    getOrCreateConversation,
    sendMessage,
    getUserConversations,
    getConversationMessages,
    markMessagesAsRead,
    deleteMessage,
    getUnreadCount,
    saveFileInfo
};
