import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// 🔹 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBjETYfARoznCccd9xRsaKFnMNdpH8vX6A",
  authDomain: "rayka-menu.firebaseapp.com",
  projectId: "rayka-menu",
  storageBucket: "rayka-menu.appspot.com",
  messagingSenderId: "726356505640",
  appId: "1:726356505640:web:4c59c5560408d11784711d"
};

// 🔹 Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("🔥 Firebase connected");

// 🔹 Admin password
const ADMIN_PASSWORD = '1234';

// 🔹 State
let menuData = [];
let orders = [];
let nextOrderId = 1;
let nextItemId = 1;

// DOM Elements
let loginPage, adminDashboard;
let adminInitialized = false;

// ============================================
// 🔹 INITIALIZE ON PAGE LOAD
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log('🌍 Page loaded - initializing...');
  
  loginPage = document.getElementById("loginPage");
  adminDashboard = document.getElementById("adminDashboard");

  if (!loginPage || !adminDashboard) {
    console.error("❌ loginPage or adminDashboard not found");
    return;
  }

  // Load data from localStorage or Firebase
  await loadAllData();
  setupLoginForm();
  checkLoginStatus();
});

// ============================================
// 🔹 LOAD ALL DATA (Firebase + LocalStorage)
// ============================================
async function loadAllData() {
  try {
    // Load menu from Firebase
    await loadMenuFromFirestore();
    
    // Load orders from localStorage
    orders = JSON.parse(localStorage.getItem('orders')) || [];
    nextOrderId = parseInt(localStorage.getItem('nextOrderId')) || 1;
    
    console.log('✅ All data loaded');
  } catch (err) {
    console.error('❌ Error loading data:', err);
  }
}

// Load menu from Firestore
async function loadMenuFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, "menu"));
    
    // Group items by category
    const categoriesMap = {};
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const category = data.category || 'Other';
      
      if (!categoriesMap[category]) {
        categoriesMap[category] = {
          category: category,
          items: []
        };
      }
      
      categoriesMap[category].items.push({
        id: data.id || docSnap.id,
        name: data.name,
        description: data.description,
        price: data.price,
        image: data.image,
        docId: docSnap.id // Store Firebase doc ID for updates
      });
    });
    
    menuData = Object.values(categoriesMap);
    
    // Calculate nextItemId
    const allItems = menuData.flatMap(cat => cat.items || []);
    nextItemId = allItems.length > 0 
      ? Math.max(...allItems.map(item => item.id || 0)) + 1 
      : 1;
    
    console.log('✅ Menu loaded from Firestore:', menuData);
  } catch (err) {
    console.error('❌ Error loading menu from Firestore:', err);
    // Load from localStorage as fallback
    try {
      const saved = JSON.parse(localStorage.getItem('menuData'));
      if (saved) menuData = saved;
    } catch (e) {}
  }
}

// ============================================
// 🔹 LOGIN SETUP
// ============================================
function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  const adminPassword = document.getElementById('admin-password');
  const loginError = document.getElementById('login-error');
  
  if (!loginForm) {
    console.error('❌ Login form not found');
    return;
  }
  
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const pwd = adminPassword.value.trim();
    
    if (pwd === ADMIN_PASSWORD) {
      console.log('✅ Password correct');
      localStorage.setItem('adminLoggedIn', 'true');
      showDashboard();
      loginForm.reset();
      if (loginError) loginError.style.display = 'none';
      initializeAdmin();
    } else {
      console.log('❌ Password incorrect');
      if (loginError) {
        loginError.textContent = 'رمزعبور نادرست است!';
        loginError.style.display = 'block';
      }
      adminPassword.value = '';
    }
  });
}

function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
  if (isLoggedIn) {
    showDashboard();
    initializeAdmin();
  } else {
    showLoginPage();
  }
}

function showLoginPage() {
  loginPage.classList.add('show');
  adminDashboard.classList.remove('show');
  loginPage.style.display = 'flex';
  adminDashboard.style.display = 'none';
}

function showDashboard() {
  loginPage.classList.remove('show');
  adminDashboard.classList.add('show');
  loginPage.style.display = 'none';
  adminDashboard.style.display = 'block';
}

// ============================================
// 🔹 INITIALIZE ADMIN PANEL
// ============================================
function initializeAdmin() {
  if (adminInitialized) return;
  adminInitialized = true;
  
  console.log('⚙️ Initializing admin panel...');
  
  try {
    setupLogoutButton();
    setupTabs();
    setupMenuManagement();
    setupEditModal();
    setupOrdersManagement();
    setupExportButtons();
    loadItemsTable();
    displayOrders();
    updateReports();
    
    console.log('✅ Admin panel initialized');
  } catch (err) {
    console.error('❌ Error initializing admin:', err);
  }
}

// Setup logout button
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  
  logoutBtn.addEventListener('click', () => {
    localStorage.setItem('adminLoggedIn', 'false');
    adminInitialized = false;
    showLoginPage();
  });
}

// ============================================
// 🔹 TABS SETUP
// ============================================
function setupTabs() {
  const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
  const adminTabContents = document.querySelectorAll('.admin-tab-content');

  adminTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      // Hide all tabs
      adminTabContents.forEach(content => {
        content.classList.remove('show');
      });
      
      // Remove active class from all buttons
      adminTabBtns.forEach(b => {
        b.classList.remove('active');
      });
      
      // Show selected tab
      const tabContent = document.getElementById(tabName + '-tab');
      if (tabContent) {
        tabContent.classList.add('show');
        btn.classList.add('active');
      }
      
      // Update reports if needed
      if (tabName === 'reports') {
        updateReports();
      }
    });
  });
  
  // Set first tab as active
  if (adminTabBtns.length > 0) {
    adminTabBtns[0].click();
  }
}

// ============================================
// 🔹 MENU MANAGEMENT
// ============================================
function setupMenuManagement() {
  const addItemForm = document.getElementById('add-item-form');
  
  if (!addItemForm) {
    console.warn('❌ Add item form not found');
    return;
  }

  addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = document.getElementById('item-category').value.trim();
    const name = document.getElementById('item-name').value.trim();
    const description = document.getElementById('item-description').value.trim();
    const price = parseInt(document.getElementById('item-price').value) || 0;
    const imageFile = document.getElementById('item-image')?.files[0];
    
    if (!category || !name || !price) {
      alert('لطفاً تمام فیلدهای اجباری را پر کنید');
      return;
    }
    
    try {
      let imageData = null;
      
      // Convert image to base64
      if (imageFile) {
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(imageFile);
        });
      }
      
      // Add to Firebase
      const docRef = await addDoc(collection(db, 'menu'), {
        id: nextItemId,
        name,
        description,
        price,
        category,
        image: imageData,
        createdAt: new Date().toISOString()
      });
      
      // Update local menuData
      let cat = menuData.find(c => c.category === category);
      if (!cat) {
        cat = { category, items: [] };
        menuData.push(cat);
      }
      
      cat.items.push({
        id: nextItemId,
        name,
        description,
        price,
        image: imageData,
        docId: docRef.id
      });
      
      nextItemId++;
      
      // Save to localStorage
      try {
        localStorage.setItem('menuData', JSON.stringify(menuData));
      } catch (e) {
        console.warn('Failed to save to localStorage');
      }
      
      addItemForm.reset();
      loadItemsTable();
      alert('✅ آیتم با موفقیت اضافه شد!');
    } catch (err) {
      console.error('❌ Error adding item:', err);
      alert('خطا در اضافه کردن آیتم');
    }
  });
}

function loadItemsTable() {
  const itemsTableBody = document.getElementById('items-table-body');
  if (!itemsTableBody) {
    console.warn('❌ Items table body not found');
    return;
  }
  
  itemsTableBody.innerHTML = '';
  
  menuData.forEach(category => {
    category.items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.image ? `<img src="${item.image}" style="width:60px;height:auto;border-radius:6px;">` : '-'}</td>
        <td>${category.category}</td>
        <td>${item.description || '-'}</td>
        <td>${formatPrice(item.price)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" onclick="editItem(${item.id})">ویرایش</button>
            <button class="btn-delete" onclick="deleteItem(${item.id}, '${category.category}')">حذف</button>
          </div>
        </td>
      `;
      itemsTableBody.appendChild(row);
    });
  });
}

// ============================================
// 🔹 EDIT ITEM
// ============================================
function setupEditModal() {
  const editModal = document.getElementById('edit-modal');
  const editItemForm = document.getElementById('edit-item-form');
  const closeBtn = document.querySelector('.close-btn');
  
  if (!editModal || !editItemForm || !closeBtn) {
    console.warn('❌ Edit modal elements not found');
    return;
  }

  closeBtn.addEventListener('click', () => {
    editModal.classList.remove('show');
  });

  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      editModal.classList.remove('show');
    }
  });
  
  editItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const itemId = Number(editItemForm.getAttribute('data-id'));
    const oldCategory = editItemForm.getAttribute('data-category');
    const docId = editItemForm.getAttribute('data-doc-id');
    
    const newName = document.getElementById('edit-name').value.trim();
    const newDescription = document.getElementById('edit-description').value.trim();
    const newPrice = parseInt(document.getElementById('edit-price').value) || 0;
    const newCategory = document.getElementById('edit-category').value.trim();
    const imageFile = document.getElementById('edit-image').files[0];
    
    try {
      // Find old item
      const oldCat = menuData.find(c => c.category === oldCategory);
      if (!oldCat) {
        alert('دسته‌بندی پیدا نشد');
        return;
      }
      
      const oldItemIndex = oldCat.items.findIndex(i => i.id === itemId);
      if (oldItemIndex === -1) {
        alert('آیتم پیدا نشد');
        return;
      }
      
      const oldItem = oldCat.items[oldItemIndex];
      let newImage = oldItem.image;
      
      // Handle new image
      if (imageFile) {
        newImage = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(imageFile);
        });
      }
      
      // Update in Firebase
      if (docId) {
        await updateDoc(doc(db, 'menu', docId), {
          name: newName,
          description: newDescription,
          price: newPrice,
          category: newCategory,
          image: newImage,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Handle category change
      if (newCategory !== oldCategory) {
        oldCat.items.splice(oldItemIndex, 1);
        
        // Remove category if empty
        if (oldCat.items.length === 0) {
          menuData = menuData.filter(c => c.category !== oldCategory);
        }
        
        // Add to new category
        let newCat = menuData.find(c => c.category === newCategory);
        if (!newCat) {
          newCat = { category: newCategory, items: [] };
          menuData.push(newCat);
        }
        
        newCat.items.push({
          id: itemId,
          name: newName,
          description: newDescription,
          price: newPrice,
          image: newImage,
          docId: docId
        });
      } else {
        // Update in same category
        oldItem.name = newName;
        oldItem.description = newDescription;
        oldItem.price = newPrice;
        oldItem.image = newImage;
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('menuData', JSON.stringify(menuData));
      } catch (e) {
        console.warn('Failed to save to localStorage');
      }
      
      editModal.classList.remove('show');
      loadItemsTable();
      alert('✅ آیتم با موفقیت ویرایش شد!');
    } catch (err) {
      console.error('❌ Error updating item:', err);
      alert('خطا در ویرایش آیتم');
    }
  });
}

function editItem(itemId) {
  let foundItem = null;
  let foundCategory = null;

  menuData.forEach(category => {
    const item = category.items.find(i => i.id === itemId);
    if (item) {
      foundItem = item;
      foundCategory = category.category;
    }
  });

  if (!foundItem) {
    alert('آیتم پیدا نشد');
    return;
  }

  // Fill form
  document.getElementById('edit-name').value = foundItem.name || '';
  document.getElementById('edit-description').value = foundItem.description || '';
  document.getElementById('edit-price').value = foundItem.price || '';
  document.getElementById('edit-category').value = foundCategory || '';

  // Show image preview
  const imagePreview = document.getElementById('edit-image-preview');
  if (foundItem.image) {
    imagePreview.src = foundItem.image;
    imagePreview.style.display = 'block';
  } else {
    imagePreview.style.display = 'none';
  }

  // Store data in form
  const editForm = document.getElementById('edit-item-form');
  editForm.setAttribute('data-id', itemId);
  editForm.setAttribute('data-category', foundCategory);
  editForm.setAttribute('data-doc-id', foundItem.docId || '');

  // Show modal
  const editModal = document.getElementById('edit-modal');
  editModal.classList.add('show');
}

function deleteItem(itemId, category) {
  if (!confirm('آیا مطمئن هستید؟')) return;
  
  const cat = menuData.find(c => c.category === category);
  const itemIndex = cat.items.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) return;
  
  const docId = cat.items[itemIndex].docId;
  
  // Delete from Firebase
  if (docId) {
    deleteDoc(doc(db, 'menu', docId)).catch(err => {
      console.error('❌ Error deleting from Firebase:', err);
    });
  }
  
  // Delete from local
  cat.items.splice(itemIndex, 1);
  
  // Remove category if empty
  if (cat.items.length === 0) {
    menuData = menuData.filter(c => c.category !== category);
  }
  
  // Save to localStorage
  try {
    localStorage.setItem('menuData', JSON.stringify(menuData));
  } catch (e) {
    console.warn('Failed to save to localStorage');
  }
  
  loadItemsTable();
  alert('✅ آیتم با موفقیت حذف شد!');
}

// ============================================
// 🔹 ORDERS MANAGEMENT
// ============================================
function setupOrdersManagement() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      displayOrders(filter);
    });
  });
}

function displayOrders(filter = 'all') {
  const ordersContainer = document.getElementById('orders-container');
  if (!ordersContainer) {
    console.warn('❌ Orders container not found');
    return;
  }
  
  ordersContainer.innerHTML = '';
  
  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);
  
  if (filteredOrders.length === 0) {
    ordersContainer.innerHTML = '<div class="empty-message">هیچ سفارشی وجود ندارد</div>';
    return;
  }
  
  filteredOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(order => {
    const card = createOrderCard(order);
    ordersContainer.appendChild(card);
  });
}

function createOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'order-card';
  
  const date = new Date(order.timestamp);
  const dateStr = date.toLocaleDateString('fa-IR');
  const timeStr = date.toLocaleTimeString('fa-IR');
  
  let itemsHTML = '';
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(item => {
      itemsHTML += `
        <div class="order-item">
          <span>${item.quantity || 1}x ${item.name}</span>
          <span>${formatPrice(item.price || 0)} تومان</span>
        </div>
      `;
    });
  }
  
  const total = order.items 
    ? order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
    : 0;
  
  card.innerHTML = `
    <div class="order-header">
      <div class="order-id">سفارش #${order.id}</div>
      <span class="order-status ${order.status}">${order.status === 'pending' ? 'در انتظار' : 'تکمیل شده'}</span>
    </div>
    <div class="order-info">
      <div class="order-info-item">
        <span class="order-info-label">میز:</span>
        <span>${order.tableNumber || '-'}</span>
      </div>
      <div class="order-info-item">
        <span class="order-info-label">تاریخ:</span>
        <span>${dateStr}</span>
      </div>
      <div class="order-info-item">
        <span class="order-info-label">ساعت:</span>
        <span>${timeStr}</span>
      </div>
    </div>
    <div class="order-items">
      ${itemsHTML || '<div class="empty-message">اطلاعات موجود نیست</div>'}
    </div>
    <div class="order-info">
      <div class="order-info-item">
        <span class="order-info-label">جمع کل:</span>
        <span><strong>${formatPrice(total)} تومان</strong></span>
      </div>
    </div>
    <div class="order-actions">
      ${order.status === 'pending' 
        ? `<button class="btn-complete" onclick="window.completeOrder(${order.id})">تکمیل</button>` 
        : ''}
      <button class="btn-delete-order" onclick="window.deleteOrder(${order.id})">حذف</button>
    </div>
  `;
  
  return card;
}

function completeOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'completed';
    localStorage.setItem('orders', JSON.stringify(orders));
    displayOrders(document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all');
    updateReports();
  }
}

function deleteOrder(orderId) {
  if (!confirm('آیا مطمئن هستید؟')) return;
  
  orders = orders.filter(o => o.id !== orderId);
  localStorage.setItem('orders', JSON.stringify(orders));
  displayOrders(document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all');
  updateReports();
}

// ============================================
// 🔹 REPORTS
// ============================================
function updateReports() {
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  
  let totalRevenue = 0;
  orders.forEach(order => {
    if (order.items) {
      totalRevenue += order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    }
  });
  
  const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Update report cards
  const totalOrdersEl = document.getElementById('total-orders');
  const completedOrdersEl = document.getElementById('completed-orders');
  const totalRevenueEl = document.getElementById('total-revenue');
  const averageOrderEl = document.getElementById('average-order');
  
  if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
  if (completedOrdersEl) completedOrdersEl.textContent = completedOrders;
  if (totalRevenueEl) totalRevenueEl.textContent = formatPrice(totalRevenue) + ' تومان';
  if (averageOrderEl) averageOrderEl.textContent = formatPrice(averageOrder) + ' تومان';
  
  // Popular items
  const itemStats = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        if (!itemStats[item.name]) {
          itemStats[item.name] = { name: item.name, count: 0, revenue: 0 };
        }
        itemStats[item.name].count += item.quantity || 1;
        itemStats[item.name].revenue += (item.price || 0) * (item.quantity || 1);
      });
    }
  });
  
  const popularItems = Object.values(itemStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const popularItemsBody = document.getElementById('popular-items-body');
  if (popularItemsBody) {
    popularItemsBody.innerHTML = '';
    
    if (popularItems.length === 0) {
      popularItemsBody.innerHTML = '<tr><td colspan="3" class="empty-message">سفارشی وجود ندارد</td></tr>';
    } else {
      popularItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.count}</td>
          <td>${formatPrice(item.revenue)} تومان</td>
        `;
        popularItemsBody.appendChild(row);
      });
    }
  }
}

// ============================================
// 🔹 EXPORT
// ============================================
function setupExportButtons() {
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => exportReport('pdf'));
  }
  
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => exportReport('csv'));
  }
}

function exportReport(format) {
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  let totalRevenue = 0;
  
  orders.forEach(order => {
    if (order.items) {
      totalRevenue += order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    }
  });
  
  const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  if (format === 'csv') {
    let csv = 'گزارش فروش - کافه رایکا\n';
    csv += `تاریخ: ${new Date().toLocaleDateString('fa-IR')}\n\n`;
    csv += 'آمار کلی\n';
    csv += `کل سفارش‌ها,${totalOrders}\n`;
    csv += `سفارش‌های تکمیل شده,${completedOrders}\n`;
    csv += `کل درآمد,${totalRevenue}\n`;
    csv += `میانگین سفارش,${Math.round(averageOrder)}\n\n`;
    csv += 'جزئیات سفارش‌ها\n';
    csv += 'شماره سفارش,میز,تاریخ,وضعیت,جمع کل\n';
    
    orders.forEach(order => {
      const date = new Date(order.timestamp).toLocaleDateString('fa-IR');
      const total = order.items 
        ? order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
        : 0;
      csv += `${order.id},${order.tableNumber || '-'},${date},${order.status === 'pending' ? 'در انتظار' : 'تکمیل شده'},${total}\n`;
    });
    
    downloadFile(csv, 'report.csv', 'text/csv;charset=utf-8;');
  } else {
    alert('برای دانلود PDF، لطفاً از ابزار پرینت مرورگر استفاده کنید.');
  }
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// 🔹 UTILITIES
// ============================================
function formatPrice(price) {
  return Math.round(price).toLocaleString('fa-IR');
}

// Expose functions to window for onclick handlers
window.editItem = editItem;
window.deleteItem = deleteItem;
window.completeOrder = completeOrder;
window.deleteOrder = deleteOrder;