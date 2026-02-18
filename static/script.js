/**
 * PetCare MVP - Main Frontend Logic
 * Handles: Tab navigation, Chat interaction, Pet management, and Dashboard reminders.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const petsList = document.getElementById('pets-list');
    const remindersList = document.getElementById('reminders-list');
    const petDetail = document.getElementById('pet-detail');
    const petsView = document.getElementById('pets-view');
    const detailContent = document.getElementById('detail-content');
    const backBtn = document.querySelector('.back-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-pet-form');
    const closeModalBtn = document.getElementById('close-modal');
    const closeModalX = document.getElementById('modal-close-x');

    // --- State Management ---
    let chatHistory = JSON.parse(localStorage.getItem('petCareChatHistory')) || [];

    // --- Initialization ---
    function initialize() {
        // Load persisted chat history into UI
        if (chatHistory.length > 0) {
            chatMessages.innerHTML = '';
            chatHistory.forEach(msg => {
                // Show user messages and final assistant text only
                if (msg.role === 'user' || (msg.role === 'assistant' && msg.content && !msg.tool_calls)) {
                    appendMessage(msg.role, msg.content, false);
                }
            });
        }
    }

    initialize();

    // --- Tab Switching Logic ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            navButtons.forEach(b => {
                b.classList.remove('bg-indigo-50', 'text-indigo-700');
                b.classList.add('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
            });
            btn.classList.add('bg-indigo-50', 'text-indigo-700');
            btn.classList.remove('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');

            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === targetTab) {
                    tab.classList.add('active');
                }
            });

            if (targetTab === 'pets') loadPets();
            if (targetTab === 'reminders') loadReminders();
        });
    });

    // --- Chat & Assistant Logic ---
    async function sendMessage(text = null) {
        // If text is an event (from click/keypress), ignore it and use chatInput
        const message = (typeof text === 'string' ? text : null) || chatInput.value.trim();
        if (!message) return;

        if (typeof text !== 'string') {
            appendMessage('user', message);
            chatInput.value = '';
        }

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: chatHistory })
            });

            const data = await response.json();
            if (response.ok) {
                appendMessage('assistant', data.content);
                chatHistory = data.history;
                localStorage.setItem('petCareChatHistory', JSON.stringify(chatHistory));
            } else {
                appendMessage('assistant', 'Lo siento, hubo un error al procesar tu mensaje.');
            }
        } catch (error) {
            appendMessage('assistant', 'Error de conexión con el servidor.');
        }
    }

    function appendMessage(role, text, save = true) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message-content ';
        if (role === 'user') {
            msgDiv.className += 'bg-indigo-600 text-white rounded-2xl rounded-tr-none p-4 shadow-xl max-w-[85%]';
            msgDiv.innerText = text;
        } else {
            msgDiv.className += 'bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-100 max-w-[85%] text-gray-700';
            // Parse Markdown for assistant responses
            msgDiv.innerHTML = marked.parse(text);
        }

        wrapper.appendChild(msgDiv);
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Initial check: if there is only the internal system message or automated test message, clear it
    if (chatHistory.length > 0) {
        // Filter out the "ghost" automated message from previous versions if it exists
        const automatedMsg = "Hola, ¿qué información tienes sobre mis mascotas?";
        if (chatHistory.some(m => m.content === automatedMsg)) {
            chatHistory = chatHistory.filter(m => m.content !== automatedMsg);
            localStorage.setItem('petCareChatHistory', JSON.stringify(chatHistory));
            // Reload UI if we just filtered something
            if (chatHistory.length === 0) location.reload();
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    clearChatBtn.addEventListener('click', () => {
        Swal.fire({
            title: '¿Limpiar historial?',
            text: "Se borrarán todos los mensajes de esta conversación.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Sí, borrar todo',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                chatHistory = [];
                localStorage.removeItem('petCareChatHistory');
                location.reload();
            }
        });
    });

    // Modal Handling
    function openEditModal(pet) {
        document.getElementById('edit-pet-id').value = pet.id;
        document.getElementById('edit-pet-name').value = pet.name;
        document.getElementById('edit-pet-breed').value = pet.breed;
        document.getElementById('edit-pet-age').value = pet.age;
        document.getElementById('edit-pet-medical').value = pet.medical_info || '';
        editModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editModal.classList.add('hidden');
    }

    closeModalBtn.addEventListener('click', closeEditModal);
    closeModalX.addEventListener('click', closeEditModal);

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const petId = document.getElementById('edit-pet-id').value;
        const petData = {
            name: document.getElementById('edit-pet-name').value,
            breed: document.getElementById('edit-pet-breed').value,
            age: parseInt(document.getElementById('edit-pet-age').value),
            medical_info: document.getElementById('edit-pet-medical').value
        };

        try {
            const response = await fetch(`/api/pets/${petId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(petData)
            });

            if (response.ok) {
                const updatedPet = await response.json();
                closeEditModal();
                showPetDetail(updatedPet);
                loadPets();
                Swal.fire({
                    title: '¡Actualizado!',
                    text: 'Los datos de la mascota se han guardado correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#4f46e5'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo actualizar la mascota.',
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                title: 'Error de conexión',
                text: 'Hubo un problema al contactar con el servidor.',
                icon: 'error',
                confirmButtonColor: '#4f46e5'
            });
        }
    });

    async function deletePet(petId) {
        Swal.fire({
            title: '¿Eliminar mascota?',
            text: "Esta acción no se puede deshacer. Se borrarán todos los eventos asociados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/api/pets/${petId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        Swal.fire({
                            title: 'Eliminada',
                            text: 'La mascota ha sido eliminada correctamente.',
                            icon: 'success',
                            confirmButtonColor: '#4f46e5'
                        });
                        backBtn.click();
                        loadPets();
                    } else {
                        Swal.fire('Error', 'No se pudo eliminar la mascota.', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
                }
            }
        });
    }

    // --- Pet Management Logic ---
    async function loadPets() {
        petsView.classList.remove('hidden');
        petDetail.classList.add('hidden');
        petsList.innerHTML = '<div class="col-span-full py-10 text-center text-gray-400">Cargando tus mascotas...</div>';

        try {
            const response = await fetch('/api/pets');
            const pets = await response.json();

            petsList.innerHTML = '';
            if (pets.length === 0) {
                petsList.innerHTML = `
                    <div class="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                        <span class="text-5xl mb-4">🏠</span>
                        <p class="text-lg font-medium">No tienes mascotas registradas aún.</p>
                        <p class="text-sm">¡Cuéntale al agente sobre tu mascota en la pestaña de chat!</p>
                    </div>
                `;
                return;
            }

            pets.forEach(pet => {
                const card = document.createElement('div');
                card.className = 'group bg-white rounded-3xl p-6 shadow-sm border border-gray-50 hover:shadow-xl hover:shadow-indigo-50 hover:border-indigo-100 transition-all duration-300 cursor-pointer relative overflow-hidden';
                card.innerHTML = `
                    <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-100 transition-colors"></div>
                    <div class="relative">
                        <span class="inline-block p-3 rounded-2xl bg-indigo-50 text-indigo-600 text-2xl mb-4 group-hover:scale-110 transition-transform">🐾</span>
                        <h3 class="text-xl font-bold text-gray-900 mb-1">${pet.name}</h3>
                        <p class="text-indigo-600 text-sm font-semibold mb-4">${pet.breed}</p>
                        <div class="flex items-center text-gray-500 text-sm space-x-4">
                            <span class="flex items-center"><span class="mr-1">🎂</span> ${pet.age} años</span>
                        </div>
                        <div class="mt-4 pt-4 border-t border-gray-50 text-gray-500 text-xs italic">
                            ${pet.medical_info ? pet.medical_info.substring(0, 60) + (pet.medical_info.length > 60 ? '...' : '') : 'Sin notas médicas'}
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => showPetDetail(pet));
                petsList.appendChild(card);
            });
        } catch (error) {
            petsList.innerHTML = '<div class="col-span-full text-center text-red-400">Error al cargar las mascotas.</div>';
        }
    }

    async function showPetDetail(pet) {
        petsView.classList.add('hidden');
        petDetail.classList.remove('hidden');
        detailContent.innerHTML = '<p class="py-10 text-center text-gray-400">Cargando eventos...</p>';

        try {
            const response = await fetch(`/api/pets/${pet.id}/events`);
            const events = await response.json();

            let eventsHtml = '';
            if (events.length === 0) {
                eventsHtml = `
                    <div class="py-10 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dotted border-gray-200">
                        No hay eventos registrados para esta mascota.
                    </div>
                `;
            } else {
                eventsHtml = `
                    <div class="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        ${events.map(e => `
                            <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div class="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300">
                                    <svg class="fill-current" xmlns="http://www.w3.org/2000/svg" width="12" height="10">
                                        <path fill-rule="nonzero" d="M10.422 1.257 4.655 7.023 1.578 3.946l-1.06 1.06 4.137 4.136 6.227-6.227-1.06-1.058Z" />
                                    </svg>
                                </div>
                                <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                                    <div class="flex items-center justify-between space-x-2 mb-1">
                                        <div class="font-bold text-slate-900">${e.type}</div>
                                        <time class="font-medium text-indigo-500 text-sm">${new Date(e.date).toLocaleDateString()}</time>
                                    </div>
                                    <div class="text-slate-500 text-sm">${e.notes || 'Sin notas adicionales'}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            detailContent.innerHTML = `
                <div class="bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 text-white mb-10 relative overflow-hidden shadow-2xl shadow-indigo-200">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                    <div class="relative z-10">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <span class="inline-block px-4 py-1 rounded-full bg-indigo-500/50 text-xs font-bold uppercase tracking-widest self-start">Perfil de Mascota</span>
                            <div class="flex space-x-2">
                                <button id="edit-pet-btn" class="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-semibold transition-colors flex items-center">
                                    <span class="mr-1">✏️</span> Editar
                                </button>
                                <button id="delete-pet-btn" class="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md rounded-xl text-sm font-semibold text-red-100 transition-colors flex items-center">
                                    <span class="mr-1">🗑️</span> Eliminar
                                </button>
                            </div>
                        </div>
                        <h2 class="text-5xl font-black mb-2">${pet.name}</h2>
                        <p class="text-indigo-100 text-xl">${pet.breed} • ${pet.age} años</p>
                        ${pet.medical_info ? `<div class="mt-6 p-4 bg-black/10 rounded-2xl text-sm border border-white/10 italic">${pet.medical_info}</div>` : ''}
                    </div>
                </div>
                <div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-8 px-2 flex items-center">
                        <span class="w-2 h-8 bg-indigo-600 rounded-full mr-4"></span>
                        Historial de Atención
                    </h3>
                    ${eventsHtml}
                </div>
            `;

            // Event listeners for action buttons
            document.getElementById('edit-pet-btn').addEventListener('click', () => openEditModal(pet));
            document.getElementById('delete-pet-btn').addEventListener('click', () => deletePet(pet.id));

        } catch (error) {
            detailContent.innerHTML = '<div class="text-center text-red-500">Error al cargar los detalles.</div>';
        }
    }

    backBtn.addEventListener('click', () => {
        petDetail.classList.add('hidden');
        petsView.classList.remove('hidden');
    });

    // --- Dashboard & Reminders Logic ---
    async function loadReminders() {
        remindersList.innerHTML = '<div class="py-10 text-center text-gray-400">Buscando recordatorios...</div>';
        try {
            const response = await fetch('/api/dashboard');
            const reminders = await response.json();

            remindersList.innerHTML = '';
            if (reminders.length === 0) {
                remindersList.innerHTML = `
                    <div class="py-12 bg-white rounded-3xl border border-gray-100 text-center space-y-3">
                        <div class="text-4xl">🎉</div>
                        <p class="text-gray-900 font-semibold">¡Todo al día!</p>
                        <p class="text-gray-500 text-sm">No hay eventos programados para los próximos 7 días.</p>
                    </div>
                `;
                return;
            }

            reminders.forEach(r => {
                const item = document.createElement('div');
                item.className = 'bg-white p-5 rounded-2xl border-l-4 border-indigo-500 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow';
                item.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <div class="bg-indigo-50 text-indigo-600 p-3 rounded-xl font-bold text-lg">
                            ${new Date(r.date).getDate()}
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900">${r.pet_name}</h4>
                            <p class="text-indigo-600 text-sm font-medium">${r.type}</p>
                            <p class="text-gray-500 text-xs mt-1">${r.notes || ''}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">Pronto</span>
                    </div>
                `;
                remindersList.appendChild(item);
            });
        } catch (error) {
            remindersList.innerHTML = '<div class="text-center text-red-400">Error al cargar recordatorios.</div>';
        }
    }
});
