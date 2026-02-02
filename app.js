// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDEuAQRASdsSM5wSG2NZevSVVpcutEBt_I",
    authDomain: "todo-55e6e.firebaseapp.com",
    databaseURL: "https://todo-55e6e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "todo-55e6e",
    storageBucket: "todo-55e6e.firebasestorage.app",
    messagingSenderId: "250923692877",
    appId: "1:250923692877:web:b18caf41e25f4f27267d04",
    measurementId: "G-ZL6TCYEWLW"
};

// Initialize Firebase (if config is provided)
let database;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
}

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.querySelector('.app-container');
    const keywordInput = document.getElementById('keyword-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const itemsLeft = document.getElementById('items-left');
    const clearCompletedBtn = document.getElementById('clear-completed');

    let todos = [];
    let currentFilter = 'all';
    let sharedPath = ''; // Firebase path based on keyword

    // --- Login Logic ---
    const handleLogin = () => {
        const keyword = keywordInput.value.trim().toLowerCase();
        if (keyword === 'test') {
            sharedPath = 'boards/test'; // Shared board for "test"
            startApp();
        } else if (keyword === '') {
            loginError.textContent = '合言葉を入力してください';
        } else {
            loginError.textContent = '合言葉が違います';
        }
    };

    loginBtn.addEventListener('click', handleLogin);
    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    const startApp = () => {
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');

        if (database) {
            // Firebase Mode
            database.ref(sharedPath).on('value', (snapshot) => {
                const data = snapshot.val();
                todos = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
                renderTodos();
            }, (error) => {
                console.error("Firebase read failed:", error);
                alert("データの読み込みに失敗しました。ルールの設定を確認してください。");
            });
        } else {
            // Local fallback (if firebase not configured)
            console.warn("Firebase not configured. Using LocalStorage fallback.");
            todos = JSON.parse(localStorage.getItem(`todos_${sharedPath}`)) || [];
            renderTodos();
        }
    };

    // --- Core Logic ---
    const saveTodos = () => {
        if (database) {
            // Firebase Save: This is handled by direct actions (set/remove)
        } else {
            localStorage.setItem(`todos_${sharedPath}`, JSON.stringify(todos));
        }
    };

    const updateStats = () => {
        const activeCount = todos.filter(t => !t.completed).length;
        itemsLeft.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
    };

    const createTodoElement = (todo) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;

        li.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="custom-checkbox"></span>
            </label>
            <span class="todo-text">${todo.text}</span>
            <button class="delete-btn" aria-label="削除">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;

        const checkbox = li.querySelector('input');
        checkbox.addEventListener('change', () => {
            const isCompleted = checkbox.checked;
            if (database) {
                database.ref(`${sharedPath}/${todo.id}`).update({ completed: isCompleted }).catch(err => {
                    alert("更新に失敗しました: " + err.message);
                });
            } else {
                todo.completed = isCompleted;
                li.classList.toggle('completed', isCompleted);
                saveTodos();
                updateStats();
            }
        });

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            li.style.transform = 'translateX(20px)';
            li.style.opacity = '0';
            setTimeout(() => {
                if (database) {
                    database.ref(`${sharedPath}/${todo.id}`).remove().catch(err => {
                        alert("削除に失敗しました: " + err.message);
                    });
                } else {
                    todos = todos.filter(t => t.id !== todo.id);
                    saveTodos();
                    renderTodos();
                }
            }, 200);
        });

        return li;
    };

    const renderTodos = () => {
        todoList.innerHTML = '';
        const filteredTodos = todos.filter(todo => {
            if (currentFilter === 'active') return !todo.completed;
            if (currentFilter === 'completed') return todo.completed;
            return true;
        }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        filteredTodos.forEach(todo => {
            todoList.appendChild(createTodoElement(todo));
        });
        updateStats();
    };

    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        if (text) {
            const todoData = {
                text,
                completed: false,
                timestamp: Date.now()
            };

            if (database) {
                database.ref(sharedPath).push(todoData).catch(err => {
                    alert("追加に失敗しました: " + err.message);
                });
            } else {
                const newTodo = { id: Date.now(), ...todoData };
                todos.push(newTodo);
                saveTodos();
                renderTodos();
            }
            todoInput.value = '';
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });

    clearCompletedBtn.addEventListener('click', () => {
        const completedItems = todos.filter(t => t.completed);
        if (database) {
            completedItems.forEach(item => {
                database.ref(`${sharedPath}/${item.id}`).remove();
            });
        } else {
            todos = todos.filter(t => !t.completed);
            saveTodos();
            renderTodos();
        }
    });
});
