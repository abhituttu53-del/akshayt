// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDDLAOWQCGx-KtO9N8-wxlXUNOHBqGmi0E",
    authDomain: "akshay-gallery.firebaseapp.com",
    projectId: "akshay-gallery",
    storageBucket: "akshay-gallery.firebasestorage.app",
    messagingSenderId: "506612823895",
    appId: "1:506612823895:web:0adb35d5c31a8f54e4f012",
    measurementId: "G-KWRJJ3SQV3"
};

// Initialize Firebase if config is provided
let db, storage, itemsCol, settingsDoc;
const { initializeApp, getFirestore, getStorage } = window.firebaseModules;
const { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
const { ref, uploadBytes, getDownloadURL, deleteObject } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js");

const ADMIN_PASSWORD = "abhi9400";

// Selectors
const mainHeading = document.getElementById('main-heading');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminPanel = document.getElementById('admin-panel');
const adminPanelTitle = document.getElementById('admin-panel-title');
const uploadForm = document.getElementById('upload-form');
const editIdInput = document.getElementById('edit-id');
const mediaInput = document.getElementById('media-input');
const descriptionInput = document.getElementById('description-input');
const uploadBtn = uploadForm.querySelector('button[type="submit"]');
const galleryFeed = document.getElementById('gallery-feed');
const closeAdminBtn = document.getElementById('close-admin-btn');
const toggleEditHeading = document.getElementById('toggle-edit-heading');
const loadingOverlay = document.getElementById('loading-overlay');

const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const submitPassword = document.getElementById('submit-password');
const cancelPassword = document.getElementById('cancel-password');

// State
let isAdmin = false;
let galleryItems = [];
let currentHeading = "AKSHAY MOHANAN";

// Initialization
async function init() {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        alert("Please configure your Firebase credentials in script.js to enable global sync!");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        itemsCol = collection(db, "items");
        settingsDoc = doc(db, "settings", "main");

        // Listen for Heading changes
        onSnapshot(settingsDoc, (docSnap) => {
            if (docSnap.exists()) {
                currentHeading = docSnap.data().heading || "AKSHAY MOHANAN";
                mainHeading.textContent = currentHeading;
            } else {
                // Initialize default heading if not exists
                setDoc(settingsDoc, { heading: "AKSHAY MOHANAN" });
            }
        });

        // Listen for Gallery changes
        const q = query(itemsCol, orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            galleryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderGallery();
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}

// Global scope functions for HTML onclick
window.editItem = (id) => {
    const item = galleryItems.find(i => i.id === id);
    if (!item) return;

    adminPanel.classList.remove('hidden');
    adminPanelTitle.textContent = "Edit Media Item";
    uploadBtn.textContent = "Update Item";

    editIdInput.value = item.id;
    descriptionInput.value = item.description;
    mediaInput.required = false;

    adminPanel.scrollIntoView({ behavior: 'smooth' });
};

window.deleteItem = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    showLoader(true);
    try {
        const item = galleryItems.find(i => i.id === id);
        if (item && item.storagePath) {
            const fileRef = ref(storage, item.storagePath);
            await deleteObject(fileRef);
        }
        await deleteDoc(doc(db, "items", id));
        alert("Item deleted successfully!");
    } catch (error) {
        console.error("Delete Error:", error);
        alert("Error deleting item.");
    } finally {
        showLoader(false);
    }
};

// UI Helpers
function showLoader(show) {
    loadingOverlay.classList.toggle('hidden', !show);
}

function resetUploadForm() {
    uploadForm.reset();
    editIdInput.value = '';
    mediaInput.required = true;
    adminPanelTitle.textContent = "Add New Media";
    uploadBtn.textContent = "Upload to Gallery";
}

// Authentication Flow
adminLoginBtn.addEventListener('click', () => {
    if (isAdmin) {
        adminPanel.classList.toggle('hidden');
        resetUploadForm();
    } else {
        openPasswordModal();
    }
});

function openPasswordModal() {
    passwordModal.classList.remove('hidden');
    passwordInput.value = '';
    passwordInput.focus();
}

function closePasswordModal() {
    passwordModal.classList.add('hidden');
}

submitPassword.addEventListener('click', () => {
    if (passwordInput.value === ADMIN_PASSWORD) {
        isAdmin = true;
        document.body.classList.add('admin-active');
        closePasswordModal();
        adminPanel.classList.remove('hidden');
        adminLoginBtn.textContent = "Admin Mode Active";
        renderGallery();
        alert("Access Granted!");
    } else {
        alert("Incorrect Password!");
    }
});

cancelPassword.addEventListener('click', closePasswordModal);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitPassword.click();
});

// Admin Panel Actions
closeAdminBtn.addEventListener('click', () => {
    adminPanel.classList.add('hidden');
});

toggleEditHeading.addEventListener('click', async () => {
    const isEditable = mainHeading.contentEditable === "true";
    mainHeading.contentEditable = !isEditable;

    if (isEditable) {
        try {
            await updateDoc(settingsDoc, { heading: mainHeading.textContent });
            toggleEditHeading.textContent = "Edit Page Heading";
            toggleEditHeading.classList.remove('primary');
        } catch (error) {
            alert("Error saving heading.");
        }
    } else {
        mainHeading.focus();
        toggleEditHeading.textContent = "Save Heading";
        toggleEditHeading.classList.add('primary');
    }
});

// Upload / Update Handling
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = mediaInput.files[0];
    const description = descriptionInput.value;
    const editId = editIdInput.value;

    showLoader(true);

    try {
        if (editId) {
            // Update Existing
            const updateData = { description };
            if (file) {
                const storagePath = `uploads/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, storagePath);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                updateData.url = url;
                updateData.type = file.type.startsWith('image/') ? 'image' : 'video';
                updateData.storagePath = storagePath;

                // Optional: Delete old file if storagePath exists
                const oldItem = galleryItems.find(i => i.id === editId);
                if (oldItem && oldItem.storagePath) {
                    try { await deleteObject(ref(storage, oldItem.storagePath)); } catch (e) { }
                }
            }
            await updateDoc(doc(db, "items", editId), updateData);
            alert("Updated successfully!");
        } else {
            // New Upload
            if (!file) throw new Error("File required");

            const storagePath = `uploads/${Date.now()}_${file.name}`;
            const fileRef = ref(storage, storagePath);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);

            await addDoc(itemsCol, {
                type: file.type.startsWith('image/') ? 'image' : 'video',
                url: url,
                storagePath: storagePath,
                description: description,
                timestamp: new Date().toISOString()
            });
            alert("Uploaded successfully!");
        }
        resetUploadForm();
        adminPanel.classList.add('hidden');
    } catch (error) {
        console.error("Upload Error:", error);
        alert("Detailed error: " + error.message);
    } finally {
        showLoader(false);
    }
});

// Rendering
function renderGallery() {
    galleryFeed.innerHTML = '';
    if (galleryItems.length === 0) {
        galleryFeed.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No media items yet.</p>';
        return;
    }

    galleryItems.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'gallery-item';
        itemEl.style.animationDelay = `${index * 0.1}s`;

        let mediaHtml = item.type === 'image'
            ? `<img src="${item.url}" alt="Gallery Image" loading="lazy">`
            : `<video src="${item.url}" controls muted></video>`;

        itemEl.innerHTML = `
            <div class="media-container">${mediaHtml}</div>
            <div class="item-info"><p>${item.description}</p></div>
            <div class="admin-item-actions">
                <button class="glass-btn edit-btn" onclick="editItem('${item.id}')">Edit</button>
                <button class="glass-btn delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
            </div>
        `;
        galleryFeed.appendChild(itemEl);
    });
}

init();
