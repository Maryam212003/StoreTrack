document.addEventListener('DOMContentLoaded', () => {
    // API Base URL - Change this if your API runs on a different port
    const API_BASE_URL = 'http://localhost:3000'; 

    const state = {
        currentPage: 'dashboard',
        products: [],
        categories: [],
        orders: [],
        stockHistory: []
    };

    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const productsList = document.getElementById('products-list');
    const ordersList = document.getElementById('orders-list');
    const stockHistoryList = document.getElementById('stock-history-list');

    // Chart.js instance for sales report
    let salesChart;

    // --- Core UI Functions ---

    function showPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');

        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        state.currentPage = pageId;

        // Fetch data based on the page
        if (pageId === 'dashboard') {
            fetchDashboardData();
        } else if (pageId === 'products') {
            fetchProducts();
            fetchCategories();
        } else if (pageId === 'orders') {
            fetchOrders();
        } else if (pageId === 'reports') {
            renderSalesChart();
            fetchStockHistory();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.target.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // --- Data Fetching Functions ---

    async function fetchData(url) {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('خطا در دریافت اطلاعات. لطفاً از روشن بودن سرور بک‌اند مطمئن شوید.');
            return [];
        }
    }

    async function fetchDashboardData() {
        // Fetch all data for stats and recent activity
        const products = await fetchData('/products/allProducts');
        const orders = await fetchData('/orders/getAll/');
        const lowStockProducts = products.filter(p => p.stock <= 100); // Using the same threshold as backend

        document.getElementById('total-products').textContent = products.length;
        document.getElementById('total-orders').textContent = orders.length;
        document.getElementById('low-stock-count').textContent = lowStockProducts.length;

        // Populate recent activity (e.g., last 5 orders)
        const recentActivityList = document.getElementById('recent-activity-list');
        recentActivityList.innerHTML = '';
        const recentOrders = orders.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        recentOrders.forEach(order => {
            const li = document.createElement('li');
            li.innerHTML = `سفارش #${order.id} با مبلغ ${order.totalValue.toLocaleString()} تومان در تاریخ ${new Date(order.date).toLocaleDateString('fa-IR')} ثبت شد.`;
            recentActivityList.appendChild(li);
        });
    }

    async function fetchProducts() {
        state.products = await fetchData('/products/allProducts');
        renderProducts();
    }
    
    async function fetchCategories() {
        state.categories = await fetchData('/categories');
        renderCategories();
    }

    async function fetchOrders() {
        state.orders = await fetchData('/orders/getAll/');
        renderOrders();
    }

    async function fetchStockHistory(filters = {}) {
        const url = new URL(`${API_BASE_URL}/stockHistory/search`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filters)
        });
        state.stockHistory = await response.json();
        renderStockHistory();
    }

    // --- Rendering Functions ---

    function renderProducts(productsToRender = state.products) {
        productsList.innerHTML = '';
        productsToRender.forEach(product => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${product.name}</td>
                <td>${product.category ? product.category.description : 'نامشخص'}</td>
                <td>${product.stock}</td>
                <td>${product.price.toLocaleString()} تومان</td>
                <td>
                    <button class="btn btn-secondary" onclick="editProduct(${product.id})">ویرایش</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">حذف</button>
                </td>
            `;
            productsList.appendChild(tr);
        });
    }

    function renderCategories() {
        const categorySelects = document.querySelectorAll('#product-category, #category-filter');

        categorySelects.forEach(select => {
            select.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>';
            state.categories.forEach(category => {
                appendCategoryOption(select, category);
            });
        });
    }

    function appendCategoryOption(select, category, level = 0) {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${'— '.repeat(level)}${category.description}`;
        select.appendChild(option);

        if (category.children && category.children.length > 0) {
            category.children.forEach(child => appendCategoryOption(select, child, level + 1));
        }
    }

    
    function renderOrders(ordersToRender = state.orders) {
        ordersList.innerHTML = '';
        ordersToRender.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${new Date(order.date).toLocaleDateString('fa-IR')}</td>
                <td>${order.totalItems}</td>
                <td>${order.totalValue.toLocaleString()} تومان</td>
                <td><span class="status-badge status-${order.status}">${orderStatusMap[order.status]}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="viewOrderDetails(${order.id})">جزئیات</button>
                    ${order.status === 'PENDING' ? `<button class="btn btn-danger" onclick="cancelOrder(${order.id})">لغو</button>` : ''}
                </td>
            `;
            ordersList.appendChild(tr);
        });
    }

    function renderStockHistory() {
        stockHistoryList.innerHTML = '';
        state.stockHistory.forEach(history => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(history.date).toLocaleDateString('fa-IR')}</td>
                <td>${history.productId}</td>
                <td>${history.type === 'IN' ? 'ورودی' : 'خروجی'}</td>
                <td>${history.quantity}</td>
            `;
            stockHistoryList.appendChild(tr);
        });
    }

    function renderSalesChart() {
        const ctx = document.getElementById('sales-chart').getContext('2d');
        if (salesChart) {
            salesChart.destroy();
        }

        const dailySales = {};
        state.orders.forEach(order => {
            if (order.status !== 'CANCELED') {
                const date = new Date(order.date).toLocaleDateString('fa-IR');
                dailySales[date] = (dailySales[date] || 0) + order.totalValue;
            }
        });

        const labels = Object.keys(dailySales).reverse();
        const data = Object.values(dailySales).reverse();

        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'فروش روزانه (تومان)',
                    data: data,
                    backgroundColor: '#007bff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'مبلغ فروش'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'تاریخ'
                        }
                    }
                }
            }
        });
    }

    // --- Modal Functions ---

    function showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    };

    // --- Event Handlers (CRUD & Filtering) ---

    // Product form submission
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const url = id ? `/products/update/${id}` : '/products/addNewProduct';
        const method = id ? 'PUT' : 'POST';

        const data = {
            name: document.getElementById('product-name').value,
            stock: parseInt(document.getElementById('product-stock').value),
            price: parseFloat(document.getElementById('product-price').value),
            categoryId: parseInt(document.getElementById('product-category').value)
        };

        try {
            await fetch(`${API_BASE_URL}${url}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            closeModal('product-modal');
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('خطا در ذخیره محصول.');
        }
    });

    // Product filtering
    window.filterProducts = async () => {
        const name = document.getElementById('product-search').value;
        const categoryId = document.getElementById('category-filter').value;
        const url = new URL(`${API_BASE_URL}/products/searchProduct`);

        const filters = {};
        if (name) filters.name = name;
        if (categoryId) filters.categoryId = categoryId;
        filters.isAvailable = 'true'; // Assuming we only want available products by default

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filters)
        });
        state.products = await response.json();
        renderProducts();
    };

    // Edit Product
    window.editProduct = (id) => {
        const product = state.products.find(p => p.id === id);
        if (!product) return;

        document.getElementById('product-modal-title').textContent = 'ویرایش محصول';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.categoryId;
        document.getElementById('product-id').value = product.id;
        showModal('product-modal');
    };

    // Delete (expire) Product
    window.deleteProduct = async (id) => {
        if (!confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
        try {
            await fetch(`${API_BASE_URL}/products/${id}/expire`, { method: 'POST' });
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('خطا در حذف محصول.');
        }
    };
    
    // Order filtering
    window.filterOrders = async () => {
        const startDate = document.getElementById('order-start-date').value;
        const endDate = document.getElementById('order-end-date').value;
        const status = document.getElementById('order-status-filter').value;
        
        const url = new URL(`${API_BASE_URL}/orders/search`);
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (status) filters.status = status;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filters)
        });
        state.orders = await response.json();
        renderOrders();
    };

    // View Order Details
    window.viewOrderDetails = async (id) => {
        const order = state.orders.find(o => o.id === id);
        if (!order) return;

        const detailContent = document.getElementById('order-detail-content');
        detailContent.innerHTML = `
            <p><strong>شناسه سفارش:</strong> #${order.id}</p>
            <p><strong>تاریخ:</strong> ${new Date(order.date).toLocaleDateString('fa-IR')}</p>
            <p><strong>وضعیت:</strong> <span class="status-badge status-${order.status}">${orderStatusMap[order.status]}</span></p>
            <p><strong>مجموع مبلغ:</strong> ${order.totalValue.toLocaleString()} تومان</p>
            <h3>اقلام سفارش</h3>
            <ul id="order-detail-items"></ul>
        `;

        const itemsList = document.getElementById('order-detail-items');
        order.items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.product.name} - تعداد: ${item.quantity} - قیمت: ${(item.price * item.quantity).toLocaleString()} تومان`;
            itemsList.appendChild(li);
        });

        const cancelButton = document.getElementById('cancel-order-btn');
        cancelButton.style.display = order.status === 'PENDING' ? 'block' : 'none';
        cancelButton.onclick = () => cancelOrder(id);

        showModal('order-detail-modal');
    };

    // Cancel Order
    window.cancelOrder = async (id) => {
        if (!confirm('آیا از لغو این سفارش مطمئن هستید؟ موجودی به انبار بازگردانده می‌شود.')) return;
        try {
            await fetch(`${API_BASE_URL}/orders/${id}/cancelOrder`, { method: 'PATCH' });
            closeModal('order-detail-modal');
            fetchOrders();
        } catch (error) {
            console.error('Error canceling order:', error);
            alert('خطا در لغو سفارش.');
        }
    };
    
    // Low Stock Modal
    window.showLowStockModal = () => {
        const lowStockProducts = state.products.filter(p => p.stock <= 100);
        const list = document.getElementById('low-stock-list');
        list.innerHTML = '';
        if (lowStockProducts.length === 0) {
            list.innerHTML = '<li>هیچ محصولی با موجودی کم وجود ندارد.</li>';
        } else {
            lowStockProducts.forEach(p => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${p.name}</strong> - موجودی: ${p.stock}`;
                list.appendChild(li);
            });
        }
        showModal('low-stock-modal');
    };

    // Order Creation
    let orderItems = [];

    window.showOrderModal = async () => {
        const products = await fetchData('/products/allProducts');
        const select = document.getElementById('add-order-product-select');
        select.innerHTML = '<option value="">انتخاب محصول</option>';
        products.forEach(p => {
            if (p.stock > 0) {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = `${p.name} (موجودی: ${p.stock})`;
                select.appendChild(option);
            }
        });
        orderItems = [];
        renderOrderItems();
        showModal('order-modal');
    };

    window.addOrderItem = () => {
        const select = document.getElementById('add-order-product-select');
        const quantityInput = document.getElementById('add-order-quantity');
        const productId = parseInt(select.value);
        const quantity = parseInt(quantityInput.value);

        if (!productId || quantity <= 0) return alert('لطفاً محصول و تعداد معتبر را وارد کنید.');

        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        // Check if item already exists in the order
        const existingItem = orderItems.find(item => item.productId === productId);
        if (existingItem) {
            if (product.stock < (existingItem.quantity + quantity)) {
                return alert('موجودی کافی برای این محصول وجود ندارد.');
            }
            existingItem.quantity += quantity;
        } else {
            if (product.stock < quantity) {
                return alert('موجودی کافی برای این محصول وجود ندارد.');
            }
            orderItems.push({ productId, quantity });
        }
        
        renderOrderItems();
        quantityInput.value = 1;
        select.value = '';
    };

    window.renderOrderItems = () => {
        const list = document.getElementById('order-items-list');
        list.innerHTML = '';
        orderItems.forEach(item => {
            const product = state.products.find(p => p.id === item.productId);
            if (!product) return;
            const div = document.createElement('div');
            div.className = 'order-item-row';
            div.innerHTML = `
                <span>${product.name} (${item.quantity})</span>
                <button class="btn btn-danger btn-sm" onclick="removeOrderItem(${item.productId})">حذف</button>
            `;
            list.appendChild(div);
        });
    };

    window.removeOrderItem = (productId) => {
        orderItems = orderItems.filter(item => item.productId !== productId);
        renderOrderItems();
    };

    document.getElementById('order-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (orderItems.length === 0) return alert('سفارش باید حداقل یک قلم کالا داشته باشد.');

        try {
            await fetch(`${API_BASE_URL}/orders/newOredr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: orderItems, status: 'PENDING' })
            });
            closeModal('order-modal');
            fetchOrders();
        } catch (error) {
            console.error('Error creating order:', error);
            alert('خطا در ثبت سفارش.');
        }
    });

    // Stock History filtering
    window.filterStockHistory = async () => {
        const productId = document.getElementById('history-product-id').value;
        const type = document.getElementById('history-type-filter').value;
        const startDate = document.getElementById('history-start-date').value;
        const endDate = document.getElementById('history-end-date').value;

        const filters = {};
        if (productId) filters.productId = parseInt(productId);
        if (type) filters.type = type;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        await fetchStockHistory(filters);
    };

    // Status mapping for better display
    const orderStatusMap = {
        PENDING: 'در انتظار',
        SHIPPED: 'ارسال شده',
        CANCELED: 'لغو شده'
    };

    // Initial load
    showPage('dashboard');
});