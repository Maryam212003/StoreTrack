document.addEventListener('DOMContentLoaded', () => {
    // --- المان‌های DOM ---
    const createMeetingForm = document.getElementById('create-meeting-form');
    const upcomingMeetingsList = document.getElementById('upcoming-meetings-list');
    const archivedMeetingsList = document.getElementById('archived-meetings-list');
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthYearEl = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const meetingDetailsModal = document.getElementById('meeting-details-modal');
    const modalCloseBtn = document.querySelector('#meeting-details-modal .close-btn');
    const modalMeetingTitle = document.getElementById('modal-meeting-title');
    const modalMeetingTime = document.getElementById('modal-meeting-time');
    const modalMeetingDuration = document.getElementById('modal-meeting-duration');
    const modalMeetingDescription = document.getElementById('modal-meeting-description');
    const modalInviteeList = document.getElementById('modal-invitee-list');
    const rsvpAcceptBtn = document.getElementById('rsvp-accept-btn');
    const rsvpDeclineBtn = document.getElementById('rsvp-decline-btn');
    const archiveMeetingBtn = document.getElementById('archive-meeting-btn');
    const deleteMeetingBtn = document.getElementById('delete-meeting-btn');


    // --- متغیرهای داخلی تقویم ---
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let allMeetings = []; // ذخیره تمامی جلسات برای رندر تقویم و لیست‌ها
    let selectedMeetingId = null; // برای نگهداری شناسه جلسه انتخاب شده در مودال

    // --- توابع کمکی ---
    function formatDateTime(isoString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
        return new Date(isoString).toLocaleDateString('fa-IR', options);
    }

    // --- مدیریت تقویم ---
    function renderCalendar() {
        calendarGrid.innerHTML = `
            <div class="day-name">ش</div><div class="day-name">ی</div><div class="day-name">د</div><div class="day-name">س</div><div class="day-name">چ</div><div class="day-name">پ</div><div class="day-name">ج</div>
        `; // Reset and add day names

        currentMonthYearEl.textContent = new Date(currentYear, currentMonth).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' });

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 for Sunday, 6 for Saturday
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Fill empty days at the beginning of the month (adjust for RTL/Shamsi calendar)
        // Assuming your calendar starts from Saturday (شنبه)
        const startDayIndex = (firstDayOfMonth + 1) % 7; // Convert JS Sunday=0 to Persian Saturday=0
        for (let i = 0; i < startDayIndex; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('calendar-day', 'empty');
            calendarGrid.appendChild(emptyDiv);
        }

        // Fill days with numbers and meeting indicators
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day');
            dayDiv.dataset.day = day;
            dayDiv.dataset.month = currentMonth + 1;
            dayDiv.dataset.year = currentYear;
            dayDiv.innerHTML = `<span class="day-number">${day}</span>`;

            // Check for meetings on this day
            const meetingsOnThisDay = allMeetings.filter(m => {
                const meetingDate = new Date(m.time);
                return meetingDate.getDate() === day &&
                       meetingDate.getMonth() === currentMonth &&
                       meetingDate.getFullYear() === currentYear &&
                       m.status !== 'archived'; // نمایش فقط جلسات فعال
            });

            if (meetingsOnThisDay.length > 0) {
                const indicator = document.createElement('div');
                indicator.classList.add('meeting-indicator');
                dayDiv.appendChild(indicator);
                // Attach click listener to show meeting details for this day
                dayDiv.addEventListener('click', () => showMeetingsForDay(meetingsOnThisDay));
            }
            
            calendarGrid.appendChild(dayDiv);
        }
    }

    function showMeetingsForDay(meetings) {
        // This function could open a list of meetings for that day,
        // For simplicity, for now, we'll just open the first meeting's details.
        if (meetings.length > 0) {
            showMeetingDetails(meetings[0].id);
        }
    }

    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        loadMeetings(); // Reload meetings for the new month
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        loadMeetings(); // Reload meetings for the new month
    });

    // --- مدیریت جلسات ---
    function loadMeetings() {
        // API Call: دریافت تمامی جلسات (شامل آینده و آرشیو شده)
        // Endpoint: /api/syncmeet/meetings
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "id": "m1", "title": "جلسه تیم", "time": "2025-08-15T14:00:00Z", "duration": 60, "description": "...", "invitees": [{"email": "user1@example.com", "status": "pending"}], "creator": "current_user", "status": "upcoming" },
        //   { "id": "m2", "title": "بررسی پروژه", "time": "2025-07-20T10:00:00Z", "duration": 90, "description": "...", "invitees": [], "creator": "current_user", "status": "archived" }
        // ]
        fetch('http://localhost:3000/api/syncmeet/meetings')
            .then(res => res.json())
            .then(meetings => {
                allMeetings = meetings; // ذخیره همه جلسات
                renderCalendar(); // رندر تقویم با داده‌های جدید

                // فیلتر و نمایش جلسات آینده
                const upcoming = meetings.filter(m => new Date(m.time) > new Date() && m.status !== 'archived');
                renderMeetingList(upcoming, upcomingMeetingsList);

                // فیلتر و نمایش جلسات آرشیو شده
                const archived = meetings.filter(m => m.status === 'archived');
                renderMeetingList(archived, archivedMeetingsList);
            })
            .catch(error => console.error('Error loading meetings:', error));
    }

    function renderMeetingList(meetings, containerEl) {
        containerEl.innerHTML = '';
        if (meetings.length === 0) {
            containerEl.innerHTML = '<p class="text-light">هیچ جلسه‌ای یافت نشد.</p>';
            return;
        }
        meetings.forEach(m => {
            const div = document.createElement('div');
            div.classList.add('meeting-card');
            div.dataset.meetingId = m.id;
            let rsvpStatusClass = '';
            // فرض می‌کنیم کاربر فعلی "کاربر تست" است. این باید از سیستم احراز هویت گرفته شود.
            const currentUserEmail = 'user@example.com'; // TODO: Get current user's email
            const currentUserInvitee = m.invitees ? m.invitees.find(inv => inv.email === currentUserEmail) : null;

            if (currentUserInvitee) {
                if (currentUserInvitee.status === 'accepted') rsvpStatusClass = 'rsvp-accepted';
                else if (currentUserInvitee.status === 'declined') rsvpStatusClass = 'rsvp-declined';
                else rsvpStatusClass = 'rsvp-pending';
            } else {
                rsvpStatusClass = 'rsvp-pending'; // اگر دعوت نشده یا وضعیت نامعلوم
            }

            div.innerHTML = `
                <h4>${m.title}</h4>
                <p>زمان: ${formatDateTime(m.time)}</p>
                <p>مدت زمان: ${m.duration} دقیقه</p>
                <span class="rsvp-status ${rsvpStatusClass}">${getStatusText(currentUserInvitee ? currentUserInvitee.status : 'pending')}</span>
            `;
            div.addEventListener('click', () => showMeetingDetails(m.id));
            containerEl.appendChild(div);
        });
    }

    function getStatusText(status) {
        switch (status) {
            case 'accepted': return 'پذیرفته شد';
            case 'declined': return 'رد شد';
            case 'pending': return 'در انتظار پاسخ';
            default: return status;
        }
    }

    createMeetingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inviteeEmails = document.getElementById('meeting-invitees').value
                                .split(',').map(email => email.trim()).filter(email => email.length > 0);

        const meeting = {
            title: document.getElementById('meeting-title').value,
            time: document.getElementById('meeting-time').value,
            duration: parseInt(document.getElementById('meeting-duration').value),
            description: document.getElementById('meeting-description').value,
            invitees: inviteeEmails.map(email => ({ email: email, status: 'pending' })) // وضعیت اولیه همه دعوت‌شدگان pending
        };

        // API Call: ایجاد جلسه جدید
        // Endpoint: /api/syncmeet/meetings
        // Method: POST
        // Request Body (JSON):
        // {
        //   "title": "عنوان",
        //   "time": "ISO Date String",
        //   "duration": 60,
        //   "description": "توضیحات",
        //   "invitees": [{"email": "a@example.com", "status": "pending"}],
        //   "creator": "user_id_of_creator" // بک‌اند باید آن را از نشست کاربر دریافت کند
        // }
        // Expected Response (JSON): جلسه ایجاد شده (شامل id)
        try {
            await fetch('http://localhost:3000/api/syncmeet/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(meeting)
            });
            alert('جلسه با موفقیت ذخیره شد.');
            loadMeetings(); // بارگذاری مجدد جلسات برای به‌روزرسانی تقویم و لیست‌ها
            createMeetingForm.reset();
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('خطا در ذخیره جلسه.');
        }
    });

    // --- مدیریت مودال جزئیات جلسه ---
    async function showMeetingDetails(meetingId) {
        selectedMeetingId = meetingId;
        // API Call: دریافت جزئیات یک جلسه خاص
        // Endpoint: /api/syncmeet/meetings/:meetingId
        // Method: GET
        // Expected Response (JSON): { "id": "...", "title": "...", "time": "...", "invitees": [...] }
        try {
            const res = await fetch(`http://localhost:3000/api/syncmeet/meetings/${meetingId}`);
            if (!res.ok) throw new Error('Failed to fetch meeting details');
            const meeting = await res.json();

            modalMeetingTitle.textContent = meeting.title;
            modalMeetingTime.textContent = formatDateTime(meeting.time);
            modalMeetingDuration.textContent = meeting.duration;
            modalMeetingDescription.textContent = meeting.description || 'بدون توضیحات';
            
            modalInviteeList.innerHTML = '';
            if (meeting.invitees && meeting.invitees.length > 0) {
                meeting.invitees.forEach(invitee => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${invitee.email}</span>
                        <span class="status-dot ${invitee.status}"></span>
                        <span>${getStatusText(invitee.status)}</span>
                    `;
                    modalInviteeList.appendChild(li);
                });
            } else {
                modalInviteeList.innerHTML = '<li>هیچ شرکت‌کننده‌ای دعوت نشده است.</li>';
            }

            // نمایش/مخفی کردن دکمه‌های RSVP بر اساس وضعیت جلسه
            if (new Date(meeting.time) > new Date()) { // اگر جلسه هنوز برگزار نشده
                rsvpAcceptBtn.style.display = 'inline-block';
                rsvpDeclineBtn.style.display = 'inline-block';
            } else {
                rsvpAcceptBtn.style.display = 'none';
                rsvpDeclineBtn.style.display = 'none';
            }

            // مدیریت دکمه آرشیو / حذف
            archiveMeetingBtn.style.display = meeting.status !== 'archived' ? 'inline-block' : 'none';
            deleteMeetingBtn.style.display = 'inline-block'; // همیشه برای حذف نمایش داده شود

            meetingDetailsModal.style.display = 'flex';
        } catch (error) {
            console.error('Error loading meeting details:', error);
            alert('خطا در بارگذاری جزئیات جلسه.');
        }
    }

    modalCloseBtn.addEventListener('click', () => {
        meetingDetailsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === meetingDetailsModal) {
            meetingDetailsModal.style.display = 'none';
        }
    });

    // --- مدیریت RSVP ---
    // فرض می‌کنیم userId/email کاربر فعلی را از سیستم احراز هویت بک‌اند می‌گیریم.
    // در اینجا یک مقدار ثابت برای نمونه استفاده می‌شود.
    const currentLoggedInUserEmail = 'user@example.com'; // TODO: Replace with actual logged-in user's email

    rsvpAcceptBtn.addEventListener('click', async () => {
        if (!selectedMeetingId) return;
        // API Call: به‌روزرسانی وضعیت RSVP
        // Endpoint: /api/syncmeet/meetings/:meetingId/rsvp
        // Method: PUT
        // Request Body (JSON): { "email": "user@example.com", "status": "accepted" }
        // Expected Response: وضعیت 200 OK
        try {
            await fetch(`http://localhost:3000/api/syncmeet/meetings/${selectedMeetingId}/rsvp`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentLoggedInUserEmail, status: 'accepted' })
            });
            alert('وضعیت شرکت شما پذیرفته شد.');
            meetingDetailsModal.style.display = 'none';
            loadMeetings(); // به‌روزرسانی لیست‌ها و تقویم
        } catch (error) {
            console.error('Error updating RSVP:', error);
            alert('خطا در به‌روزرسانی وضعیت RSVP.');
        }
    });

    rsvpDeclineBtn.addEventListener('click', async () => {
        if (!selectedMeetingId) return;
        // API Call: به‌روزرسانی وضعیت RSVP
        // Endpoint: /api/syncmeet/meetings/:meetingId/rsvp
        // Method: PUT
        // Request Body (JSON): { "email": "user@example.com", "status": "declined" }
        // Expected Response: وضعیت 200 OK
        try {
            await fetch(`http://localhost:3000/api/syncmeet/meetings/${selectedMeetingId}/rsvp`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentLoggedInUserEmail, status: 'declined' })
            });
            alert('وضعیت شرکت شما رد شد.');
            meetingDetailsModal.style.display = 'none';
            loadMeetings(); // به‌روزرسانی لیست‌ها و تقویم
        } catch (error) {
            console.error('Error updating RSVP:', error);
            alert('خطا در به‌روزرسانی وضعیت RSVP.');
        }
    });

    // --- آرشیو و حذف جلسه ---
    archiveMeetingBtn.addEventListener('click', async () => {
        if (!selectedMeetingId) return;
        if (confirm('آیا از آرشیو کردن این جلسه مطمئن هستید؟')) { // TODO: از مودال سفارشی استفاده شود
            // API Call: آرشیو کردن جلسه
            // Endpoint: /api/syncmeet/meetings/:meetingId/archive
            // Method: PUT
            // Request Body (JSON): {} (یا ممکن است { "archived": true })
            // Expected Response: وضعیت 200 OK
            try {
                await fetch(`http://localhost:3000/api/syncmeet/meetings/${selectedMeetingId}/archive`, {
                    method: 'PUT'
                });
                alert('جلسه آرشیو شد.');
                meetingDetailsModal.style.display = 'none';
                loadMeetings(); // بارگذاری مجدد برای به‌روزرسانی لیست‌ها
            } catch (error) {
                console.error('Error archiving meeting:', error);
                alert('خطا در آرشیو کردن جلسه.');
            }
        }
    });

    deleteMeetingBtn.addEventListener('click', async () => {
        if (!selectedMeetingId) return;
        if (confirm('آیا از حذف این جلسه مطمئن هستید؟ این عملیات غیرقابل بازگشت است!')) { // TODO: از مودال سفارشی استفاده شود
            // API Call: حذف جلسه
            // Endpoint: /api/syncmeet/meetings/:meetingId
            // Method: DELETE
            // Expected Response: وضعیت 204 No Content یا 200 OK
            try {
                await fetch(`http://localhost:3000/api/syncmeet/meetings/${selectedMeetingId}`, {
                    method: 'DELETE'
                });
                alert('جلسه حذف شد.');
                meetingDetailsModal.style.display = 'none';
                loadMeetings(); // بارگذاری مجدد برای به‌روزرسانی لیست‌ها و تقویم
            } catch (error) {
                console.error('Error deleting meeting:', error);
                alert('خطا در حذف جلسه.');
            }
        }
    });

    // --- بارگذاری اولیه ---
    loadMeetings(); // اولین بار بارگذاری جلسات و رندر تقویم
});