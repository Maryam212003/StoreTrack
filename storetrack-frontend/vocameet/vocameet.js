document.addEventListener('DOMContentLoaded', () => {
    // --- المان‌های DOM ---
    const createSessionForm = document.getElementById('create-session-form');
    const upcomingSessionsList = document.getElementById('upcoming-sessions-list');
    const sessionDetailsEl = document.getElementById('session-details');
    const activeSessionInfoEl = document.getElementById('active-session-info');
    const activeSessionTitleEl = document.getElementById('active-session-title');
    const activeSessionTimeEl = document.getElementById('active-session-time');
    const joinSessionBtn = document.getElementById('join-session-btn');
    const leaveSessionBtn = document.getElementById('leave-session-btn');
    const showReportBtn = document.getElementById('show-report-btn');
    const participantTimersEl = document.getElementById('participant-timers');
    const reportModal = document.getElementById('report-modal');
    const reportContentEl = document.getElementById('report-content');
    const ratingModal = document.getElementById('rating-modal');
    const ratingForm = document.getElementById('rating-form');
    const ratingParticipantsListEl = document.getElementById('rating-participants-list');
    const modalCloseButtons = document.querySelectorAll('.modal .close-btn');

    // --- متغیرهای داخلی ---
    let activeSessionId = null;
    let localStream = null;
    let peerConnections = {}; // Map of user IDs to RTCPeerConnection objects
    let speakingTimers = {}; // Object to store timers for each participant
    let audioContext = null;
    let analyser = null;
    let mediaStreamSource = null;
    const speakingThreshold = -50; // Threshold in dB for detecting speech
    const localUserId = 'user1'; // TODO: این مقدار باید از سیستم احراز هویت بک‌اند گرفته شود.

    // --- توابع عمومی ---
    function formatTime(seconds) {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function formatDateTime(isoString) {
        return new Date(isoString).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // --- مدیریت جلسات ---
    function loadSessions() {
        // API Call: دریافت لیست جلسات آینده
        // Endpoint: /api/vocameet/sessions/upcoming
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "id": "s1", "title": "جلسه پروپوزال", "time": "2025-08-15T10:00:00Z", "participants": [] },
        //   { "id": "s2", "title": "بررسی پروژه", "time": "2025-08-16T14:00:00Z", "participants": [] }
        // ]
        fetch('http://localhost:3000/api/vocameet/sessions/upcoming')
            .then(res => res.json())
            .then(sessions => {
                upcomingSessionsList.innerHTML = '';
                if (sessions.length === 0) {
                    upcomingSessionsList.innerHTML = '<p class="text-light">جلسه‌ای برای نمایش وجود ندارد.</p>';
                }
                sessions.forEach(s => {
                    const li = document.createElement('li');
                    li.textContent = `${s.title} - ${formatDateTime(s.time)}`;
                    li.dataset.sessionId = s.id;
                    li.dataset.sessionTitle = s.title;
                    li.dataset.sessionTime = s.time;
                    li.addEventListener('click', () => showSessionDetails(s.id, s.title, s.time));
                    upcomingSessionsList.appendChild(li);
                });
            })
            .catch(error => console.error('Error loading sessions:', error));
    }

    createSessionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const session = {
            title: document.getElementById('session-title').value,
            time: document.getElementById('session-time').value,
            creatorId: localUserId // بک‌اند باید از نشست کاربر این مقدار را بگیرد
        };

        // API Call: ایجاد جلسه جدید
        // Endpoint: /api/vocameet/sessions
        // Method: POST
        // Request Body (JSON): { "title": "...", "time": "...", "creatorId": "..." }
        // Expected Response (JSON): جلسه ایجاد شده (شامل id)
        try {
            await fetch('http://localhost:3000/api/vocameet/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(session)
            });
            createSessionForm.reset();
            loadSessions();
        } catch (error) {
            console.error('Error creating session:', error);
            alert('خطا در ایجاد جلسه.');
        }
    });

    function showSessionDetails(id, title, time) {
        activeSessionId = id;
        activeSessionTitleEl.textContent = title;
        activeSessionTimeEl.textContent = formatDateTime(time);
        sessionDetailsEl.classList.remove('placeholder-text');
        sessionDetailsEl.style.justifyContent = 'flex-start';
        activeSessionInfoEl.style.display = 'block';
        
        // Hide join button if session has already started or passed
        if (new Date(time) < new Date()) {
            joinSessionBtn.style.display = 'none';
        } else {
            joinSessionBtn.style.display = 'block';
        }
    }

    // --- مدیریت ارتباط صوتی (WebRTC) و تایمرها ---
    joinSessionBtn.addEventListener('click', async () => {
        try {
            // دریافت دسترسی به میکروفون
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // نمایش تایمر برای خود کاربر
            addParticipantTimer(localUserId);
            
            // ایجاد یک WebSocket برای Signaling
            // این بخش به پیاده‌سازی بک‌اند نیاز دارد
            const ws = new WebSocket(`ws://localhost:3000/api/vocameet/session/${activeSessionId}/signaling`);

            ws.onopen = () => {
                console.log('WebSocket connected. Sending join message.');
                ws.send(JSON.stringify({ type: 'join', userId: localUserId }));
            };

            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case 'participant-joined':
                        addParticipantTimer(message.userId);
                        // TODO: Start WebRTC peer connection with new participant
                        break;
                    case 'participant-left':
                        removeParticipantTimer(message.userId);
                        // TODO: Close peer connection
                        break;
                    // TODO: Handle other WebRTC signaling messages (e.g., offer, answer, ice-candidate)
                }
            };
            
            // شروع تشخیص صحبت
            startVoiceActivityDetection();

            // تغییر UI
            joinSessionBtn.style.display = 'none';
            leaveSessionBtn.style.display = 'inline-block';
            showReportBtn.style.display = 'none'; // گزارش در پایان جلسه قابل مشاهده است
            sessionDetailsEl.classList.add('in-session');

        } catch (err) {
            console.error('Error joining session:', err);
            alert('خطا در دسترسی به میکروفون یا اتصال به جلسه.');
        }
    });

    leaveSessionBtn.addEventListener('click', () => {
        // Stop all timers
        for (const userId in speakingTimers) {
            clearInterval(speakingTimers[userId].interval);
        }
        speakingTimers = {};
        
        // Stop local audio stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }

        // Send speaking time data to backend for report generation
        // API Call: ارسال داده‌های زمان صحبت برای گزارش
        // Endpoint: /api/vocameet/sessions/:sessionId/report
        // Method: POST
        // Request Body (JSON): { "userId": "...", "speakingTime": 120 }
        // Expected Response: وضعیت 200 OK
        const mySpeakingTime = parseInt(document.getElementById(`timer-${localUserId}`).textContent.split(':')[2]);
        fetch(`http://localhost:3000/api/vocameet/sessions/${activeSessionId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: localUserId, speakingTime: mySpeakingTime })
        });
        
        // Change UI back
        joinSessionBtn.style.display = 'inline-block';
        leaveSessionBtn.style.display = 'none';
        showReportBtn.style.display = 'inline-block';
        sessionDetailsEl.classList.remove('in-session');
        participantTimersEl.innerHTML = '';
        
        console.log('Left the session.');
    });

    function addParticipantTimer(userId) {
        const card = document.createElement('div');
        card.classList.add('participant-card');
        card.dataset.userId = userId;
        card.innerHTML = `
            <h4>کاربر ${userId}</h4>
            <div id="timer-${userId}" class="timer-display">00:00:00</div>
        `;
        participantTimersEl.appendChild(card);

        // Start timer
        speakingTimers[userId] = {
            seconds: 0,
            isSpeaking: false,
            interval: setInterval(() => {
                if (speakingTimers[userId].isSpeaking) {
                    speakingTimers[userId].seconds++;
                    document.getElementById(`timer-${userId}`).textContent = formatTime(speakingTimers[userId].seconds);
                }
            }, 1000)
        };
    }

    function removeParticipantTimer(userId) {
        if (speakingTimers[userId]) {
            clearInterval(speakingTimers[userId].interval);
            delete speakingTimers[userId];
            const cardToRemove = participantTimersEl.querySelector(`[data-user-id="${userId}"]`);
            if (cardToRemove) {
                cardToRemove.remove();
            }
        }
    }

    function startVoiceActivityDetection() {
        if (!localStream) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        mediaStreamSource = audioContext.createMediaStreamSource(localStream);
        mediaStreamSource.connect(analyser);

        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkSpeaking = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const isSpeaking = average > 30; // این مقدار باید با دقت تنظیم شود

            const myCard = document.querySelector(`[data-user-id="${localUserId}"]`);
            if (isSpeaking) {
                myCard.classList.add('speaking');
                if (speakingTimers[localUserId] && !speakingTimers[localUserId].isSpeaking) {
                    speakingTimers[localUserId].isSpeaking = true;
                }
            } else {
                myCard.classList.remove('speaking');
                if (speakingTimers[localUserId] && speakingTimers[localUserId].isSpeaking) {
                    speakingTimers[localUserId].isSpeaking = false;
                }
            }
            
            requestAnimationFrame(checkSpeaking);
        };
        requestAnimationFrame(checkSpeaking);
    }
    
    // --- مدیریت گزارش و امتیازدهی ---
    showReportBtn.addEventListener('click', () => showParticipationReport(activeSessionId));

    async function showParticipationReport(sessionId) {
        // API Call: دریافت گزارش مشارکت
        // Endpoint: /api/vocameet/sessions/:sessionId/report
        // Method: GET
        // Expected Response (JSON):
        // { "title": "...", "participants": [{ "userId": "user1", "speakingTime": 120 }, { "userId": "user2", "speakingTime": 90 }], "ratings": [] }
        try {
            const res = await fetch(`http://localhost:3000/api/vocameet/sessions/${sessionId}/report`);
            const report = await res.json();
            
            reportContentEl.innerHTML = '';
            
            // Display speaking time in a list
            const ul = document.createElement('ul');
            ul.classList.add('report-list');
            report.participants.sort((a, b) => b.speakingTime - a.speakingTime).forEach(p => {
                const li = document.createElement('li');
                li.textContent = `کاربر ${p.userId}: ${formatTime(p.speakingTime)}`;
                ul.appendChild(li);
            });
            reportContentEl.appendChild(ul);
            
            // Optional: Show ratings if available
            if (report.ratings && report.ratings.length > 0) {
                 const h4 = document.createElement('h4');
                 h4.textContent = 'امتیازات مشارکت';
                 reportContentEl.appendChild(h4);
                 const ratingsList = document.createElement('ul');
                 report.ratings.forEach(r => {
                     const li = document.createElement('li');
                     li.textContent = `کاربر ${r.userId}: ${r.averageRating} از 5`;
                     ratingsList.appendChild(li);
                 });
                 reportContentEl.appendChild(ratingsList);
            }
            
            // Open modal
            reportModal.style.display = 'flex';
            
            // TODO: Generate a chart using a library like Chart.js
        } catch (error) {
            console.error('Error loading report:', error);
            alert('خطا در بارگذاری گزارش.');
        }
    }
    
    // --- امتیازدهی (ویژگی اختیاری) ---
    // فرض می‌کنیم در انتهای جلسه، یک دکمه برای امتیازدهی نمایش داده می‌شود.
    const showRatingBtn = document.createElement('button');
    showRatingBtn.textContent = 'امتیازدهی به شرکت‌کنندگان';
    showRatingBtn.classList.add('main-btn', 'secondary-btn', 'full-width');
    showRatingBtn.style.display = 'none'; // Initially hidden
    sessionDetailsEl.appendChild(showRatingBtn);

    showRatingBtn.addEventListener('click', () => {
        // API Call: دریافت لیست شرکت‌کنندگان جلسه برای امتیازدهی
        // Endpoint: /api/vocameet/sessions/:sessionId/participants
        // Method: GET
        // Expected Response (JSON Array):
        // [ { "userId": "user1" }, { "userId": "user2" } ]
        fetch(`http://localhost:3000/api/vocameet/sessions/${activeSessionId}/participants`)
            .then(res => res.json())
            .then(participants => {
                ratingParticipantsListEl.innerHTML = '';
                participants.forEach(p => {
                    if (p.userId !== localUserId) { // Don't let users rate themselves
                        const div = document.createElement('div');
                        div.classList.add('rating-item');
                        div.innerHTML = `
                            <span>کاربر ${p.userId}</span>
                            <div class="rating-stars">
                                <input type="radio" name="rating-${p.userId}" value="1" required>1
                                <input type="radio" name="rating-${p.userId}" value="2">2
                                <input type="radio" name="rating-${p.userId}" value="3">3
                                <input type="radio" name="rating-${p.userId}" value="4">4
                                <input type="radio" name="rating-${p.userId}" value="5">5
                            </div>
                        `;
                        ratingParticipantsListEl.appendChild(div);
                    }
                });
                ratingModal.style.display = 'flex';
            })
            .catch(error => console.error('Error loading participants for rating:', error));
    });

    ratingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(ratingForm);
        const ratings = [];
        for (const [key, value] of formData.entries()) {
            const userId = key.split('-')[1];
            ratings.push({ ratedUserId: userId, rating: parseInt(value) });
        }
        
        // API Call: ثبت امتیازات
        // Endpoint: /api/vocameet/sessions/:sessionId/ratings
        // Method: POST
        // Request Body (JSON): { "raterId": "...", "ratings": [{ "ratedUserId": "user2", "rating": 5 }] }
        // Expected Response: وضعیت 200 OK
        try {
            await fetch(`http://localhost:3000/api/vocameet/sessions/${activeSessionId}/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raterId: localUserId, ratings: ratings })
            });
            alert('امتیازات شما ثبت شد.');
            ratingModal.style.display = 'none';
        } catch (error) {
            console.error('Error submitting ratings:', error);
            alert('خطا در ثبت امتیازات.');
        }
    });


    // --- مدیریت مودال‌ها ---
    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === reportModal) {
            reportModal.style.display = 'none';
        }
        if (event.target === ratingModal) {
            ratingModal.style.display = 'none';
        }
    });

    // --- بارگذاری اولیه ---
    loadSessions();
});