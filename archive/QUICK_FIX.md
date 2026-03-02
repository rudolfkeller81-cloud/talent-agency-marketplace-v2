# 🚨 QUICK FIX - Posts qui n'apparaissent pas

## 🔍 **PROBLÈMES IDENTIFIÉS**

### 1. **Port du serveur changé**
- ❌ Ancienne URL : `http://localhost:3001/profile`
- ✅ Nouvelle URL : `http://localhost:3003/profile`

### 2. **Page de test 404**
- ❌ Ancienne URL : `http://localhost:3001/test-posts-with-media`
- ✅ Nouvelle URL : `http://localhost:3003/test-posts-with-media`

## 🛠️ **SOLUTIONS IMMÉDIATES**

### **Étape 1 : Utiliser les bonnes URLs**
```
✅ Page profile : http://localhost:3003/profile
✅ Page test    : http://localhost:3003/test-posts-with-media
```

### **Étape 2 : Vérifier les données localStorage**
1. Ouvre `http://localhost:3003/profile`
2. Appuie sur `F12` pour ouvrir les outils de développement
3. Va dans l'onglet `Console`
4. Tape ce code et appuie sur `Entrée` :

```javascript
// Vérifier les données
const data = localStorage.getItem("userProfile");
console.log("Data exists:", !!data);

if (data) {
    const profile = JSON.parse(data);
    console.log("Posts count:", profile.posts?.length || 0);
    console.log("Posts:", profile.posts);
} else {
    console.log("❌ No data in localStorage");
}
```

### **Étape 3 : Si pas de données, créer un post de test**
Si la console affiche "No data in localStorage", crée un nouveau post :

1. Va dans l'onglet "Publish New Post"
2. Écris du texte
3. Ajoute une image
4. Clique sur "Publish Post"
5. Va dans l'onglet "My Posts"

### **Étape 4 : Forcer le rechargement des posts**
Si les données existent mais ne s'affichent pas :

```javascript
// Forcer le rechargement
if (typeof loadPosts === 'function') {
    loadPosts();
    console.log("✅ Posts reloaded");
} else {
    console.log("❌ loadPosts function not found");
}
```

## 🧪 **TEST COMPLET**

### **Option A : Page de test (recommandé)**
1. Ouvre `http://localhost:3003/test-posts-with-media`
2. Crée un post avec image
3. Vérifie que l'image s'affiche
4. Retourne sur `http://localhost:3003/profile`
5. Vérifie que le post apparaît dans "My Posts"

### **Option B : Directement sur profile**
1. Ouvre `http://localhost:3003/profile`
2. Va dans "Publish New Post"
3. Crée un post avec image
4. Publie
5. Vérifie dans "My Posts"

## 🔧 **SI ÇA NE FONCTIONNE TOUJOURS PAS**

### **Vider le cache et recommencer**
```javascript
// Vider localStorage
localStorage.removeItem("userProfile");
console.log("✅ LocalStorage cleared");

// Recharger la page
location.reload();
```

### **Créer des données de test manuelles**
```javascript
// Créer un post de test
const testPost = {
    id: Date.now(),
    content: "Test post with image",
    type: "mixed",
    media: {
        type: "image",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        name: "test.png"
    },
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: 0,
    shares: 0
};

// Sauvegarder
const profileData = {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    role: "talent",
    posts: [testPost]
};

localStorage.setItem("userProfile", JSON.stringify(profileData));
console.log("✅ Test data created");

// Recharger les posts
loadPosts();
```

## 📞 **SUPPORT**

Si rien ne fonctionne :
1. Copie-colle les messages d'erreur de la console
2. Vérifie que le serveur tourne bien sur le port 3003
3. Redémarre le serveur si nécessaire

## ✅ **VÉRIFICATION FINALE**

Quand tout fonctionne :
- ✅ Page profile charge sur `http://localhost:3003/profile`
- ✅ Les posts créés apparaissent dans "My Posts"
- ✅ Les images s'affichent correctement
- ✅ Les badges de type fonctionnent (🎨 Mixed, 📷 Photo, etc.)

---

**RAPPEL : Le serveur tourne maintenant sur le port 3003 !**
