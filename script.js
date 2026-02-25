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
const { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js");

const ADMIN_PASSWORD = "abhi9400";
const AUTH_TOKEN_KEY = "akshay_gallery_auth_token";
const AUTH_TOKEN_VALUE = "authorized_device_token_9400"; // Unique token for this computer

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
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');

const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const submitPassword = document.getElementById('submit-password');
const cancelPassword = document.getElementById('cancel-password');

// State
let isAdmin = false;
let isDeviceAuthorized = localStorage.getItem(AUTH_TOKEN_KEY) === AUTH_TOKEN_VALUE;
let galleryItems = [];
let currentHeading = "AKSHAY MOHANAN";

// Initialization
async function init() {
    // Check if this is the admin's computer
    if (isDeviceAuthorized) {
        adminLoginBtn.classList.remove('hidden');
        adminLoginBtn.textContent = "Admin Control Panel";
    } else {
        // If not authorized, hide the login button so others can't see it easily
        adminLoginBtn.classList.add('hidden');

        // Secret way to show login for first-time pairing: 
        // Double click the heading to show the login button
        mainHeading.addEventListener('dblclick', () => {
            adminLoginBtn.classList.remove('hidden');
            adminLoginBtn.textContent = "Admin Login (First Time)";
        });
    }

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

        // Listen for Heading changes (Public)
        onSnapshot(settingsDoc, (docSnap) => {
            if (docSnap.exists()) {
                currentHeading = docSnap.data().heading || "AKSHAY MOHANAN";
                mainHeading.textContent = currentHeading;
            } else {
                setDoc(settingsDoc, { heading: "AKSHAY MOHANAN" });
            }
        });

        // Listen for Gallery changes (Public)
        const q = query(itemsCol, orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            galleryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderGallery();
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}

// ... (editItem and deleteItem remain, but will check authorization)

window.editItem = (id) => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) return; // Double check auth
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
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
        alert("Unauthorized device.");
        return;
    }
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
        // Correct Password -> Authorize this computer permanently
        localStorage.setItem(AUTH_TOKEN_KEY, AUTH_TOKEN_VALUE);
        isDeviceAuthorized = true;
        isAdmin = true;

        document.body.classList.add('admin-active');
        closePasswordModal();
        adminPanel.classList.remove('hidden');
        adminLoginBtn.textContent = "Admin Mode Active (This Computer Only)";
        adminLoginBtn.classList.remove('hidden');
        renderGallery();
        alert("Device Authorized! Only this computer can now access these tools.");
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

// Image Compression Helper
async function compressImage(file, { maxWidth = 1920, maxHeight = 1080, quality = 0.7 } = {}) {
    if (!file.type.startsWith('image/')) return file; // Skip compression for non-images (videos)

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        reject(new Error("Canvas to Blob conversion failed"));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Upload / Update Handling
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
        alert("Error: Only authorized devices can upload.");
        return;
    }

    const file = mediaInput.files[0];
    const description = descriptionInput.value;
    const editId = editIdInput.value;

    showLoader(true);
    progressBar.style.width = '0%';

    try {
        let finalFile = file;

        // Compress image if it's an image
        if (file && file.type.startsWith('image/')) {
            loadingText.textContent = "Compressing image...";
            progressBar.style.width = '50%'; // Visual placeholder for compression
            finalFile = await compressImage(file);
        }

        loadingText.textContent = "Starting upload...";
        progressBar.style.width = '0%';

        if (editId) {
            // Update Existing
            const updateData = { description };
            if (file) {
                const storagePath = `uploads/${Date.now()}_${finalFile.name}`;
                const fileRef = ref(storage, storagePath);

                const uploadTask = uploadBytesResumable(fileRef, finalFile);

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            progressBar.style.width = progress + '%';
                            loadingText.textContent = `Uploading: ${Math.round(progress)}%`;
                        },
                        (error) => reject(error),
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            updateData.url = url;
                            updateData.type = finalFile.type.startsWith('image/') ? 'image' : 'video';
                            updateData.storagePath = storagePath;
                            resolve();
                        }
                    );
                });

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

            const storagePath = `uploads/${Date.now()}_${finalFile.name}`;
            const fileRef = ref(storage, storagePath);

            const uploadTask = uploadBytesResumable(fileRef, finalFile);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.style.width = progress + '%';
                        loadingText.textContent = `Uploading: ${Math.round(progress)}%`;
                    },
                    (error) => reject(error),
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        await addDoc(itemsCol, {
                            type: finalFile.type.startsWith('image/') ? 'image' : 'video',
                            url: url,
                            storagePath: storagePath,
                            description: description,
                            timestamp: new Date().toISOString()
                        });
                        resolve();
                    }
                );
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
