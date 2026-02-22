// Script pour tester l'affichage des médias dans les posts
const fs = require('fs');
const path = require('path');

// Lire le fichier profile.html
const profilePath = path.join(__dirname, 'pages', 'profile.html');
const profileContent = fs.readFileSync(profilePath, 'utf8');

// Vérifier s'il y a des fonctions displayPosts dupliquées
const displayPostsMatches = profileContent.match(/function displayPosts\(/g);
console.log('🔍 Nombre de fonctions displayPosts trouvées:', displayPostsMatches ? displayPostsMatches.length : 0);

// Vérifier le format des médias dans publishNewPost
const publishNewPostMatch = profileContent.match(/function publishNewPost\(\)[\s\S]*?reader\.onload = function\(e\) \{[\s\S]*?newPost\.media = \{[\s\S]*?\}/);
if (publishNewPostMatch) {
    console.log('✅ Format des médias dans publishNewPost trouvé:');
    console.log(publishNewPostMatch[0]);
} else {
    console.log('❌ Format des médias dans publishNewPost non trouvé');
}

// Vérifier le format des médias dans displayPosts
const displayPostsMatch = profileContent.match(/function displayPosts\(posts\)[\s\S]*?\$\{post\.media \?[\s\S]*?post\.media\.type === 'image'/);
if (displayPostsMatch) {
    console.log('✅ Format des médias dans displayPosts trouvé:');
    console.log(displayPostsMatch[0]);
} else {
    console.log('❌ Format des médias dans displayPosts non trouvé');
}

// Vérifier qu'il n'y a qu'une seule fonction displayPosts
const allDisplayPosts = profileContent.match(/function displayPosts\([^]*?\n\}/g);
if (allDisplayPosts && allDisplayPosts.length > 1) {
    console.log('❌ PROBLÈME: Il y a encore plusieurs fonctions displayPosts!');
    allDisplayPosts.forEach((func, index) => {
        console.log(`\n--- Fonction displayPosts #${index + 1} ---`);
        console.log(func.substring(0, 200) + '...');
    });
} else if (allDisplayPosts && allDisplayPosts.length === 1) {
    console.log('✅ Parfait: Il n\'y a qu\'une seule fonction displayPosts');
    
    // Vérifier que cette fonction utilise le bon format
    if (allDisplayPosts[0].includes('post.media.type') && allDisplayPosts[0].includes('post.media.url')) {
        console.log('✅ La fonction displayPosts utilise le bon format (post.media.type et post.media.url)');
    } else {
        console.log('❌ La fonction displayPosts n\'utilise pas le bon format');
    }
} else {
    console.log('❌ Aucune fonction displayPosts trouvée');
}

console.log('\n🎯 Test terminé!');

// Instructions pour l'utilisateur
console.log('\n📋 Instructions pour tester manuellement:');
console.log('1. Ouvre http://localhost:3001/test-posts-with-media.html');
console.log('2. Crée un post avec une image');
console.log('3. Vérifie que l\'image s\'affiche correctement');
console.log('4. Ouvre http://localhost:3001/profile');
console.log('5. Vérifie que les posts avec images s\'affichent correctement');
