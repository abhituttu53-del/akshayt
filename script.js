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

const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const submitPassword = document.getElementById('submit-password');
const cancelPassword = document.getElementById('cancel-password');

// State
let isAdmin = false;
let galleryItems = JSON.parse(localStorage.getItem('gallery_items')) || [];
let currentHeading = localStorage.getItem('gallery_heading') || "AKSHAY MOHANAN";

// Initialization
function init() {
    mainHeading.textContent = currentHeading;
    renderGallery();
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
        renderGallery(); // Re-render to show edit/delete buttons
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

toggleEditHeading.addEventListener('click', () => {
    const isEditable = mainHeading.contentEditable === "true";
    mainHeading.contentEditable = !isEditable;

    if (isEditable) {
        // Just disabled editing, save the content
        currentHeading = mainHeading.textContent;
        localStorage.setItem('gallery_heading', currentHeading);
        toggleEditHeading.textContent = "Edit Page Heading";
        toggleEditHeading.classList.remove('primary');
    } else {
        mainHeading.focus();
        toggleEditHeading.textContent = "Save Heading";
        toggleEditHeading.classList.add('primary');
    }
});

mainHeading.addEventListener('blur', () => {
    if (mainHeading.contentEditable === "true") {
        currentHeading = mainHeading.textContent;
        localStorage.setItem('gallery_heading', currentHeading);
    }
});

// Upload / Update Handling
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = mediaInput.files[0];
    const description = descriptionInput.value;
    const editId = editIdInput.value;

    let newItem;
    if (editId) {
        // Find existing item
        const index = galleryItems.findIndex(item => item.id == editId);
        if (index !== -1) {
            newItem = { ...galleryItems[index], description };

            // If new file provided, update it
            if (file) {
                newItem.url = await readFileAsDataURL(file);
                newItem.type = file.type.startsWith('image/') ? 'image' : 'video';
            }

            galleryItems[index] = newItem;
            alert("Item updated successfully!");
        }
    } else {
        if (!file) {
            alert("Please select a file to upload.");
            return;
        }

        const dataUrl = await readFileAsDataURL(file);
        const type = file.type.startsWith('image/') ? 'image' : 'video';

        newItem = {
            id: Date.now(),
            type,
            url: dataUrl,
            description,
            timestamp: new Date().toISOString()
        };

        galleryItems.unshift(newItem);
        alert("Media uploaded successfully!");
    }

    localStorage.setItem('gallery_items', JSON.stringify(galleryItems));

    resetUploadForm();
    renderGallery();
});

function resetUploadForm() {
    uploadForm.reset();
    editIdInput.value = '';
    mediaInput.required = true;
    adminPanelTitle.textContent = "Add New Media";
    uploadBtn.textContent = "Upload to Gallery";
}

function editItem(id) {
    const item = galleryItems.find(i => i.id == id);
    if (!item) return;

    adminPanel.classList.remove('hidden');
    adminPanelTitle.textContent = "Edit Media Item";
    uploadBtn.textContent = "Update Item";

    editIdInput.value = item.id;
    descriptionInput.value = item.description;
    mediaInput.required = false; // Not required during edit unless changing

    adminPanel.scrollIntoView({ behavior: 'smooth' });
}

function deleteItem(id) {
    if (confirm("Are you sure you want to delete this item?")) {
        galleryItems = galleryItems.filter(item => item.id != id);
        localStorage.setItem('gallery_items', JSON.stringify(galleryItems));
        renderGallery();
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Rendering
function renderGallery() {
    galleryFeed.innerHTML = '';

    if (galleryItems.length === 0) {
        galleryFeed.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No media items yet. Admin can upload photos or videos.</p>';
        return;
    }

    galleryItems.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'gallery-item';
        itemEl.style.animationDelay = `${index * 0.1}s`;

        let mediaHtml = '';
        if (item.type === 'image') {
            mediaHtml = `<img src="${item.url}" alt="Gallery Image" loading="lazy">`;
        } else {
            mediaHtml = `<video src="${item.url}" controls muted></video>`;
        }

        itemEl.innerHTML = `
            <div class="media-container">
                ${mediaHtml}
            </div>
            <div class="item-info">
                <p>${item.description}</p>
            </div>
            <div class="admin-item-actions">
                <button class="glass-btn edit-btn" onclick="editItem(${item.id})">Edit</button>
                <button class="glass-btn delete-btn" onclick="deleteItem(${item.id})">Delete</button>
            </div>
        `;

        galleryFeed.appendChild(itemEl);
    });
}

init();
