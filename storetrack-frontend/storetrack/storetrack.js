document.addEventListener('DOMContentLoaded', () => {
    // --- المان‌های DOM ---
    const addProductForm = document.getElementById('add-product-form');
    const addOrderForm = document.getElementById('add-order-form');
    const productListEl = document.getElementById('product-list');
    const orderListEl = document.getElementById('order-list');
    const productFilterInput = document.getElementById('product-filter');
    const orderFilterInput = document.getElementById('order-filter');
    const showLowStockBtn = document.getElementById('show-low-stock');
    const historyModal = document.getElementById('history-modal');
    const modalCloseBtn = document.querySelector('#history-modal .close-btn');
    const historyProductNameEl = document.getElementById('history-product-name');
    const historyListEl = document.getElementById('history-list');

    // --- متغیرهای داخلی ---
    let allProducts = [];
    let allOrders = [];

    // --- مدیریت کالاها ---
    function loadProducts() {
        // API Call: دریافت لیست تمام کالاها
        // Endpoint: /api/storetrack/products
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "id": "p1", "name": "کتاب", "price": 50000, "quantity": 100, "category": "نوشت‌افزار" },
        //   { "id": "p2", "name": "خودکار", "price": 10000, "quantity": 5, "category": "نوشت‌افزار" }
        // ]
        fetch('http://localhost:3000/api/storetrack/products')
            .then(res => res.json())
            .then(products => {
                allProducts = products;
                renderProducts(products);
            })
            .catch(error => console.error('Error loading products:', error));
    }

    function renderProducts(productsToRender) {
        productListEl.innerHTML = '';
        productsToRender.forEach(p => {
            const div = document.createElement('div');
            // چک کردن موجودی کم برای تغییر استایل
            if (p.quantity < 10) { // حد آستانه موجودی کم
                div.classList.add('product-card', 'low-stock');
                // ویژگی اختیاری: ارسال هشدار به بک‌اند
                // API Call: ارسال هشدار موجودی کم (اگر لازم باشد)
                // Endpoint: /api/storetrack/notifications/low-stock
                // Method: POST
                // Request Body (JSON): { "productId": "p2", "quantity": 5 }
                // Expected Response: وضعیت 200 OK
                // fetch('...', { method: 'POST', body: JSON.stringify({ productId: p.id, quantity: p.quantity }) });
            } else {
                div.classList.add('product-card');
            }
            div.dataset.productId = p.id;
            div.innerHTML = `
                <h4>${p.name}</h4>
                <p>قیمت: ${p.price} تومان</p>
                <p>موجودی: ${p.quantity}</p>
                <p>دسته بندی: ${p.category || 'ندارد'}</p>
            `;
            // Listener برای نمایش تاریخچه با کلیک روی کارت
            div.addEventListener('click', () => showProductHistory(p.id, p.name));
            productListEl.appendChild(div);
        });
    }

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const product = {
            name: document.getElementById('product-name').value,
            price: parseInt(document.getElementById('product-price').value),
            quantity: parseInt(document.getElementById('product-quantity').value),
            category: document.getElementById('product-category').value
        };

        // API Call: افزودن کالا جدید
        // Endpoint: /api/storetrack/products
        // Method: POST
        // Request Body (JSON): { "name": "...", "price": 100, "quantity": 50, "category": "..." }
        // Expected Response (JSON): کالا اضافه شده { id: "...", ... }
        try {
            await fetch('http://localhost:3000/api/storetrack/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            loadProducts();
            addProductForm.reset();
        } catch (error) {
            console.error('Error adding product:', error);
            alert('خطا در افزودن کالا.');
        }
    });

    // فیلتر و جستجوی کالا
    productFilterInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = allProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm)
        );
        renderProducts(filteredProducts);
    });

    // نمایش کالاهای با موجودی کم
    showLowStockBtn.addEventListener('click', () => {
        const lowStockProducts = allProducts.filter(p => p.quantity < 10);
        renderProducts(lowStockProducts);
    });

    // --- مدیریت سفارشات ---
    function loadOrders() {
        // API Call: دریافت لیست تمام سفارشات
        // Endpoint: /api/storetrack/orders
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "id": "o1", "customerName": "علی", "productId": "p1", "quantity": 2, "status": "pending", "date": "2025-08-12" },
        //   { "id": "o2", "customerName": "زهرا", "productId": "p2", "quantity": 1, "status": "sent", "date": "2025-08-11" }
        // ]
        fetch('http://localhost:3000/api/storetrack/orders')
            .then(res => res.json())
            .then(orders => {
                allOrders = orders;
                renderOrders(orders);
            })
            .catch(error => console.error('Error loading orders:', error));
    }
    
    function renderOrders(ordersToRender) {
        orderListEl.innerHTML = '';
        ordersToRender.forEach(o => {
            const div = document.createElement('div');
            div.classList.add('order-card', `status-${o.status}`);
            div.dataset.orderId = o.id;
            div.innerHTML = `
                <h4>سفارش #${o.id.substring(0, 5)}</h4>
                <p>مشتری: ${o.customerName}</p>
                <p>شناسه کالا: ${o.productId}</p>
                <p>تعداد: ${o.quantity}</p>
                <span class="order-status">${getStatusText(o.status)}</span>
                <div class="order-actions">
                    <button class="main-btn primary-btn" onclick="updateOrderStatus('${o.id}', 'sent')">ارسال شد</button>
                    <button class="main-btn secondary-btn" onclick="updateOrderStatus('${o.id}', 'canceled')">لغو شد</button>
                </div>
            `;
            orderListEl.appendChild(div);
        });
    }

    addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const order = {
            customerName: document.getElementById('customer-name').value,
            productId: document.getElementById('ordered-product-id').value,
            quantity: parseInt(document.getElementById('ordered-quantity').value)
        };

        // API Call: ثبت سفارش جدید
        // Endpoint: /api/storetrack/orders
        // Method: POST
        // Request Body (JSON): { "customerName": "...", "productId": "p1", "quantity": 2 }
        // Expected Response: وضعیت 200 OK و اطلاعات سفارش جدید
        // **نکته مهم برای بک‌اند**: پس از ثبت سفارش، موجودی کالای مربوطه باید به صورت خودکار کم شود.
        try {
            await fetch('http://localhost:3000/api/storetrack/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });
            loadProducts(); // به‌روزرسانی لیست کالاها به خاطر کاهش موجودی
            loadOrders();
            addOrderForm.reset();
        } catch (error) {
            console.error('Error adding order:', error);
            alert('خطا در ثبت سفارش. لطفاً مطمئن شوید شناسه کالا و موجودی صحیح است.');
        }
    });

    // تابع سراسری برای به‌روزرسانی وضعیت سفارش
    window.updateOrderStatus = async (orderId, newStatus) => {
        // API Call: به‌روزرسانی وضعیت سفارش
        // Endpoint: /api/storetrack/orders/:orderId/status
        // Method: PUT
        // Request Body (JSON): { "status": "sent" }
        // Expected Response: وضعیت 200 OK و سفارش به‌روز شده
        try {
            await fetch(`http://localhost:3000/api/storetrack/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            loadOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('خطا در به‌روزرسانی وضعیت سفارش.');
        }
    };

    function getStatusText(status) {
        switch (status) {
            case 'pending': return 'در انتظار';
            case 'sent': return 'ارسال شد';
            case 'canceled': return 'لغو شد';
            default: return status;
        }
    }

    // فیلتر و جستجوی سفارشات
    orderFilterInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredOrders = allOrders.filter(o =>
            o.customerName.toLowerCase().includes(searchTerm) ||
            o.productId.toLowerCase().includes(searchTerm) ||
            o.status.toLowerCase().includes(searchTerm)
        );
        renderOrders(filteredOrders);
    });

    // --- تاریخچه کالا ---
    async function showProductHistory(productId, productName) {
        historyProductNameEl.textContent = `تاریخچه: ${productName}`;
        historyListEl.innerHTML = 'در حال بارگذاری...';
        historyModal.style.display = 'flex';

        // API Call: دریافت تاریخچه ورود/خروج یک کالا
        // Endpoint: /api/storetrack/products/:productId/history
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "type": "entry", "quantity": 50, "date": "2025-08-10" },
        //   { "type": "exit", "quantity": 2, "date": "2025-08-12", "orderId": "o1" }
        // ]
        try {
            const res = await fetch(`http://localhost:3000/api/storetrack/products/${productId}/history`);
            if (!res.ok) throw new Error('Failed to fetch history');
            const history = await res.json();
            
            historyListEl.innerHTML = '';
            if (history.length === 0) {
                historyListEl.innerHTML = '<p>هیچ ورودی/خروجی برای این کالا ثبت نشده است.</p>';
                return;
            }

            history.forEach(item => {
                const div = document.createElement('div');
                div.classList.add('history-item');
                const typeText = item.type === 'entry' ? 'ورود' : 'خروج';
                div.innerHTML = `
                    <p>نوع: <strong>${typeText}</strong></p>
                    <p>تعداد: ${item.quantity}</p>
                    <p>تاریخ: ${new Date(item.date).toLocaleDateString('fa-IR')}</p>
                `;
                historyListEl.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading product history:', error);
            historyListEl.innerHTML = '<p>خطا در بارگذاری تاریخچه.</p>';
        }
    }

    modalCloseBtn.addEventListener('click', () => {
        historyModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === historyModal) {
            historyModal.style.display = 'none';
        }
    });

    // --- بارگذاری اولیه ---
    loadProducts();
    loadOrders();
});