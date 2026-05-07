 // ---------- MODELO Y PERSISTENCIA ----------
    let shortcuts = [];  // cada item: { id, title, url, favicon }
    let nextId = 1;

    // Claves localStorage
    const STORAGE_KEY = "nexus_dashboard_shortcuts";
    const COLOR_KEY = "nexus_font_color";
    const BG_KEY = "nexus_background_style";  // almacenamos url o null para default
    const CUSTOM_PANEL_VISIBLE = "nexus_panel_visible";

    // Elementos DOM
    const container = document.getElementById("shortcutsContainer");
    const clockEl = document.getElementById("clockDisplay");
    const tempSpan = document.getElementById("tempText");
    const fontColorPicker = document.getElementById("fontColorPicker");
    const applyFontColorBtn = document.getElementById("applyFontColor");
    const bgUrlInput = document.getElementById("bgUrlInput");
    const setBgUrlBtn = document.getElementById("setBgUrlBtn");
    const bgFileInput = document.getElementById("bgFileInput");
    const resetBgBtn = document.getElementById("resetBgBtn");
    const addBtn = document.getElementById("addShortcutBtn");
    const newTitle = document.getElementById("newShortcutTitle");
    const newUrl = document.getElementById("newShortcutUrl");
    const toggleCustomizeBtn = document.getElementById("toggleCustomizeBtn");
    const customizePanelDiv = document.getElementById("customizePanel");
    const resetDataBtn = document.getElementById("resetDataBtn");

    // Helper para obtener favicon (usamos Google S2 + fallback)
    function getFaviconUrl(url) {
        try {
            let urlObj = new URL(url);
            let domain = urlObj.origin;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch(e) {
            return "https://www.google.com/s2/favicons?domain=default&sz=64";
        }
    }

    // Guardar shortcuts en localStorage
    function persistShortcuts() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
    }

    // Cargar shortcuts
    function loadShortcutsFromStorage() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) {
            try {
                shortcuts = JSON.parse(stored);
                if(shortcuts.length === 0) {
                    insertDefaultShortcuts();
                } else {
                    // asegurar ids numéricos
                    if(shortcuts.length) nextId = Math.max(...shortcuts.map(s=>s.id),0)+1;
                }
            } catch(e) { insertDefaultShortcuts(); }
        } else {
            insertDefaultShortcuts();
        }
        renderShortcuts();
    }

    function insertDefaultShortcuts() {
        shortcuts = [
            { id: nextId++, title: "Google", url: "https://www.google.com", favicon: "https://www.google.com/s2/favicons?domain=google.com" },
            { id: nextId++, title: "YouTube", url: "https://www.youtube.com", favicon: "https://www.google.com/s2/favicons?domain=youtube.com" },
            { id: nextId++, title: "GitHub", url: "https://github.com", favicon: "https://www.google.com/s2/favicons?domain=github.com" },
            { id: nextId++, title: "Gmail", url: "https://mail.google.com", favicon: "https://www.google.com/s2/favicons?domain=mail.google.com" }
        ];
        persistShortcuts();
    }

    // Renderizar los accesos con drag & drop nativo HTML5 (simplificado, reordenable)
    let dragSrcIndex = null;
    function renderShortcuts() {
        container.innerHTML = "";
        shortcuts.forEach((item, idx) => {
            const card = document.createElement("div");
            card.className = "shortcut-card";
            card.setAttribute("draggable", "true");
            card.setAttribute("data-index", idx);
            card.innerHTML = `
                <img class="favicon-img" src="${item.favicon}" alt="favicon" onerror="this.src='https://www.google.com/s2/favicons?domain=default&sz=64'">
                <div class="shortcut-title">${escapeHtml(item.title)}</div>
                <div class="shortcut-url">${truncateUrl(item.url)}</div>
                <div class="card-actions">
                    <i class="fas fa-edit" data-action="edit" data-id="${item.id}" title="Editar"></i>
                    <i class="fas fa-trash-alt" data-action="delete" data-id="${item.id}" title="Eliminar"></i>
                </div>
            `;
            // Abrir al hacer clic en la tarjeta (excepto en iconos)
            card.addEventListener("click", (e) => {
                if(e.target.closest(".card-actions")) return;
                window.open(item.url, "_blank");
            });
            // Drag & drop events
            card.addEventListener("dragstart", (e) => {
                dragSrcIndex = idx;
                card.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", idx);
            });
            card.addEventListener("dragend", (e) => {
                card.classList.remove("dragging");
            });
            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            });
            card.addEventListener("drop", (e) => {
                e.preventDefault();
                if(dragSrcIndex !== null && dragSrcIndex !== idx) {
                    const movedItem = shortcuts[dragSrcIndex];
                    shortcuts.splice(dragSrcIndex, 1);
                    const newIndex = idx > dragSrcIndex ? idx - 1 : idx;
                    shortcuts.splice(newIndex, 0, movedItem);
                    persistShortcuts();
                    renderShortcuts();
                }
                dragSrcIndex = null;
            });
            container.appendChild(card);
        });
        attachCardActions();
    }

    function attachCardActions() {
        document.querySelectorAll(".card-actions i").forEach(icon => {
            icon.addEventListener("click", (e) => {
                e.stopPropagation();
                const action = icon.getAttribute("data-action");
                const id = parseInt(icon.getAttribute("data-id"));
                if(action === "delete") {
                    deleteShortcutById(id);
                } else if(action === "edit") {
                    editShortcutById(id);
                }
            });
        });
    }

    function deleteShortcutById(id) {
        shortcuts = shortcuts.filter(s => s.id !== id);
        persistShortcuts();
        renderShortcuts();
    }

    function editShortcutById(id) {
        const shortcut = shortcuts.find(s => s.id === id);
        if(shortcut) {
            const newTitle = prompt("Editar nombre:", shortcut.title);
            if(newTitle && newTitle.trim() !== "") shortcut.title = newTitle.trim();
            const newUrl = prompt("Editar URL:", shortcut.url);
            if(newUrl && newUrl.trim() !== "") {
                shortcut.url = newUrl.trim();
                shortcut.favicon = getFaviconUrl(shortcut.url);
            }
            persistShortcuts();
            renderShortcuts();
        }
    }

    function addNewShortcut() {
        let title = newTitle.value.trim();
        let url = newUrl.value.trim();
        if(title === "") title = "Web";
        if(url === "") return alert("Escribe una URL válida");
        if(!url.startsWith("http")) url = "https://" + url;
        try {
            new URL(url);
        } catch(e) {
            alert("URL inválida");
            return;
        }
        const newId = nextId++;
        const fav = getFaviconUrl(url);
        shortcuts.push({ id: newId, title: title, url: url, favicon: fav });
        persistShortcuts();
        renderShortcuts();
        newTitle.value = "";
        newUrl.value = "";
    }

    function truncateUrl(url) {
        let clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
        return clean.length > 30 ? clean.substring(0,27)+"..." : clean;
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if(m === '&') return '&amp;';
            if(m === '<') return '&lt;';
            if(m === '>') return '&gt;';
            return m;
        });
    }

    // ---------- HORA EN TIEMPO REAL ----------
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second:'2-digit' });
        clockEl.textContent = timeStr;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ---------- WEATHER (geolocalización) ----------
    let weatherInterval = null;
    function fetchWeather() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    // API gratuita: open-meteo (sin clave, alta tasa)
                    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
                    const data = await response.json();
                    if (data.current_weather) {
                        const temp = data.current_weather.temperature;
                        tempSpan.innerHTML = `${Math.round(temp)}°C`;
                        // icono dinámico simple
                        const weatherCode = data.current_weather.weathercode;
                        const iconElem = document.querySelector("#weatherWidget i");
                        if(iconElem) {
                            if(weatherCode <= 3) iconElem.className = "fas fa-sun";
                            else if(weatherCode <= 49) iconElem.className = "fas fa-cloud";
                            else if(weatherCode <= 69) iconElem.className = "fas fa-cloud-rain";
                            else if(weatherCode <= 79) iconElem.className = "fas fa-snowflake";
                            else iconElem.className = "fas fa-cloud-moon";
                        }
                    } else {
                        tempSpan.innerHTML = "N/A";
                    }
                } catch(e) { tempSpan.innerHTML = "⚠️ Error"; }
            }, () => {
                tempSpan.innerHTML = "Sin ubicación";
            });
        } else {
            tempSpan.innerHTML = "Geo no soportado";
        }
    }
    fetchWeather();
    setInterval(fetchWeather, 600000); // cada 10 min

    // ---------- PERSONALIZACIÓN: color fuente, fondo imagen (local/url) ----------
    function applyFontColor(color) {
        document.body.style.color = color;
        // También todos los textos dentro de shortcut etc heredan, pero algunos elementos con background extra los forzamos
        const cards = document.querySelectorAll('.shortcut-title, .shortcut-url, .clock, .weather, .ctrl-btn, label');
        cards.forEach(el => { if(el.style.color !== 'inherit') el.style.color = color; });
        document.body.style.setProperty('color', color);
        localStorage.setItem(COLOR_KEY, color);
    }

    function loadFontColor() {
        const savedColor = localStorage.getItem(COLOR_KEY);
        if(savedColor) {
            document.body.style.color = savedColor;
            fontColorPicker.value = savedColor;
        } else {
            document.body.style.color = "#f0f3fa";
            fontColorPicker.value = "#f0f3fa";
        }
    }

    function setBackgroundImage(imageUrl) {
        if(!imageUrl) {
            document.body.style.backgroundImage = "none";
            document.body.style.backgroundColor = "#1e1f2c";
            localStorage.removeItem(BG_KEY);
            return;
        }
        document.body.style.backgroundImage = `url(${imageUrl})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundColor = "transparent";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed";
        localStorage.setItem(BG_KEY, imageUrl);
    }

    function loadBackground() {
        const savedBg = localStorage.getItem(BG_KEY);
        if(savedBg) {
            setBackgroundImage(savedBg);
            bgUrlInput.value = savedBg;
        } else {
            document.body.style.backgroundImage = "none";
            document.body.style.backgroundColor = "#1e1f2c";
        }
    }

    // manejo archivo local
    bgFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if(file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const imgData = ev.target.result;
                setBackgroundImage(imgData);
                bgUrlInput.value = "local-img";
            };
            reader.readAsDataURL(file);
        } else alert("Selecciona una imagen válida");
    });

    setBgUrlBtn.addEventListener("click", () => {
        let url = bgUrlInput.value.trim();
        if(url) setBackgroundImage(url);
        else alert("Ingresa una URL de imagen");
    });

    resetBgBtn.addEventListener("click", () => {
        setBackgroundImage(null);
        bgUrlInput.value = "";
        document.body.style.backgroundColor = "#1e1f2c";
    });

    applyFontColorBtn.addEventListener("click", () => {
        const newColor = fontColorPicker.value;
        applyFontColor(newColor);
    });

    // Toggle personalización + persistencia
    function loadPanelVisibility() {
        const isVisible = localStorage.getItem(CUSTOM_PANEL_VISIBLE) === "true";
        customizePanelDiv.style.display = isVisible ? "block" : "none";
    }
    toggleCustomizeBtn.addEventListener("click", () => {
        const isVisible = customizePanelDiv.style.display !== "block";
        customizePanelDiv.style.display = isVisible ? "block" : "none";
        localStorage.setItem(CUSTOM_PANEL_VISIBLE, isVisible);
    });
    
    // reset accesos a por defecto
    resetDataBtn.addEventListener("click", () => {
        if(confirm("¿Reiniciar todos los accesos directos a los valores por defecto?")) {
            shortcuts = [];
            nextId = 1;
            insertDefaultShortcuts();
            renderShortcuts();
        }
    });
    
    addBtn.addEventListener("click", addNewShortcut);
    // Permitir enter en campos
    newUrl.addEventListener("keypress", (e) => { if(e.key === "Enter") addNewShortcut(); });
    newTitle.addEventListener("keypress", (e) => { if(e.key === "Enter") addNewShortcut(); });

    // Inicializar todo
    loadShortcutsFromStorage();
    loadFontColor();
    loadBackground();
    loadPanelVisibility();
    // evitar que drag de imagen rompa
    window.addEventListener("dragstart", (e) => { if(!e.target.closest(".shortcut-card")) e.preventDefault(); });
