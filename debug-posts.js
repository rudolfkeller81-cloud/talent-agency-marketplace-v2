// Script de diagnostic pour les posts
console.log('🔍 DIAGNOSTIC DES POSTS');
console.log('========================');

// Simuler la lecture du localStorage
try {
    // Vérifier si les données existent
    const mockLocalStorage = {
        userProfile: `{
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "role": "talent",
            "posts": [
                {
                    "id": 1645312345678,
                    "content": "Test post with image",
                    "type": "mixed",
                    "media": {
                        "type": "image",
                        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                        "name": "test.png"
                    },
                    "createdAt": "2023-02-19T18:07:00.000Z",
                    "likes": 0,
                    "comments": 0,
                    "shares": 0
                }
            ],
            "media": []
        }`
    };

    const profileData = JSON.parse(mockLocalStorage.userProfile);
    
    console.log('✅ Données du profil trouvées');
    console.log('📝 Nombre de posts:', profileData.posts.length);
    
    // Analyser chaque post
    profileData.posts.forEach((post, index) => {
        console.log(`\n--- Post #${index + 1} ---`);
        console.log('ID:', post.id);
        console.log('Type:', post.type);
        console.log('Content:', post.content ? 'Oui' : 'Non');
        console.log('Media:', post.media ? 'Oui' : 'Non');
        
        if (post.media) {
            console.log('  - Media Type:', post.media.type);
            console.log('  - Media URL:', post.media.url.substring(0, 50) + '...');
            console.log('  - Media Name:', post.media.name);
        }
        
        console.log('Created:', new Date(post.createdAt).toLocaleString('fr-FR'));
    });
    
    // Simuler la fonction displayPosts
    console.log('\n🎯 SIMULATION DE DISPLAYPOSTS');
    console.log('==============================');
    
    const posts = profileData.posts || [];
    
    if (!posts || posts.length === 0) {
        console.log('❌ Aucun post à afficher');
    } else {
        console.log('✅ Posts trouvés, génération du HTML...');
        
        let postsHtml = '';
        posts.forEach(post => {
            const typeClass = post.type || 'text';
            const typeName = {
                'text': '📄 Text',
                'photo': '📷 Photo', 
                'video': '🎥 Video',
                'mixed': '🎨 Mixed'
            }[typeClass] || '📄 Text';
            
            const date = new Date(post.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            postsHtml += `
                <div class="post-item">
                    <div class="post-header">
                        <span class="post-type ${typeClass}">${typeName}</span>
                        <span style="color: rgba(255,255,255,0.5); font-size: 0.8rem;">${date}</span>
                    </div>
                    
                    ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
                    
                    ${post.media ? `
                        <div class="post-media">
                            ${post.media.type === 'image' 
                                ? `<img src="${post.media.url}" alt="${post.media.name}">`
                                : `<video src="${post.media.url}" controls></video>`
                            }
                        </div>
                    ` : ''}
                    
                    <div class="post-footer">
                        <div class="post-actions">
                            <button class="post-action">❤️ ${post.likes || 0}</button>
                            <button class="post-action">💬 ${post.comments || 0}</button>
                            <button class="post-action">🔄 ${post.shares || 0}</button>
                        </div>
                        <button class="post-action delete" onclick="deletePost(${post.id})">🗑️ Delete</button>
                    </div>
                </div>
            `;
        });
        
        console.log('✅ HTML généré avec succès');
        console.log('📄 Longueur du HTML:', postsHtml.length);
        console.log('🔍 Aperçu du HTML généré:');
        console.log(postsHtml.substring(0, 300) + '...');
    }
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
}

console.log('\n📋 INSTRUCTIONS POUR RÉSOUDRE LE PROBLÈME');
console.log('======================================');
console.log('1. Ouvre http://localhost:3003/profile');
console.log('2. Ouvre les outils de développement (F12)');
console.log('3. Va dans l\'onglet "Console"');
console.log('4. Tape: localStorage.getItem("userProfile")');
console.log('5. Vérifie que les données existent et contiennent des posts');
console.log('6. Si les données existent, vérifie que la fonction loadPosts() est appelée');
console.log('7. Si les données n\'existent pas, crée un nouveau post');

console.log('\n🔧 CODE DE DÉBOGAGE À EXÉCUTER DANS LA CONSOLE:');
console.log('=============================================');
console.log(`
// Vérifier les données localStorage
const data = localStorage.getItem('userProfile');
console.log('Data:', data);

if (data) {
    const profile = JSON.parse(data);
    console.log('Posts:', profile.posts);
    console.log('Posts count:', profile.posts?.length || 0);
    
    // Forcer le rechargement des posts
    if (typeof loadPosts === 'function') {
        loadPosts();
    } else {
        console.error('loadPosts function not found');
    }
} else {
    console.log('No data in localStorage');
}
`);
