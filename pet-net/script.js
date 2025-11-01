import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onChildAdded, get, set, child, update, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCMuOymY5KniYJgg51vkhcYWxXeyXAyFk0",
    authDomain: "pet-paths.firebaseapp.com",
    databaseURL: "https://pet-paths-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pet-paths",
    storageBucket: "pet-paths.firebasestorage.app",
    messagingSenderId: "5202022310",
    appId: "1:5202022310:web:55991fbd2be58294bfc967",
    measurementId: "G-SW8L37HRVV",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const accountsRef = ref(db, "accounts");
const postsRef = ref(db, "posts");

const feedEl = document.getElementById("feed");

const authIcon = document.getElementById("authIcon");
const authModal = document.getElementById("authModal");
const closeAuthModal = document.getElementById("closeAuthModal");

const signInView = document.getElementById("signInView");
const signUpView = document.getElementById("signUpView");
const changePasswordView = document.getElementById("changePasswordView");
const signedInView = document.getElementById("signedInView");

const toSignUp = document.getElementById("toSignUp");
const toSignIn = document.getElementById("toSignIn");
const showChangePassword = document.getElementById("showChangePassword");
const backToSignIn = document.getElementById("backToSignIn");

const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const changePasswordForm = document.getElementById("changePasswordForm");

const signOutBtn = document.getElementById("signOutBtn");

const signedInUserSpan = document.getElementById("signedInUser");
const currentUserNameSpan = document.getElementById("currentUserName");

let allProfiles = {};
let currentUser = null; // { username, key, ...profileData }
let allPosts = {};

// Create a post card
function createPostCard(postData, postKey) {
    const div = document.createElement("div");
    div.className = "feed-post";
    div.dataset.postKey = postKey;

    const profile = allProfiles[postData.userKey] || {};
    const avatarHtml = profile.photoURL ? `<img src="${profile.photoURL}" alt="Avatar"/>` : `<i class="fa-solid fa-user"></i>`;
    const username = profile.displayName || profile.username || "Anonymous";
    const isLiked = currentUser && postData.likes && postData.likes[currentUser.username];
    const likeCount = postData.likes ? Object.keys(postData.likes).length : 0;

    div.innerHTML = `
        <div class="post-left">
            <div class="post-header">
                <div class="post-avatar">${avatarHtml}</div>
                <div class="post-user">${username}</div>
            </div>
            <img class="post-image" src="${postData.imageURL}" alt="Post Image" />
            <div class="post-actions">
                <div class="post-actions-left">
                    <i class="fa-heart ${isLiked ? 'fas liked' : 'far'}" data-action="like"></i>
                    <i class="far fa-comment" data-action="comment"></i>
                </div>
            </div>
        </div>
        <div class="post-right">
            <div class="post-likes">${likeCount} likes</div>
            <div class="post-caption"><strong>${username}</strong> ${postData.caption}</div>
            <div class="post-comments" id="comments-${postKey}"></div>
            <div class="add-comment">
                <input type="text" placeholder="Add a comment..." data-action="comment-input" />
                <button data-action="comment-submit">Post</button>
            </div>
        </div>
    `;


    // Render comments
    const commentsEl = div.querySelector(`#comments-${postKey}`);
    if (postData.comments) {
        Object.values(postData.comments).forEach(comment => {
            const commentDiv = document.createElement("div");
            commentDiv.className = "comment";
            commentDiv.innerHTML = `<span class="comment-user">${comment.username}:</span> ${comment.text}`;
            commentsEl.appendChild(commentDiv);
        });
    }

    // Event listeners for like and comment
    div.querySelector('[data-action="like"]').addEventListener("click", () => toggleLike(postKey));
    div.querySelector('[data-action="comment-submit"]').addEventListener("click", () => addComment(postKey, div.querySelector('[data-action="comment-input"]').value.trim()));

    return div;
}

function renderFeed() {
    feedEl.innerHTML = "";
    Object.keys(allPosts).reverse().forEach(key => {
        const card = createPostCard(allPosts[key], key);
        feedEl.appendChild(card);
    });
}

function toggleLike(postKey) {
    if (!currentUser) {
        alert("You must be signed in to like posts.");
        return;
    }
    const post = allPosts[postKey];
    const likesRef = ref(db, `posts/${postKey}/likes`);
    if (post.likes && post.likes[currentUser.username]) {
        // Unlike
        update(likesRef, { [currentUser.username]: null });
    } else {
        // Like
        update(likesRef, { [currentUser.username]: true });
    }
}

function addComment(postKey, text) {
    if (!currentUser || !text) return;
    const commentsRef = ref(db, `posts/${postKey}/comments`);
    push(commentsRef, { username: currentUser.username, text, timestamp: Date.now() });
}

// Load posts
function loadPosts() {
    onValue(postsRef, (snapshot) => {
        allPosts = snapshot.val() || {};
        renderFeed();
    });
}

// Load profiles
function loadProfiles() {
    get(accountsRef).then(snapshot => {
        if (snapshot.exists()) {
            allProfiles = snapshot.val();
        } else {
            allProfiles = {};
        }
        loadPosts(); // Load posts after profiles
    }).catch(() => {
        console.error("Failed to load profiles");
    });
}

// -- AUTH LOGIC --

function setCurrentUser(userObj) {
    currentUser = userObj;

    const welcomeTitle = document.getElementById("welcomeTitle");
    const welcomeSubtitle = document.getElementById("welcomeSubtitle");

    const fadeBannerText = (titleText, subtitleText) => {
        if (!welcomeTitle || !welcomeSubtitle) return;
        welcomeTitle.classList.add("fade-out");
        welcomeSubtitle.classList.add("fade-out");

        // Wait for fade-out, then change text, then fade back in
        setTimeout(() => {
            welcomeTitle.textContent = titleText;
            welcomeSubtitle.textContent = subtitleText;
            welcomeTitle.classList.remove("fade-out");
            welcomeSubtitle.classList.remove("fade-out");
            welcomeTitle.classList.add("fade-in");
            welcomeSubtitle.classList.add("fade-in");

            // Clean up classes after fade completes
            setTimeout(() => {
                welcomeTitle.classList.remove("fade-in");
                welcomeSubtitle.classList.remove("fade-in");
            }, 400);
        }, 250);
    };

    if (currentUser) {
        authIcon.style.color = "#4a4fcf";
        signedInUserSpan.style.display = "inline-block";
        signedInUserSpan.textContent = currentUser.username;
        localStorage.setItem("petpaths_currentUser", JSON.stringify({ username: currentUser.username, key: currentUser.key }));

        fadeBannerText(`🐾 Welcome, ${currentUser.username}!`, "Glad to see you back on Pet Net 🐶");
    } else {
        authIcon.style.color = "black";
        signedInUserSpan.style.display = "none";
        signedInUserSpan.textContent = "";
        localStorage.removeItem("petpaths_currentUser");

        fadeBannerText("🐾 Welcome to Pet Net!", "Share your walks, meet local pets, and see what everyone’s up to.");
    }

    renderFeed();
}

function showAuthView(view) {
    [signInView, signUpView, changePasswordView, signedInView].forEach(el => el.style.display = "none");
    if (view === "signin") signInView.style.display = "flex";
    else if (view === "signup") signUpView.style.display = "flex";
    else if (view === "changepassword") changePasswordView.style.display = "flex";
    else if (view === "signedin") signedInView.style.display = "flex";
}

function openAuthModal() {
    authModal.classList.remove("hidden");
    if (currentUser) {
        currentUserNameSpan.textContent = currentUser.username;
        showAuthView("signedin");
    } else {
        showAuthView("signin");
    }
}

function closeAuth() {
    authModal.classList.add("hidden");
    signInForm.reset();
    signUpForm.reset();
    changePasswordForm.reset();
}

// Edit Profile Modal logic
const editProfileModal = document.getElementById("editProfileModal");
const closeEditProfileModal = document.getElementById("closeEditProfileModal");
const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileForm = document.getElementById("editProfileForm");

function openEditProfileModal() {
    if (!currentUser) return;
    editProfileModal.classList.remove("hidden");
    document.getElementById("editDisplayName").value = currentUser.displayName || currentUser.username || "";
    document.getElementById("editPetName").value = currentUser.petName || "";
    document.getElementById("editLocation").value = currentUser.location || "";
    document.getElementById("editNotes").value = currentUser.notes || "";
    document.getElementById("editPhotoURL").value = currentUser.photoURL || "";
}

function closeEditProfile() {
    editProfileModal.classList.add("hidden");
    editProfileForm.reset();
}

if (editProfileBtn) editProfileBtn.addEventListener("click", openEditProfileModal);
if (closeEditProfileModal) closeEditProfileModal.addEventListener("click", closeEditProfile);
editProfileModal.addEventListener("click", (e) => {
    if (e.target === editProfileModal) closeEditProfile();
});

editProfileForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentUser) return;
    const key = currentUser.key;
    const updated = {
        displayName: editProfileForm.editDisplayName.value.trim(),
        petName: editProfileForm.editPetName.value.trim(),
        location: editProfileForm.editLocation.value.trim(),
        notes: editProfileForm.editNotes.value.trim(),
        photoURL: editProfileForm.editPhotoURL.value.trim(),
    };
    update(ref(db, `accounts/${key}`), updated).then(() => {
        Object.assign(allProfiles[key], updated);
        setCurrentUser({ ...allProfiles[key], key });
        closeEditProfile();
        renderFeed();
    }).catch(() => alert("Failed to update profile"));
});

// Auth: Sign in
signInForm.addEventListener("submit", e => {
    e.preventDefault();
    const username = signInForm.signInUsername.value.trim();
    const password = signInForm.signInPassword.value;
    if (!username || !password) return alert("Please enter username and password");
    if (!allProfiles) return alert("Profiles data not loaded");
    const foundEntry = Object.entries(allProfiles).find(([key, val]) => val.username.toLowerCase() === username.toLowerCase());
    if (!foundEntry) return alert("User not found");
    const [userKey, userData] = foundEntry;
    if (!userData.password) return alert("User has no password set, cannot sign in.");
    if (password !== userData.password) return alert("Incorrect password");
    setCurrentUser({ ...userData, key: userKey });
    closeAuth();
});

// Auth: Sign up
signUpForm.addEventListener("submit", e => {
    e.preventDefault();
    const username = signUpForm.signUpUsername.value.trim();
    const password = signUpForm.signUpPassword.value;
    if (!username || !password) return alert("Please enter username and password");
    const usernameExists = Object.values(allProfiles).some(prof => prof.username.toLowerCase() === username.toLowerCase());
    if (usernameExists) return alert("Username already taken");
    const newUserKey = 'key-' + Math.random().toString(36).substr(2, 12);
    const newProfile = {
        username,
        password,
        displayName: username,
        petName: "",
        location: "",
        notes: "",
        photoURL: ""
    };
    set(ref(db, `accounts/${newUserKey}`), newProfile).then(() => {
        allProfiles[newUserKey] = newProfile;
        setCurrentUser({ ...newProfile, key: newUserKey });
        closeAuth();
        renderFeed();
    }).catch(() => alert("Failed to create account"));
});

// Auth: Change Password
changePasswordForm.addEventListener("submit", e => {
    e.preventDefault();
    const username = changePasswordForm.changePasswordUsername.value.trim();
    const newPassword = changePasswordForm.newPassword.value;
    if (!username || !newPassword) return alert("Please enter username and new password");
    const foundEntry = Object.entries(allProfiles).find(([key, val]) => val.username.toLowerCase() === username.toLowerCase());
    if (!foundEntry) return alert("User not found");
    const [userKey, userData] = foundEntry;
    update(ref(db, `accounts/${userKey}`), { password: newPassword }).then(() => {
        allProfiles[userKey].password = newPassword;
        alert("Password changed successfully!");
        showAuthView("signin");
        changePasswordForm.reset();
    }).catch(() => alert("Failed to change password"));
});

// Sign out
signOutBtn.addEventListener("click", () => {
    setCurrentUser(null);
    closeAuth();
});

// Navigation inside modal
toSignUp.addEventListener("click", e => {
    e.preventDefault();
    showAuthView("signup");
});
toSignIn.addEventListener("click", e => {
    e.preventDefault();
    showAuthView("signin");
});
showChangePassword.addEventListener("click", () => {
    showAuthView("changepassword");
});
backToSignIn.addEventListener("click", e => {
    e.preventDefault();
    showAuthView("signin");
});

// Open modal on auth icon click
authIcon.addEventListener("click", openAuthModal);

// Close modal
closeAuthModal.addEventListener("click", closeAuth);

// Close modal on outside click
authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuth();
});

// Keyboard accessibility for modal (Escape closes)
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !authModal.classList.contains("hidden")) {
        closeAuth();
    }
});

// Create Post Modal
const createPostModal = document.getElementById("createPostModal");
const closeCreatePostModal = document.getElementById("closeCreatePostModal");
const createPostForm = document.getElementById("createPostForm");
const createPostIcon = document.getElementById("createPostIcon");

function openCreatePostModal() {
    if (!currentUser) {
        alert("You must be signed in to create a post.");
        return;
    }
    createPostModal.classList.remove("hidden");
}

function closeCreatePost() {
    createPostModal.classList.add("hidden");
    createPostForm.reset();
}

if (createPostIcon) createPostIcon.addEventListener("click", openCreatePostModal);
if (closeCreatePostModal) closeCreatePostModal.addEventListener("click", closeCreatePost);
createPostModal.addEventListener("click", (e) => {
    if (e.target === createPostModal) closeCreatePost();
});

createPostForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentUser) return;
    const imageURL = createPostForm.postImageURL.value.trim();
    const caption = createPostForm.postCaption.value.trim();
    if (!imageURL || !caption) return alert("Please provide an image URL and caption");
    const newPost = {
        userKey: currentUser.key,
        imageURL,
        caption,
        timestamp: Date.now(),
        likes: {},
        comments: {}
    };
    push(postsRef, newPost).then(() => {
        closeCreatePost();
    }).catch(() => alert("Failed to create post"));
});

// Restore user from localStorage
function tryRestoreUser() {
    const saved = localStorage.getItem("petpaths_currentUser");
    if (saved) {
        try {
            const { username, key } = JSON.parse(saved);
            if (allProfiles && key && allProfiles[key] && allProfiles[key].username === username) {
                setCurrentUser({ ...allProfiles[key], key });
            } else if (allProfiles) {
                const foundEntry = Object.entries(allProfiles).find(([k, val]) => val.username === username);
                if (foundEntry) {
                    const [foundKey, foundData] = foundEntry;
                    setCurrentUser({ ...foundData, key: foundKey });
                }
            }
        } catch {}
    }
}

// Initial loading
loadProfiles();
// After profiles load, try to restore user
const origRenderFeed = renderFeed;
renderFeed = function() {
    origRenderFeed.apply(this, arguments);
    if (!currentUser) tryRestoreUser();
};

const quickPostBtn = document.getElementById("quickPostBtn");
if (quickPostBtn) quickPostBtn.addEventListener("click", openCreatePostModal);