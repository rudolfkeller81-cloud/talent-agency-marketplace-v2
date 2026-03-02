// Script de diagnostic en temps réel pour les posts avec médias
console.log('🔍 DIAGNOSTIC TEMPS RÉEL - POSTS AVEC MÉDIAS');
console.log('===============================================');

// Simuler le processus complet de création d'un post
function simulatePostCreation() {
    console.log('\n📝 ÉTAPE 1: CRÉATION DU POST');
    console.log('---------------------------');
    
    // Simuler les données du formulaire
    const content = "Test post with image";
    const mediaFile = {
        type: 'image/png',
        name: 'test-image.png'
    };
    
    console.log('✅ Content:', content);
    console.log('✅ Media file:', mediaFile);
    
    // Auto-detect post type
    let postType = 'text';
    if (content && mediaFile) {
        postType = 'mixed';
    } else if (mediaFile) {
        postType = mediaFile.type.startsWith('image/') ? 'photo' : 'video';
    }
    
    console.log('✅ Detected post type:', postType);
    
    // Create new post
    const newPost = {
        id: Date.now(),
        content: content,
        type: postType,
        media: null,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0
    };
    
    console.log('✅ New post created:', newPost);
    
    console.log('\n🖼️ ÉTAPE 2: TRAITEMENT DU MÉDIA');
    console.log('------------------------------');
    
    // Simuler le FileReader
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    newPost.media = {
        type: mediaFile.type.startsWith('image/') ? 'image' : 'video',
        url: mockDataUrl,
        name: mediaFile.name
    };
    
    console.log('✅ Media processed:', newPost.media);
    
    console.log('\n💾 ÉTAPE 3: SAUVEGARDE DU POST');
    console.log('---------------------------');
    
    // Simuler profileData
    let profileData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role: 'talent',
        posts: [],
        media: []
    };
    
    // Save to profile data
    if (!profileData.posts) {
        profileData.posts = [];
    }
    profileData.posts.unshift(newPost);
    
    console.log('✅ Post added to profileData.posts');
    console.log('✅ Total posts:', profileData.posts.length);
    
    // Simuler localStorage
    const localStorageData = JSON.stringify(profileData);
    console.log('✅ Data ready for localStorage');
    console.log('📏 Data size:', localStorageData.length, 'characters');
    
    console.log('\n📊 ÉTAPE 4: VÉRIFICATION DES DONNÉES');
    console.log('------------------------------');
    
    // Vérifier que les données sont correctes
    const savedData = JSON.parse(localStorageData);
    const savedPost = savedData.posts[0];
    
    console.log('✅ Post saved correctly');
    console.log('📝 Content exists:', !!savedPost.content);
    console.log('🖼️ Media exists:', !!savedPost.media);
    
    if (savedPost.media) {
        console.log('🔍 Media type:', savedPost.media.type);
        console.log('🔍 Media URL starts with data:', savedPost.media.url.startsWith('data:'));
        console.log('🔍 Media name:', savedPost.media.name);
    }
    
    console.log('\n🎨 ÉTAPE 5: GÉNÉRATION DE L\'AFFICHAGE');
    console.log('---------------------------------');
    
    // Simuler displayPosts
    const posts = savedData.posts || [];
    
    if (!posts || posts.length === 0) {
        console.log('❌ No posts to display');
        return;
    }
    
    console.log('✅ Posts found for display:', posts.length);
    
    let postsHtml = '';
    posts.forEach(post => {
        console.log('\n--- Processing post ---');
        console.log('Post ID:', post.id);
        console.log('Post type:', post.type);
        console.log('Has content:', !!post.content);
        console.log('Has media:', !!post.media);
        
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
        
        console.log('✅ Type name:', typeName);
        console.log('✅ Date:', date);
        
        // Générer le HTML pour ce post
        let postHtml = `
            <div class="post-item">
                <div class="post-header">
                    <span class="post-type ${typeClass}">${typeName}</span>
                    <span style="color: rgba(255,255,255,0.5); font-size: 0.8rem;">${date}</span>
                </div>
                
                ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
        `;
        
        console.log('✅ Content HTML generated:', !!post.content);
        
        if (post.media) {
            console.log('🖼️ Generating media HTML...');
            console.log('  - Media type:', post.media.type);
            console.log('  - Is image:', post.media.type === 'image');
            
            const mediaHtml = `
                <div class="post-media">
                    ${post.media.type === 'image' 
                        ? `<img src="${post.media.url}" alt="${post.media.name}">`
                        : `<video src="${post.media.url}" controls></video>`
                    }
                </div>
            `;
            
            postHtml += mediaHtml;
            console.log('✅ Media HTML generated');
            console.log('🔍 Media HTML length:', mediaHtml.length);
        } else {
            console.log('❌ No media to generate HTML for');
        }
        
        postHtml += `
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
        
        postsHtml += postHtml;
        console.log('✅ Post HTML completed');
    });
    
    console.log('\n📄 RÉSULTAT FINAL');
    console.log('=================');
    console.log('✅ Total HTML length:', postsHtml.length);
    console.log('✅ Posts in HTML:', posts.length);
    
    // Vérifier si le HTML contient bien l'image
    const hasImage = postsHtml.includes('<img src=');
    const hasDataUrl = postsHtml.includes('data:image');
    
    console.log('🖼️ HTML contains <img> tag:', hasImage);
    console.log('🖼️ HTML contains data URL:', hasDataUrl);
    
    if (hasImage && hasDataUrl) {
        console.log('✅ SUCCESS: L\'image devrait s\'afficher correctement!');
    } else {
        console.log('❌ PROBLEM: L\'image ne sera pas affichée');
    }
    
    console.log('\n🔍 HTML GENERÉ (aperçu):');
    console.log('=========================');
    console.log(postsHtml.substring(0, 500) + '...');
    
    return {
        success: hasImage && hasDataUrl,
        html: postsHtml,
        postData: savedData.posts[0]
    };
}

// Exécuter la simulation
const result = simulatePostCreation();

console.log('\n🎯 CONCLUSION');
console.log('=============');
if (result.success) {
    console.log('✅ Le processus est correct - le problème est ailleurs');
    console.log('🔍 Vérifie ces points dans le navigateur:');
    console.log('   1. Les données sont bien sauvegardées dans localStorage');
    console.log('   2. La fonction loadPosts() est appelée');
    console.log('   3. Le HTML est bien inséré dans le DOM');
    console.log('   4. Les styles CSS sont appliqués');
} else {
    console.log('❌ Il y a un problème dans le processus de génération');
}

console.log('\n📋 CODE DE DÉBOGAGE À COPIER-COLLER DANS LA CONSOLE:');
console.log('==================================================');
console.log(`
// 1. Vérifier les données actuelles
const data = localStorage.getItem('userProfile');
console.log('Data exists:', !!data);

if (data) {
    const profile = JSON.parse(data);
    console.log('Posts:', profile.posts);
    
    // 2. Vérifier le premier post en détail
    if (profile.posts && profile.posts.length > 0) {
        const post = profile.posts[0];
        console.log('First post:', post);
        console.log('Has media:', !!post.media);
        console.log('Media type:', post.media?.type);
        console.log('Media URL length:', post.media?.url?.length);
    }
    
    // 3. Forcer le rechargement
    loadPosts();
    
    // 4. Vérifier le DOM
    setTimeout(() => {
        const postsList = document.getElementById('posts-list');
        console.log('Posts list element:', postsList);
        console.log('Posts list HTML length:', postsList?.innerHTML?.length || 0);
        console.log('Contains img tag:', postsList?.innerHTML?.includes('<img'));
    }, 1000);
} else {
    console.log('No data - create a test post first');
}
`);
