document.addEventListener('DOMContentLoaded', () => {
    // اتصال به سرور Socket.io
    // مطمئن شوید که آدرس IP یا نام دامنه سرور بک‌اند شما اینجاست.
    // مثال: 'http://your-backend-ip:3000'
    const socket = io('http://localhost:3000'); 

    // گرفتن المان‌های DOM
    const projectListEl = document.getElementById('project-list');
    const projectTitleEl = document.getElementById('current-project-title');
    const tasksContainer = document.getElementById('tasks-container'); // این المان در HTML موجود است اما مستقیماً استفاده نمی‌شود.
    const taskListEl = document.getElementById('task-list');
    const chatBoxEl = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const chatForm = document.getElementById('chat-form');
    const taskFilterInput = document.getElementById('task-filter');
    const addProjectBtn = document.getElementById('add-project-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const dashboardPanel = document.getElementById('dashboard-panel');
    const taskModal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const modalCloseBtn = document.querySelector('.modal .close-btn');

    let activeProjectId = null; // نگهداری شناسه پروژه فعال
    let projectsData = []; // ذخیره لیست پروژه‌ها
    let tasksData = []; // ذخیره لیست وظایف پروژه فعال

    // --- مدیریت پروژه‌ها ---
    addProjectBtn.addEventListener('click', () => {
        const newProjectName = prompt('نام پروژه جدید را وارد کنید:');
        if (newProjectName) {
            // API Call: افزودن پروژه جدید
            // Endpoint: /api/worknest/projects
            // Method: POST
            // Request Body (JSON):
            // {
            //   "name": "نام پروژه جدید"
            // }
            // Expected Response (JSON): پروژه جدید اضافه شده (شامل id، name و ...)
            fetch('http://localhost:3000/api/worknest/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName })
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(() => loadProjects()) // پس از افزودن موفقیت‌آمیز، لیست پروژه‌ها را مجدداً بارگذاری کن
            .catch(error => console.error('Error adding project:', error));
        }
    });

    function loadProjects() {
        // API Call: دریافت لیست تمام پروژه‌ها
        // Endpoint: /api/worknest/projects
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "id": "proj1", "name": "پروژه A" },
        //   { "id": "proj2", "name": "پروژه B" }
        // ]
        fetch('http://localhost:3000/api/worknest/projects')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(projects => {
                projectsData = projects;
                projectListEl.innerHTML = '';
                projects.forEach(project => {
                    const li = document.createElement('li');
                    li.textContent = project.name;
                    li.dataset.projectId = project.id; // ذخیره id پروژه در dataset
                    li.onclick = () => selectProject(project.id, project.name); // انتخاب پروژه با کلیک
                    projectListEl.appendChild(li);
                });
            })
            .catch(error => console.error('Error loading projects:', error));
    }

    function selectProject(projectId, projectName) {
        // حذف کلاس active از پروژه قبلی
        if (activeProjectId) {
            const prevActive = document.querySelector(`li[data-project-id="${activeProjectId}"]`);
            if (prevActive) {
                prevActive.classList.remove('active');
            }
        }
        activeProjectId = projectId;
        // اضافه کردن کلاس active به پروژه جدید
        const currentActive = document.querySelector(`li[data-project-id="${projectId}"]`);
        if (currentActive) {
            currentActive.classList.add('active');
        }
        
        projectTitleEl.textContent = projectName;
        addTaskBtn.style.display = 'block'; // نمایش دکمه افزودن وظیفه
        dashboardPanel.style.display = 'block'; // نمایش پنل داشبورد
        
        loadTasks(projectId); // بارگذاری وظایف پروژه انتخاب شده
        loadChatMessages(projectId); // بارگذاری پیام‌های چت پروژه انتخاب شده
        
        // Socket.io Emit: اطلاع به سرور که کاربر به چت یک پروژه خاص پیوست.
        // این می‌تواند برای مدیریت کاربران آنلاین در هر پروژه استفاده شود.
        // Event Name: 'join project'
        // Data (JSON):
        // {
        //   "projectId": "شناسه پروژه",
        //   "userId": "شناسه کاربر فعلی" // اگر سیستم احراز هویت دارید
        // }
        // socket.emit('join project', { projectId: activeProjectId, userId: 'some-user-id' }); 
        
        // نمایش دکمه‌های ویرایش و حذف پروژه
        document.getElementById('project-actions').style.display = 'flex'; 
    }

    // --- مدیریت وظایف ---
    addTaskBtn.addEventListener('click', () => {
        taskModal.style.display = 'flex'; // نمایش مودال افزودن/ویرایش وظیفه
        document.getElementById('modal-title').textContent = 'افزودن وظیفه جدید';
        taskForm.reset(); // پاک کردن فرم
        taskForm.dataset.taskId = ''; // مطمئن شوید که taskId برای افزودن خالی است
    });

    modalCloseBtn.addEventListener('click', () => {
        taskModal.style.display = 'none'; // بستن مودال
    });

    // بستن مودال با کلیک در خارج از آن
    window.addEventListener('click', (event) => {
        if (event.target === taskModal) {
            taskModal.style.display = 'none';
        }
    });

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskId = taskForm.dataset.taskId; // بررسی می‌کنیم که در حال ویرایش هستیم یا افزودن
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            deadline: document.getElementById('task-deadline').value,
            tag: document.getElementById('task-tag').value,
            status: document.getElementById('task-status').value,
            // فایل ضمیمه: برای مدیریت فایل‌ها نیاز به FormData و یک Endpoint جداگانه در بک‌اند است.
            // در حال حاضر فقط اطلاعات متنی ارسال می‌شود.
        };

        if (taskId) {
            // API Call: ویرایش وظیفه موجود
            // Endpoint: /api/worknest/projects/:projectId/tasks/:taskId
            // Method: PUT
            // Request Body (JSON):
            // {
            //   "title": "عنوان جدید",
            //   "description": "توضیحات جدید",
            //   "deadline": "تاریخ جدید",
            //   "tag": "تگ جدید",
            //   "status": "وضعیت جدید"
            // }
            // Expected Response (JSON): وظیفه به‌روز شده
            fetch(`http://localhost:3000/api/worknest/projects/${activeProjectId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(() => {
                taskModal.style.display = 'none';
                loadTasks(activeProjectId); // بارگذاری مجدد وظایف
            })
            .catch(error => console.error('Error updating task:', error));
        } else {
            // API Call: افزودن وظیفه جدید
            // Endpoint: /api/worknest/projects/:projectId/tasks
            // Method: POST
            // Request Body (JSON):
            // {
            //   "title": "عنوان وظیفه",
            //   "description": "توضیحات",
            //   "deadline": "تاریخ",
            //   "tag": "تگ",
            //   "status": "pending"
            // }
            // Expected Response (JSON): وظیفه جدید اضافه شده (شامل id، title و ...)
            fetch(`http://localhost:3000/api/worknest/projects/${activeProjectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(() => {
                taskModal.style.display = 'none';
                loadTasks(activeProjectId); // بارگذاری مجدد وظایف
            })
            .catch(error => console.error('Error adding task:', error));
        }
    });

    function loadTasks(projectId) {
        // API Call: دریافت لیست وظایف یک پروژه خاص
        // Endpoint: /api/worknest/projects/:projectId/tasks
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "id": "task1", "title": "وظیفه اول", "description": "...", "deadline": "2025-12-31", "tag": "فوریت", "status": "in-progress" },
        //   { "id": "task2", "title": "وظیفه دوم", "description": "...", "deadline": "2025-11-15", "tag": "طراحی", "status": "completed" }
        // ]
        fetch(`http://localhost:3000/api/worknest/projects/${projectId}/tasks`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(tasks => {
                tasksData = tasks; // ذخیره وظایف بارگذاری شده
                renderTasks(tasks); // نمایش وظایف
                updateDashboard(tasks); // به‌روزرسانی داشبورد
            })
            .catch(error => console.error('Error loading tasks:', error));
    }

    function renderTasks(tasksToRender) {
        taskListEl.innerHTML = '';
        if (tasksToRender.length === 0) {
            taskListEl.innerHTML = '<p class="text-light">هیچ وظیفه‌ای برای این پروژه وجود ندارد.</p>';
            return;
        }
        tasksToRender.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.classList.add('task-card', `status-${task.status}`);
            taskDiv.dataset.taskId = task.id;
            taskDiv.innerHTML = `
                <h4>${task.title}</h4>
                <p>توضیحات: ${task.description || 'بدون توضیحات'}</p>
                <div class="task-meta">
                    <span>ددلاین: ${task.deadline || 'تعریف نشده'}</span>
                    <span>تگ: ${task.tag || 'ندارد'}</span>
                    <span>وضعیت: ${getStatusText(task.status)}</span>
                </div>
                <div class="task-actions-btns">
                    <button class="edit-task-btn" data-id="${task.id}" title="ویرایش وظیفه">✏️</button>
                    <button class="delete-task-btn" data-id="${task.id}" title="حذف وظیفه">❌</button>
                </div>
            `;
            taskListEl.appendChild(taskDiv);
        });
        attachTaskActionListeners(); // اضافه کردن Listenerها به دکمه‌های ویرایش و حذف
    }

    function attachTaskActionListeners() {
        // Listener برای دکمه‌های ویرایش وظیفه
        document.querySelectorAll('.edit-task-btn').forEach(button => {
            button.onclick = (e) => {
                const taskId = e.currentTarget.dataset.id;
                const task = tasksData.find(t => t.id === taskId);
                if (task) {
                    document.getElementById('modal-title').textContent = 'ویرایش وظیفه';
                    document.getElementById('task-title').value = task.title;
                    document.getElementById('task-description').value = task.description;
                    document.getElementById('task-deadline').value = task.deadline;
                    document.getElementById('task-tag').value = task.tag;
                    document.getElementById('task-status').value = task.status;
                    taskForm.dataset.taskId = taskId; // ذخیره id وظیفه برای ویرایش
                    taskModal.style.display = 'flex';
                }
            };
        });

        // Listener برای دکمه‌های حذف وظیفه
        document.querySelectorAll('.delete-task-btn').forEach(button => {
            button.onclick = (e) => {
                const taskId = e.currentTarget.dataset.id;
                if (confirm('آیا از حذف این وظیفه مطمئن هستید؟')) { // TODO: از مودال سفارشی استفاده شود
                    // API Call: حذف وظیفه
                    // Endpoint: /api/worknest/projects/:projectId/tasks/:taskId
                    // Method: DELETE
                    // Expected Response: وضعیت 204 No Content یا یک پیام موفقیت
                    fetch(`http://localhost:3000/api/worknest/projects/${activeProjectId}/tasks/${taskId}`, {
                        method: 'DELETE'
                    })
                    .then(res => {
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        // اگر بک‌اند 204 برمی‌گرداند نیازی به res.json() نیست
                        if (res.status !== 204) {
                            return res.json();
                        }
                    })
                    .then(() => loadTasks(activeProjectId)) // بارگذاری مجدد وظایف
                    .catch(error => console.error('Error deleting task:', error));
                }
            };
        });
    }

    // فیلتر و جستجوی وظایف
    taskFilterInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTasks = tasksData.filter(task => 
            (task.title && task.title.toLowerCase().includes(searchTerm)) || 
            (task.description && task.description.toLowerCase().includes(searchTerm)) ||
            (task.tag && task.tag.toLowerCase().includes(searchTerm))
        );
        renderTasks(filteredTasks);
    });

    function getStatusText(status) {
        switch (status) {
            case 'pending': return 'در انتظار';
            case 'in-progress': return 'در حال انجام';
            case 'completed': return 'تکمیل شده';
            default: return status;
        }
    }

    // --- مدیریت چت (با Socket.io) ---
    function loadChatMessages(projectId) {
        chatBoxEl.innerHTML = '';
        // API Call: دریافت تاریخچه پیام‌های چت یک پروژه
        // Endpoint: /api/worknest/projects/:projectId/chat
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "user": "علی", "text": "سلام تیم!", "timestamp": "2025-08-12T10:00:00Z" },
        //   { "user": "زهرا", "text": "سلام علی، پروژه چطور پیش میره؟", "timestamp": "2025-08-12T10:05:00Z" }
        // ]
        fetch(`http://localhost:3000/api/worknest/projects/${projectId}/chat`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(messages => {
                messages.forEach(msg => {
                    const item = document.createElement('div');
                    item.textContent = `${msg.user}: ${msg.text}`;
                    chatBoxEl.appendChild(item);
                });
                chatBoxEl.scrollTop = chatBoxEl.scrollHeight; // اسکرول به پایین
            })
            .catch(error => console.error('Error loading chat messages:', error));
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (messageInput.value.trim() && activeProjectId) {
            // این "نام کاربر" باید از سیستم احراز هویت بک‌اند تامین شود
            // فعلاً به صورت دستی یک نام را قرار می‌دهیم.
            const currentUser = 'کاربر فعلی'; 
            const message = {
                projectId: activeProjectId,
                text: messageInput.value.trim(),
                user: currentUser
            };
            
            // Socket.io Emit: ارسال پیام چت جدید
            // Event Name: 'chat message'
            // Data (JSON):
            // {
            //   "projectId": "شناسه پروژه فعال",
            //   "text": "متن پیام",
            //   "user": "نام کاربر فرستنده"
            // }
            socket.emit('chat message', message);
            messageInput.value = ''; // پاک کردن ورودی
        }
    });

    // Socket.io On: دریافت پیام چت جدید از سرور
    // Event Name: 'chat message'
    // Data (JSON):
    // {
    //   "projectId": "شناسه پروژه ای که پیام برای آن ارسال شده",
    //   "text": "متن پیام",
    //   "user": "نام کاربر فرستنده"
    // }
    socket.on('chat message', (msg) => {
        if (msg.projectId === activeProjectId) {
            const item = document.createElement('div');
            item.textContent = `${msg.user}: ${msg.text}`;
            chatBoxEl.appendChild(item);
            chatBoxEl.scrollTop = chatBoxEl.scrollHeight; // اسکرول به پایین
        }
    });

    // --- داشبورد آماری ---
    function updateDashboard(tasks) {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
        const pendingTasks = tasks.filter(task => task.status === 'pending').length;
        const progressPercent = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : 0;

        document.getElementById('completed-tasks-count').textContent = completedTasks;
        document.getElementById('in-progress-tasks-count').textContent = inProgressTasks;
        document.getElementById('pending-tasks-count').textContent = pendingTasks;
        document.getElementById('progress-percent').textContent = `${progressPercent}%`;
    }

    // --- مدیریت حذف و ویرایش پروژه (از طریق دکمه‌های اضافه شده در HTML) ---
    const editProjectBtn = document.getElementById('edit-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');

    editProjectBtn.addEventListener('click', () => {
        if (activeProjectId) {
            const currentProject = projectsData.find(p => p.id === activeProjectId);
            if (currentProject) {
                const updatedProjectName = prompt('نام جدید پروژه را وارد کنید:', currentProject.name);
                if (updatedProjectName && updatedProjectName !== currentProject.name) {
                    // API Call: ویرایش نام پروژه
                    // Endpoint: /api/worknest/projects/:projectId
                    // Method: PUT
                    // Request Body (JSON):
                    // {
                    //   "name": "نام جدید پروژه"
                    // }
                    // Expected Response (JSON): پروژه به‌روز شده
                    fetch(`http://localhost:3000/api/worknest/projects/${activeProjectId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: updatedProjectName })
                    })
                    .then(res => {
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        return res.json();
                    })
                    .then(() => loadProjects()) // بارگذاری مجدد پروژه‌ها
                    .catch(error => console.error('Error updating project:', error));
                }
            }
        }
    });

    deleteProjectBtn.addEventListener('click', () => {
        if (activeProjectId && confirm('آیا از حذف این پروژه و تمام وظایف آن مطمئن هستید؟ این عملیات قابل بازگشت نیست!')) { // TODO: از مودال سفارشی استفاده شود
            // API Call: حذف پروژه
            // Endpoint: /api/worknest/projects/:projectId
            // Method: DELETE
            // Expected Response: وضعیت 204 No Content یا یک پیام موفقیت
            fetch(`http://localhost:3000/api/worknest/projects/${activeProjectId}`, {
                method: 'DELETE'
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                // اگر بک‌اند 204 برمی‌گرداند نیازی به res.json() نیست
                if (res.status !== 204) {
                    return res.json();
                }
            })
            .then(() => {
                activeProjectId = null; // پاک کردن پروژه فعال
                projectTitleEl.textContent = 'پروژه را انتخاب کنید'; // ریست عنوان
                taskListEl.innerHTML = ''; // پاک کردن لیست وظایف
                chatBoxEl.innerHTML = ''; // پاک کردن چت
                addTaskBtn.style.display = 'none'; // مخفی کردن دکمه افزودن وظیفه
                dashboardPanel.style.display = 'none'; // مخفی کردن داشبورد
                document.getElementById('project-actions').style.display = 'none'; // مخفی کردن دکمه‌های مدیریت پروژه
                loadProjects(); // بارگذاری مجدد پروژه‌ها
            })
            .catch(error => console.error('Error deleting project:', error));
        }
    });


    // بارگذاری اولیه پروژه‌ها هنگام لود شدن صفحه
    loadProjects();
});
