document.addEventListener('DOMContentLoaded', () => {
    // --- المان‌های DOM ---
    const mainPanel = document.getElementById('main-panel');
    const createPanel = document.getElementById('create-panel');
    const resultsPanel = document.getElementById('results-panel');
    const responsePanel = document.getElementById('response-panel');
    const pollListEl = document.getElementById('poll-list');
    const showCreatePollBtn = document.getElementById('show-create-poll-btn');
    const pollForm = document.getElementById('poll-form');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const resultsPollTitleEl = document.getElementById('results-poll-title');
    const responsePollTitleEl = document.getElementById('response-poll-title');
    const responseQuestionsContainer = document.getElementById('response-questions-container');
    const responseForm = document.getElementById('response-form');
    const exportCsvBtn = document.getElementById('export-csv');

    // --- متغیرهای داخلی ---
    let questionCount = 0;
    let myChart = null; // برای نگهداری نمونه Chart.js

    // --- مدیریت نمایش پنل‌ها ---
    function showPanel(panelId) {
        mainPanel.style.display = 'none';
        createPanel.style.display = 'none';
        resultsPanel.style.display = 'none';
        responsePanel.style.display = 'none';
        document.getElementById(panelId).style.display = 'block';
    }

    function showMainPanel() {
        showPanel('main-panel');
        loadPolls();
    }
    showCreatePollBtn.addEventListener('click', () => showPanel('create-panel'));

    // --- مدیریت نظرسنجی‌ها ---
    function loadPolls() {
        // API Call: دریافت لیست تمام نظرسنجی‌ها
        // Endpoint: /api/pollify/polls
        // Method: GET
        // Expected Response (JSON Array):
        // [
        //   { "id": "poll1", "title": "نظرسنجی خدمات", "isLimited": false },
        //   { "id": "poll2", "title": "نظرسنجی محصول جدید", "isLimited": true }
        // ]
        fetch('http://localhost:3000/api/pollify/polls')
            .then(res => res.json())
            .then(polls => {
                pollListEl.innerHTML = '';
                polls.forEach(poll => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${poll.title}</span>
                        <div class="poll-actions">
                            <button class="main-btn primary-btn view-results-btn" data-id="${poll.id}">نتایج</button>
                            <button class="main-btn secondary-btn take-poll-btn" data-id="${poll.id}">پاسخ</button>
                        </div>
                    `;
                    pollListEl.appendChild(li);
                });
                attachPollActionListeners();
            })
            .catch(error => console.error('Error loading polls:', error));
    }
    
    function attachPollActionListeners() {
        document.querySelectorAll('.view-results-btn').forEach(btn => {
            btn.addEventListener('click', (e) => renderPollResults(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.take-poll-btn').forEach(btn => {
            btn.addEventListener('click', (e) => renderPollForResponse(e.currentTarget.dataset.id));
        });
    }

    // --- ساخت نظرسنجی ---
    addQuestionBtn.addEventListener('click', () => {
        questionCount++;
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question-group');
        questionDiv.dataset.questionId = questionCount;
        questionDiv.innerHTML = `
            <h4>سوال ${questionCount}</h4>
            <div class="question-actions">
                <button type="button" class="main-btn secondary-btn remove-question-btn" data-id="${questionCount}">حذف</button>
            </div>
            <div class="form-group">
                <input type="text" class="question-text" placeholder="متن سوال" required>
            </div>
            <div class="form-group">
                <select class="question-type">
                    <option value="text">متنی</option>
                    <option value="multiple-choice">چند گزینه‌ای</option>
                </select>
            </div>
            <div class="form-group conditional-group" style="display:none;">
                <label>شرط نمایش</label>
                <select class="conditional-question-select"></select>
                <input type="text" class="conditional-answer" placeholder="پاسخ مورد انتظار">
            </div>
            <div class="options-container" style="display:none;">
                <label>گزینه‌ها (هر گزینه در یک خط)</label>
                <textarea class="question-options" rows="4" placeholder="گزینه ۱&#10;گزینه ۲"></textarea>
            </div>
        `;
        questionsContainer.appendChild(questionDiv);
        updateQuestionDropdowns();

        const questionTypeSelect = questionDiv.querySelector('.question-type');
        questionTypeSelect.addEventListener('change', (e) => {
            const optionsContainer = questionDiv.querySelector('.options-container');
            optionsContainer.style.display = e.target.value === 'multiple-choice' ? 'block' : 'none';
        });

        questionDiv.querySelector('.remove-question-btn').addEventListener('click', (e) => {
            e.currentTarget.closest('.question-group').remove();
            updateQuestionDropdowns();
        });
    });

    function updateQuestionDropdowns() {
        const questionTexts = Array.from(document.querySelectorAll('.question-group .question-text')).map(input => input.value);
        document.querySelectorAll('.conditional-question-select').forEach(select => {
            const currentId = select.closest('.question-group').dataset.questionId;
            select.innerHTML = '<option value="">بدون شرط</option>';
            questionTexts.forEach((text, index) => {
                const questionId = index + 1;
                if (questionId < currentId) {
                    const option = document.createElement('option');
                    option.value = questionId;
                    option.textContent = `سوال ${questionId}: ${text}`;
                    select.appendChild(option);
                }
            });
        });
    }

    pollForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pollTitle = document.getElementById('poll-title').value;
        const isLimited = document.getElementById('one-response-limit').checked;
        const questions = [];
        document.querySelectorAll('.question-group').forEach(qDiv => {
            const text = qDiv.querySelector('.question-text').value;
            const type = qDiv.querySelector('.question-type').value;
            const conditionalQuestionId = qDiv.querySelector('.conditional-question-select').value;
            const conditionalAnswer = qDiv.querySelector('.conditional-answer').value;

            let question = { text, type, order: questions.length + 1 };
            if (type === 'multiple-choice') {
                const optionsText = qDiv.querySelector('.question-options').value;
                question.options = optionsText.split('\n').map(o => o.trim()).filter(Boolean);
            }
            if (conditionalQuestionId) {
                question.conditionalLogic = {
                    questionId: conditionalQuestionId,
                    answer: conditionalAnswer
                };
            }
            questions.push(question);
        });

        // API Call: ذخیره نظرسنجی جدید در بک‌اند
        // Endpoint: /api/pollify/polls
        // Method: POST
        // Request Body (JSON): { title: string, questions: [], isLimited: boolean }
        // Expected Response (JSON): { id: string, title: string, ... }
        const response = await fetch('http://localhost:3000/api/pollify/polls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: pollTitle, isLimited, questions })
        });

        if (response.ok) {
            alert('نظرسنجی با موفقیت ذخیره شد.');
            pollForm.reset();
            questionsContainer.innerHTML = '';
            questionCount = 0;
            showMainPanel();
        } else {
            alert('خطا در ذخیره نظرسنجی. لطفاً دوباره تلاش کنید.');
        }
    });

    // --- پاسخ به نظرسنجی ---
    function renderPollForResponse(pollId) {
        showPanel('response-panel');
        // API Call: دریافت یک نظرسنجی خاص برای پاسخگویی
        // Endpoint: /api/pollify/polls/:pollId
        // Method: GET
        // Expected Response (JSON): { id: string, title: string, questions: [] }
        fetch(`http://localhost:3000/api/pollify/polls/${pollId}`)
            .then(res => res.json())
            .then(poll => {
                responsePollTitleEl.textContent = poll.title;
                responseQuestionsContainer.innerHTML = '';
                responseForm.dataset.pollId = poll.id;
                
                poll.questions.forEach((q, index) => {
                    const questionDiv = document.createElement('div');
                    questionDiv.classList.add('form-group');
                    questionDiv.dataset.questionId = q.order;
                    
                    if (q.conditionalLogic) {
                        // سوالات شرطی در ابتدا مخفی هستند
                        questionDiv.style.display = 'none';
                    }

                    let inputHtml = '';
                    if (q.type === 'text') {
                        inputHtml = `<input type="text" name="q_${q.order}" placeholder="پاسخ خود را وارد کنید">`;
                    } else if (q.type === 'multiple-choice') {
                        inputHtml = q.options.map(option => `
                            <label class="checkbox-container">
                                <input type="radio" name="q_${q.order}" value="${option}">
                                <span>${option}</span>
                            </label>
                        `).join('');
                    }

                    questionDiv.innerHTML = `
                        <label>${index + 1}. ${q.text}</label>
                        ${inputHtml}
                    `;
                    responseQuestionsContainer.appendChild(questionDiv);
                });
                
                // نمایش اولین سوالات غیرشرطی
                document.querySelectorAll('#response-questions-container .form-group').forEach(qDiv => {
                    if (!qDiv.hasAttribute('data-conditional-question')) {
                        qDiv.style.display = 'block';
                    }
                });

                // اضافه کردن event listener برای منطق شرطی
                responseForm.addEventListener('change', handleConditionalLogic);
            })
            .catch(error => console.error('Error loading poll for response:', error));
    }
    
    function handleConditionalLogic(e) {
        const questionId = e.target.closest('.form-group').dataset.questionId;
        const answer = e.target.value;

        document.querySelectorAll('#response-questions-container .form-group').forEach(qDiv => {
            const conditionalQuestionId = qDiv.dataset.conditionalQuestion;
            if (conditionalQuestionId && conditionalQuestionId === questionId) {
                const conditionalAnswer = qDiv.dataset.conditionalAnswer;
                if (answer === conditionalAnswer) {
                    qDiv.style.display = 'block';
                } else {
                    qDiv.style.display = 'none';
                }
            }
        });
    }

    responseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pollId = responseForm.dataset.pollId;
        const answers = {};
        let allQuestionsAnswered = true;

        document.querySelectorAll('#response-questions-container .form-group[style*="display: block"]').forEach(qDiv => {
            const questionId = qDiv.dataset.questionId;
            const input = qDiv.querySelector('input, textarea');
            if (input && input.value) {
                answers[questionId] = input.value;
            } else if (qDiv.querySelector('input[type="radio"]')) {
                const checkedRadio = qDiv.querySelector('input[type="radio"]:checked');
                if (checkedRadio) {
                    answers[questionId] = checkedRadio.value;
                } else {
                    allQuestionsAnswered = false;
                }
            }
        });

        if (!allQuestionsAnswered) {
            alert('لطفاً به تمام سوالات پاسخ دهید.');
            return;
        }

        // API Call: ارسال پاسخ‌های نظرسنجی
        // Endpoint: /api/pollify/polls/:pollId/response
        // Method: POST
        // Request Body (JSON): { answers: { "q_id": "answer" }, userId: "..." }
        // Expected Response: وضعیت 200 OK یا یک پیام موفقیت
        const response = await fetch(`http://localhost:3000/api/pollify/polls/${pollId}/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });

        if (response.ok) {
            alert('پاسخ شما با موفقیت ثبت شد.');
            responseForm.reset();
            showMainPanel();
        } else {
            alert('خطا در ثبت پاسخ. شاید قبلاً در این نظرسنجی شرکت کرده‌اید.');
        }
    });

    // --- نمایش نتایج ---
    function renderPollResults(pollId) {
        showPanel('results-panel');
        // API Call: دریافت نتایج نظرسنجی
        // Endpoint: /api/pollify/polls/:pollId/results
        // Method: GET
        // Expected Response (JSON): 
        // {
        //   "title": "عنوان", 
        //   "responseCount": 10,
        //   "results": [
        //     { "questionText": "سوال اول", "type": "multiple-choice", "data": { "گزینه ۱": 5, "گزینه ۲": 3 } },
        //     { "questionText": "سوال دوم", "type": "text", "data": ["پاسخ ۱", "پاسخ ۲"] }
        //   ]
        // }
        fetch(`http://localhost:3000/api/pollify/polls/${pollId}/results`)
            .then(res => res.json())
            .then(results => {
                resultsPollTitleEl.textContent = results.title;
                document.getElementById('response-count').textContent = results.responseCount;
                document.getElementById('chart-container').innerHTML = ''; // پاک کردن نمودارهای قبلی
                exportCsvBtn.onclick = () => exportToCsv(results);
                
                results.results.forEach(qResult => {
                    if (qResult.type === 'multiple-choice') {
                        const chartCanvas = document.createElement('canvas');
                        document.getElementById('chart-container').appendChild(chartCanvas);

                        new Chart(chartCanvas, {
                            type: 'bar',
                            data: {
                                labels: Object.keys(qResult.data),
                                datasets: [{
                                    label: qResult.questionText,
                                    data: Object.values(qResult.data),
                                    backgroundColor: [
                                        'rgba(54, 162, 235, 0.5)',
                                        'rgba(255, 99, 132, 0.5)',
                                        'rgba(75, 192, 192, 0.5)',
                                        'rgba(255, 206, 86, 0.5)'
                                    ],
                                    borderColor: [
                                        'rgba(54, 162, 235, 1)',
                                        'rgba(255, 99, 132, 1)',
                                        'rgba(75, 192, 192, 1)',
                                        'rgba(255, 206, 86, 1)'
                                    ],
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                plugins: {
                                    legend: { display: false },
                                    title: { display: true, text: qResult.questionText, font: { family: 'Vazirmatn' } }
                                },
                                scales: {
                                    y: { beginAtZero: true }
                                }
                            }
                        });
                    }
                });
            })
            .catch(error => console.error('Error loading poll results:', error));
    }
    
    // --- خروجی CSV ---
    function exportToCsv(results) {
        const header = ["Question", "Type", "Answer/Option", "Count"];
        const rows = [];

        results.results.forEach(qResult => {
            if (qResult.type === 'multiple-choice') {
                for (const option in qResult.data) {
                    rows.push([`"${qResult.questionText}"`, qResult.type, `"${option}"`, qResult.data[option]]);
                }
            } else if (qResult.type === 'text') {
                 qResult.data.forEach(answer => {
                    rows.push([`"${qResult.questionText}"`, qResult.type, `"${answer}"`, "1"]);
                });
            }
        });

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + header.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${results.title}-results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // بارگذاری اولیه نظرسنجی‌ها
    loadPolls();
});