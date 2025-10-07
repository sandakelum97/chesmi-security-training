// ===================================================================================
// === COMPLETE & CORRECTED CODE FOR client/js/main.js
// ===================================================================================

const particleConfig = {
    secure: { particles: { number: { value: 80, density: { enable: true, value_area: 800 } }, color: { value: "#28a745" }, shape: { type: "circle" }, opacity: { value: 0.5, random: false }, size: { value: 3, random: true }, line_linked: { enable: true, distance: 150, color: "#28a745", opacity: 0.4, width: 1 }, move: { enable: true, speed: 2, direction: "none", random: false, straight: false, out_mode: "out", bounce: false } }, interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true }, modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } } }, retina_detect: true },
    warning: { particles: { number: { value: 60, density: { enable: true, value_area: 800 } }, color: { value: "#f7ca18" }, shape: { type: "triangle" }, opacity: { value: 0.6, random: true }, size: { value: 4, random: true }, line_linked: { enable: false }, move: { enable: true, speed: 4, direction: "top", random: true, straight: false, out_mode: "out", bounce: true } }, interactivity: { detect_on: "canvas", events: { onhover: { enable: false }, onclick: { enable: true, mode: "push" }, resize: true }, modes: { push: { particles_nb: 4 } } }, retina_detect: true },
    danger: { particles: { number: { value: 100, density: { enable: true, value_area: 800 } }, color: { value: "#dc3545" }, shape: { type: "edge" }, opacity: { value: 0.7, random: true }, size: { value: 2, random: true }, line_linked: { enable: true, distance: 100, color: "#dc3545", opacity: 0.6, width: 1 }, move: { enable: true, speed: 6, direction: "none", random: true, straight: false, out_mode: "out", bounce: true } }, interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true }, modes: { grab: { distance: 140, line_opacity: 1 }, push: { particles_nb: 4 } } }, retina_detect: true }
};

const quizController = {
    score: 0, questionIndex: 0, questions: [], quizType: '', securityLevel: 100, quizData: {},
    async init(quizType) {
        this.quizType = quizType;
        this.trainingModal = document.getElementById('trainingModal');
        this.startQuizBtn = document.getElementById('startQuizBtn');
        this.questionArea = document.getElementById('questionArea');
        this.answerButtons = document.querySelector('.answer-buttons');
        this.feedback = document.getElementById('feedback');
        this.nextButton = document.getElementById('nextButton');
        const token = localStorage.getItem('chesmiAuthToken');
        if (!token) return window.location.href = 'index.html';
        this.nextButton.addEventListener('click', () => { this.questionIndex++; this.showQuestion(); });
        try {
            const response = await fetch(`/api/quizzes/${this.quizType}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not load quiz.');
            const fetchedQuizData = await response.json();
            this.quizData = fetchedQuizData;
            document.getElementById('quizTitle').textContent = this.quizData.title;
            document.getElementById('trainingTitle').textContent = `${this.quizData.title} - Training`;
            document.getElementById('trainingContent').innerHTML = this.quizData.training;
            this.startQuizBtn.addEventListener('click', () => { this.trainingModal.classList.remove('show'); document.querySelector('.container').style.visibility = 'visible'; this.start(); });
        } catch (error) { console.error(error); document.getElementById('trainingContent').innerHTML = '<p style="color: red;">Error: Could not load quiz data from the server. Please try again later.</p>'; }
    },
    start() { 
        this.score = 0; 
        this.questionIndex = 0; 
        this.securityLevel = 100; 
        appController.updateSecurityVisuals(); 
        this.questions = this.quizData.questions; 
        this.shuffleArray(this.questions);
        this.showQuestion(); 
    },
    shuffleArray(array) { if (!array) return; for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } },
    
    showQuestion() {
        if (this.questionIndex >= this.questions.length) {
            return this.endQuiz();
        }

        this.resetState();
        const currentQuestion = this.questions[this.questionIndex];
        document.getElementById('questionCounter').textContent = `Question ${this.questionIndex + 1} of ${this.questions.length}`;
        document.getElementById('progressBar').style.width = `${((this.questionIndex + 1) / this.questions.length) * 100}%`;

        if (currentQuestion.type === 'mcq') {
            this.questionArea.innerHTML = `<p>${currentQuestion.question}</p>`;
            this.shuffleArray(currentQuestion.options);
            currentQuestion.options.forEach(option => {
                const button = document.createElement('button');
                button.innerText = option;
                button.classList.add('btn');
                button.addEventListener('click', () => this.selectAnswer(option, currentQuestion.answer));
                this.answerButtons.appendChild(button);
            });
        } else if (currentQuestion.type === 'phishing-email') {
            this.questionArea.innerHTML = `<div class="email-simulation">${currentQuestion.emailContent}</div><p class="phishing-question">Is this email phishing or legitimate?</p>`;
            const phishingBtn = document.createElement('button');
            phishingBtn.innerText = 'Phishing';
            phishingBtn.classList.add('btn', 'btn-danger');
            phishingBtn.addEventListener('click', () => this.selectAnswer(true, currentQuestion.isPhishing));
            this.answerButtons.appendChild(phishingBtn);
            const legitBtn = document.createElement('button');
            legitBtn.innerText = 'Legitimate';
            legitBtn.classList.add('btn', 'btn-success');
            legitBtn.addEventListener('click', () => this.selectAnswer(false, currentQuestion.isPhishing));
            this.answerButtons.appendChild(legitBtn);
        }
        appController.setupInteractiveLinks();
    },

    resetState() { this.feedback.style.display = 'none'; this.nextButton.style.display = 'none'; while (this.answerButtons.firstChild) { this.answerButtons.removeChild(this.answerButtons.firstChild); } },
    selectAnswer(selected, correct) {
        Array.from(this.answerButtons.children).forEach(button => button.disabled = true);
        const isCorrect = selected === correct;
        if (isCorrect) { this.score++; document.getElementById('feedback-title').textContent = "Correct!"; document.getElementById('feedback-title').style.color = 'var(--success-color)'; this.securityLevel = Math.min(100, this.securityLevel + 5); } else { document.getElementById('feedback-title').textContent = "Incorrect"; document.getElementById('feedback-title').style.color = 'var(--danger-color)'; this.securityLevel = Math.max(0, this.securityLevel - 15); }
        const currentQuestion = this.questions[this.questionIndex];
        document.getElementById('feedback-text').textContent = currentQuestion.explanation || '';
        this.feedback.style.display = 'block'; this.nextButton.style.display = 'block';
        appController.updateSecurityVisuals();
    },
    endQuiz() {
        if (!this.questions || this.questions.length === 0) return;
        const status = (this.score / this.questions.length) >= 0.9 ? 'pass' : 'fail';
        appController.logAttempt(this.quizData.title, this.score, this.questions.length, status);
        sessionStorage.setItem('lastQuizResult', JSON.stringify({ score: this.score, total: this.questions.length, quizType: this.quizType, quizTitle: this.quizData.title, status: status }));
        window.location.href = 'results.html';
    }
};

const appController = {
    init() {
        this.runParticles(particleConfig.secure);
        if (document.querySelector('.form-toggle')) this.handleAuthForms();
        if (document.querySelector('.hub-content')) this.handleHubPage();
        if (document.querySelector('body[data-quiz-type]')) quizController.init(document.querySelector('body[data-quiz-type]').dataset.quizType);
        if (document.querySelector('.results-content')) this.handleResultsPage();
        if (document.getElementById('profileContent')) this.handleProfilePage();
        if (document.getElementById('leaderboardContent')) this.handleLeaderboardPage();
        if (document.getElementById('certUserName')) this.handleCertificatePage();
        if (document.getElementById('adminContent')) this.handleAdminPage();
    },
    runParticles(config) { if (document.getElementById('particles-js')) particlesJS('particles-js', config); },
    handleAuthForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const showLoginBtn = document.getElementById('showLoginBtn');
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        const formMessage = document.getElementById('formMessage');
        if (!loginForm || !registerForm || !showLoginBtn || !showRegisterBtn) { return; }
        showLoginBtn.addEventListener('click', () => { loginForm.style.display = 'block'; registerForm.style.display = 'none'; showLoginBtn.classList.add('active'); showRegisterBtn.classList.remove('active'); formMessage.textContent = ''; });
        showRegisterBtn.addEventListener('click', () => { loginForm.style.display = 'none'; registerForm.style.display = 'block'; showRegisterBtn.classList.add('active'); showLoginBtn.classList.remove('active'); formMessage.textContent = ''; });
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formMessage.textContent = '';
            try {
                const name = document.getElementById('registerName').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Registration failed');
                formMessage.textContent = 'Registration successful! Please switch to the Login tab.';
                formMessage.style.color = 'var(--success-color)';
                registerForm.reset();
            } catch (err) { formMessage.textContent = `Error: ${err.message}`; formMessage.style.color = 'var(--danger-color)'; }
        });
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formMessage.textContent = '';
            try {
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Login failed');
                localStorage.setItem('chesmiAuthToken', data.token);
                localStorage.setItem('chesmiUserData', JSON.stringify({ name: data.user.name, email: email, role: data.user.role }));
                window.location.href = 'hub.html';
            } catch (err) { formMessage.textContent = `Error: ${err.message}`; formMessage.style.color = 'var(--danger-color)'; }
        });
    },
    handleHubPage() {
        const token = localStorage.getItem('chesmiAuthToken');
        if (!token) return window.location.href = 'index.html';
        const userDataString = localStorage.getItem('chesmiUserData');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            if (document.getElementById('welcomeMessage') && userData.name) { document.getElementById('welcomeMessage').textContent = `Welcome, ${userData.name}! Select a module.`; }
            if (document.getElementById('adminBtn') && userData.role === 'admin') { document.getElementById('adminBtn').style.display = 'inline-block'; }
        }
    },
    logout() { localStorage.removeItem('chesmiAuthToken'); localStorage.removeItem('chesmiUserData'); window.location.href = 'index.html'; },

    async handleProfilePage() {
        const token = localStorage.getItem('chesmiAuthToken');
        if (!token) return this.logout();
        const userData = JSON.parse(localStorage.getItem('chesmiUserData'));
        if (userData && userData.name) document.getElementById('profileUserName').textContent = `Welcome back, ${userData.name}!`;
        document.getElementById('logoutBtn').addEventListener('click', this.logout);
        try {
            const response = await fetch('/api/profile/attempts', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) { if (response.status === 401 || response.status === 403) this.logout(); throw new Error('Could not fetch quiz history.'); }
            const attempts = await response.json();
            const container = document.getElementById('attemptsContainer');
            container.innerHTML = '';
            if (attempts.length === 0) { container.innerHTML = '<p>You have not completed any quizzes yet.</p>'; } 
            else {
                attempts.forEach(att => {
                    const isPass = att.status === 'pass';
                    const card = document.createElement('div');
                    card.className = `data-card ${isPass ? 'status-pass' : 'status-fail'}`;
                    card.innerHTML = `
                        <h3>${att.quiz_title}</h3>
                        <p><strong>Status:</strong> <span><i class="fas ${isPass ? 'fa-check-circle' : 'fa-times-circle'} status-icon"></i> ${isPass ? 'Passed' : 'Failed'}</span></p>
                        <p><strong>Score:</strong> ${att.score} / ${att.total_questions}</p>
                        <p><strong>Date:</strong> ${new Date(att.completed_at).toLocaleDateString()}</p>
                    `;
                    container.appendChild(card);
                });
            }
        } catch (error) { console.error(error); document.getElementById('attemptsContainer').innerHTML = '<p>Could not load quiz history.</p>'; }
    },

    async handleLeaderboardPage() {
        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) throw new Error('Could not fetch leaderboard data.');
            const leaderboardData = await response.json();
            const container = document.getElementById('leaderboardContainer');
            container.innerHTML = '';
            if (leaderboardData.length === 0) { container.innerHTML = '<p>No one has passed a quiz yet. Be the first!</p>'; return; }
            const rankClasses = ['gold', 'silver', 'bronze'];
            leaderboardData.forEach((user, index) => {
                const rankClass = rankClasses[index] || '';
                const rankIcon = index < 3 ? `<i class="fas fa-trophy"></i>` : `${index + 1}`;
                const card = document.createElement('div');
                card.className = `data-card leaderboard-card ${rankClass}`;
                card.innerHTML = `
                    <span class="leaderboard-rank">${rankIcon}</span>
                    <div class="data-card-content">
                        <h3>${user.name}</h3>
                        <p><strong>Quizzes Passed:</strong> ${user.quizzes_passed}</p>
                        <p><strong>Average Score:</strong> ${user.average_score}%</p>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) { console.error(error); document.getElementById('leaderboardContainer').innerHTML = '<p>Could not load leaderboard.</p>'; }
    },
    
    async handleAdminPage() {
        const token = localStorage.getItem('chesmiAuthToken');
        if (!token) return window.location.href = 'index.html';

        const userDetailsModal = document.getElementById('userDetailsModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => userDetailsModal.classList.remove('show'));
        }

        try {
            const response = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 403) { alert('Access Denied: Admins only.'); return window.location.href = 'hub.html'; }
            if (!response.ok) throw new Error('Failed to load user data.');
            const users = await response.json();
            const container = document.getElementById('usersContainer');
            container.innerHTML = '';
            users.forEach(user => {
                const card = document.createElement('div');
                card.className = 'data-card';
                card.innerHTML = `
                    <div class="admin-card-header">
                        <h3>${user.name}</h3>
                        <span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span>
                    </div>
                    <p><strong>ID:</strong> ${user.id}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <div class="admin-card-actions">
                        <button class="btn btn-secondary btn-details" data-user-id="${user.id}" data-user-name="${user.name}">
                            <i class="fas fa-history"></i> View Details
                        </button>
                        <button class="btn-icon btn-promote" data-user-id="${user.id}" data-current-role="${user.role}" title="Promote/Demote User">
                            <i class="fas fa-user-shield"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-user-id="${user.id}" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });

            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', async (event) => { const userId = event.currentTarget.dataset.userId; if (confirm(`Are you sure you want to delete user ID ${userId}?`)) await this.deleteUser(userId, token); });
            });
            document.querySelectorAll('.btn-promote').forEach(button => {
                button.addEventListener('click', async (event) => { const userId = event.currentTarget.dataset.userId; const currentRole = event.currentTarget.dataset.currentRole; const newRole = currentRole === 'admin' ? 'user' : 'admin'; if (confirm(`Change this user's role to '${newRole.toUpperCase()}'?`)) await this.updateUserRole(userId, newRole, token); });
            });
            document.querySelectorAll('.btn-details').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const userId = event.currentTarget.dataset.userId;
                    const userName = event.currentTarget.dataset.userName;
                    await this.showUserDetails(userId, userName, token);
                });
            });
        } catch (error) { console.error('Admin page error:', error); alert('An error occurred.'); window.location.href = 'hub.html'; }
    },

    async showUserDetails(userId, userName, token) {
        const modal = document.getElementById('userDetailsModal');
        document.getElementById('modalUserName').textContent = `Quiz History for: ${userName}`;
        const attemptsContainer = document.getElementById('modalUserAttempts');
        attemptsContainer.innerHTML = '<p>Loading...</p>';
        modal.classList.add('show');
        try {
            const response = await fetch(`/api/admin/users/${userId}/attempts`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch attempts.');
            const attempts = await response.json();
            let html = `
                <table>
                    <thead>
                        <tr><th>Quiz</th><th>Score</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
            `;
            if (attempts.length === 0) {
                html += '<tr><td colspan="4">This user has not completed any quizzes.</td></tr>';
            } else {
                attempts.forEach(att => {
                    html += `
                        <tr>
                            <td>${att.quiz_title}</td>
                            <td>${att.score} / ${att.total_questions}</td>
                            <td class="${att.status === 'pass' ? 'status-pass' : 'status-fail'}">${att.status}</td>
                            <td>${new Date(att.completed_at).toLocaleDateString()}</td>
                        </tr>
                    `;
                });
            }
            html += '</tbody></table>';
            attemptsContainer.innerHTML = html;
        } catch(error) {
            attemptsContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    },

    async updateUserRole(userId, newRole, token) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ role: newRole })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            alert(data.message);
            window.location.reload();
        } catch (error) { alert(`Error: ${error.message}`); }
    },
    
    async deleteUser(userId, token) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            alert(data.message);
            window.location.reload();
        } catch (error) { alert(`Error: ${error.message}`); }
    },

    handleResultsPage() {
        const result = JSON.parse(sessionStorage.getItem('lastQuizResult'));
        if (!result) return window.location.href = 'hub.html';
        document.getElementById('finalScore').textContent = `${result.score} / ${result.total}`;
        document.getElementById('retakeQuizBtn').href = `${result.quizType}_quiz.html`;
        if (result.status === 'pass') {
            document.getElementById('scoreMessage').textContent = 'Congratulations! You passed the assessment.';
            document.getElementById('scoreMessage').style.color = 'var(--success-color)';
            document.getElementById('certificateBtnContainer').innerHTML = `<a href="certificate.html?quiz=${encodeURIComponent(result.quizTitle)}" class="btn btn-success"><i class="fas fa-certificate"></i> Generate Certificate</a>`;
        } else {
            document.getElementById('scoreMessage').textContent = 'You did not pass. Please review the material and retake the quiz.';
            document.getElementById('scoreMessage').style.color = 'var(--warning-color)';
        }
    },

    handleCertificatePage() {
        const userData = JSON.parse(localStorage.getItem('chesmiUserData'));
        const params = new URLSearchParams(window.location.search);
        if (document.getElementById('certUserName')) {
            document.getElementById('certUserName').textContent = userData ? userData.name : 'Participant';
            document.getElementById('certQuizName').textContent = params.get('quiz') || 'Security Module';
            document.getElementById('certDate').textContent = new Date().toLocaleDateString();
        }
    },

    async logAttempt(quizTitle, score, totalQuestions, status) {
        console.log("DEBUG: logAttempt function started. Preparing to send data...");
        const token = localStorage.getItem('chesmiAuthToken');
        if (!token) {
            console.error("DEBUG: No auth token found. Cannot log attempt.");
            return;
        }

        try {
            console.log("DEBUG: Sending quiz result to server:", { quizTitle, score, totalQuestions, status });
            
            const response = await fetch('/api/quizzes/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quizTitle, score, totalQuestions, status })
            });

            console.log("DEBUG: Received response from server. Status:", response.status);
            
            const responseData = await response.json();
            
            if (!response.ok) {
                console.error("DEBUG: Server responded with an error:", responseData);
            } else {
                console.log("DEBUG: SUCCESS! Server saved the attempt:", responseData);
            }

        } catch (error) {
            console.error("DEBUG: CRITICAL ERROR during fetch in logAttempt:", error);
        }
    },

    updateSecurityVisuals() {
        if (!document.getElementById('securityStatusBar')) return;
        quizController.securityLevel = Math.max(0, Math.min(100, quizController.securityLevel));
        document.getElementById('securityStatusBar').style.width = `${quizController.securityLevel}%`;
        let stateClass = 'state-secure', stateText = 'STATUS: SECURE', config = particleConfig.secure;
        if (quizController.securityLevel < 70) { stateClass = 'state-warning'; stateText = 'STATUS: AT RISK'; config = particleConfig.warning; }
        if (quizController.securityLevel < 40) { stateClass = 'state-danger'; stateText = 'STATUS: COMPROMISED'; config = particleConfig.danger; }
        document.body.className = `quiz-page ${stateClass}`;
        document.getElementById('securityStatusText').textContent = stateText;
        this.runParticles(config);
    },

    setupInteractiveLinks() {
        document.querySelectorAll('.suspicious-link').forEach(link => {
            if (link.querySelector('.link-tooltip')) return;
            const realUrl = link.getAttribute('data-real-url');
            if (realUrl) {
                const tooltip = document.createElement('span');
                tooltip.className = 'link-tooltip';
                tooltip.textContent = `⚠️ Destination: ${realUrl}`;
                link.appendChild(tooltip);
            }
            link.addEventListener('click', e => e.preventDefault());
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    appController.init();
});
