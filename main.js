(function(){
        // ---------- DATOS ----------
        let shortcuts = [];
        let nextId = 1;

        const STORAGE_KEY = "nexus_dashboard_shortcuts_v3";
        const COLOR_KEY = "nexus_font_color";
        const BG_KEY = "nexus_background_style";
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
        const toastMsg = document.getElementById("toastMsg");

        function showToast(msg, duration = 2100) {
            toastMsg.textContent = msg;
            toastMsg.style.opacity = "1";
            setTimeout(() => toastMsg.style.opacity = "0", duration);
        }

        // ---------- OBTENER ICONO REAL DEL SITIO (FAVICON) con múltiples fallbacks ----------
        function getRealFaviconFromDDG(url) {
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname;
                if (!domain) return null;
                return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
            } catch(e) { return null; }
        }
        
        function getRealFaviconFromGoogle(url) {
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname;
                if (!domain) return null;
                return `https://www.google.com/s2/favicons?domain=${domain}&sz=80`;
            } catch(e) { return null; }
        }
        
        function getRealFaviconFromFaviconKit(url) {
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname;
                if (!domain) return null;
                return `https://faviconkit.com/${domain}/144`;
            } catch(e) { return null; }
        }
        
        function getDirectFavicon(url) {
            try {
                const urlObj = new URL(url);
                return `${urlObj.origin}/favicon.ico`;
            } catch(e) { return null; }
        }
        
        function loadRealFavicon(imgElement, siteUrl) {
            if (!siteUrl) {
                setFallbackIcon(imgElement);
                return;
            }
            
            const sources = [
                () => getRealFaviconFromDDG(siteUrl),
                () => getRealFaviconFromGoogle(siteUrl),
                () => getRealFaviconFromFaviconKit(siteUrl),
                () => getDirectFavicon(siteUrl)
            ];
            
            let currentAttempt = 0;
            
            function tryNextSource() {
                if (currentAttempt >= sources.length) {
                    setFallbackIcon(imgElement);
                    return;
                }
                const src = sources[currentAttempt]();
                currentAttempt++;
                if (!src) {
                    tryNextSource();
                    return;
                }
                imgElement.src = src;
                const timeoutId = setTimeout(() => {
                    if (imgElement.src === src) {
                        tryNextSource();
                    }
                }, 2000);
                imgElement.onload = () => {
                    clearTimeout(timeoutId);
                    if (imgElement.naturalWidth > 0 && imgElement.naturalHeight > 0) {
                        return;
                    } else {
                        tryNextSource();
                    }
                };
                imgElement.onerror = () => {
                    clearTimeout(timeoutId);
                    tryNextSource();
                };
            }
            
            tryNextSource();
        }
        
        function setFallbackIcon(imgElement) {
            imgElement.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M4 6h16v2H4V6zm2-4h12v2H6V2zm16 4H2v14h20V6zm-6 6l-6 4V8l6 4z'/%3E%3C/svg%3E";
            imgElement.onerror = null;
        }
        
        // ---------- PERSISTENCIA Y MODELO ----------
        function persistShortcuts() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
        }
        
        function insertDefaultShortcuts() {
            const defaultItems = [
                { title: "Google", url: "https://www.google.com" },
                { title: "YouTube", url: "https://www.youtube.com" },
                { title: "GitHub", url: "https://github.com" },
                { title: "Gmail", url: "https://mail.google.com" },
                { title: "Wikipedia", url: "https://wikipedia.org" },
                { title: "Reddit", url: "https://reddit.com" }
            ];
            shortcuts = [];
            defaultItems.forEach(item => {
                shortcuts.push({
                    id: nextId++,
                    title: item.title,
                    url: item.url,
                });
            });
            persistShortcuts();
        }
        
        function loadShortcutsFromStorage() {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        shortcuts = parsed;
                        const maxId = Math.max(...shortcuts.map(s => s.id), 0);
                        nextId = maxId + 1;
                    } else {
                        insertDefaultShortcuts();
                    }
                } catch(e) {
                    insertDefaultShortcuts();
                }
            } else {
                insertDefaultShortcuts();
            }
            renderShortcuts();
        }
        
        function truncateUrl(url) {
            try {
                let clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
                return clean.length > 38 ? clean.substring(0,35)+"..." : clean;
            } catch(e) { return url; }
        }
        
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if(m === '&') return '&amp;';
                if(m === '<') return '&lt;';
                if(m === '>') return '&gt;';
                return m;
            });
        }
        
        function renderShortcuts() {
            container.innerHTML = "";
            shortcuts.forEach((item, idx) => {
                const card = document.createElement("div");
                card.className = "shortcut-card";
                card.setAttribute("draggable", "true");
                card.setAttribute("data-index", idx);
                
                card.innerHTML = `
                    <img class="favicon-img" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E" alt="favicon" data-site-url="${escapeHtml(item.url)}">
                    <div class="shortcut-title">${escapeHtml(item.title)}</div>
                    <div class="shortcut-url">${escapeHtml(truncateUrl(item.url))}</div>
                    <div class="card-actions">
                        <i class="fas fa-edit" data-action="edit" data-id="${item.id}" title="Editar"></i>
                        <i class="fas fa-trash-alt" data-action="delete" data-id="${item.id}" title="Eliminar"></i>
                    </div>
                `;
                
                const imgEl = card.querySelector(".favicon-img");
                loadRealFavicon(imgEl, item.url);
                
                card.addEventListener("click", (e) => {
                    if(e.target.closest(".card-actions")) return;
                    window.open(item.url, "_blank");
                });
                
                let dragStartIndex = null;
                card.addEventListener("dragstart", (e) => {
                    dragStartIndex = idx;
                    card.classList.add("dragging");
                    e.dataTransfer.setData("text/plain", idx);
                    e.dataTransfer.effectAllowed = "move";
                });
                card.addEventListener("dragend", (e) => {
                    card.classList.remove("dragging");
                    dragStartIndex = null;
                });
                card.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                });
                card.addEventListener("drop", (e) => {
                    e.preventDefault();
                    const targetIdx = parseInt(card.getAttribute("data-index"));
                    if (!isNaN(dragStartIndex) && dragStartIndex !== targetIdx && dragStartIndex >=0 && targetIdx >=0 && dragStartIndex < shortcuts.length && targetIdx < shortcuts.length) {
                        const moved = shortcuts[dragStartIndex];
                        shortcuts.splice(dragStartIndex, 1);
                        const newPos = targetIdx > dragStartIndex ? targetIdx - 1 : targetIdx;
                        shortcuts.splice(newPos, 0, moved);
                        persistShortcuts();
                        renderShortcuts();
                        showToast("Orden actualizado", 1000);
                    }
                });
                container.appendChild(card);
            });
            attachCardEvents();
        }
        
        function attachCardEvents() {
            document.querySelectorAll(".card-actions i").forEach(icon => {
                icon.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const action = icon.getAttribute("data-action");
                    const id = parseInt(icon.getAttribute("data-id"));
                    if (action === "delete") deleteShortcutById(id);
                    else if (action === "edit") editShortcutById(id);
                });
            });
        }
        
        function deleteShortcutById(id) {
            shortcuts = shortcuts.filter(s => s.id !== id);
            persistShortcuts();
            renderShortcuts();
            showToast("Acceso eliminado");
        }
        
        function editShortcutById(id) {
            const shortcut = shortcuts.find(s => s.id === id);
            if (shortcut) {
                let newTitle = prompt("Editar nombre:", shortcut.title);
                if (newTitle !== null && newTitle.trim() !== "") shortcut.title = newTitle.trim();
                let newUrlRaw = prompt("Editar URL (incluir http:// o https://):", shortcut.url);
                if (newUrlRaw !== null && newUrlRaw.trim() !== "") {
                    let cleaned = newUrlRaw.trim();
                    if (!cleaned.startsWith("http")) cleaned = "https://" + cleaned;
                    try {
                        new URL(cleaned);
                        shortcut.url = cleaned;
                        showToast("Acceso actualizado - El ícono se actualizará automáticamente");
                    } catch(e) {
                        showToast("URL inválida, no se modificó");
                    }
                }
                persistShortcuts();
                renderShortcuts();
            }
        }
        
        function addNewShortcut() {
            let title = newTitle.value.trim();
            let url = newUrl.value.trim();
            if (title === "") title = "Web";
            if (url === "") {
                showToast("Ingresa una URL válida", 1500);
                return;
            }
            if (!url.startsWith("http")) url = "https://" + url;
            try {
                new URL(url);
            } catch(e) {
                showToast("URL inválida (ej: https://example.com)", 1500);
                return;
            }
            const newId = nextId++;
            shortcuts.push({
                id: newId,
                title: title,
                url: url,
            });
            persistShortcuts();
            renderShortcuts();
            newTitle.value = "";
            newUrl.value = "";
            showToast(`"${title}" añadido · Icono real cargado`);
        }
        
        // ---------- RELOJ ----------
        function updateClock() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' });
            clockEl.textContent = timeStr;
        }
        setInterval(updateClock, 1000);
        updateClock();
        
        // ---------- CLIMA ----------
        function fetchWeather() {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    try {
                        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
                        if (!response.ok) throw new Error();
                        const data = await response.json();
                        if (data.current_weather) {
                            const temp = data.current_weather.temperature;
                            tempSpan.innerHTML = `${Math.round(temp)}°C`;
                            const weatherCode = data.current_weather.weathercode;
                            const iconElem = document.querySelector("#weatherWidget i");
                            if (iconElem) {
                                if (weatherCode <= 2) iconElem.className = "fas fa-sun";
                                else if (weatherCode <= 49) iconElem.className = "fas fa-cloud";
                                else if (weatherCode <= 69) iconElem.className = "fas fa-cloud-rain";
                                else if (weatherCode <= 79) iconElem.className = "fas fa-snowflake";
                                else iconElem.className = "fas fa-cloud-moon";
                            }
                        } else { tempSpan.innerHTML = "N/A"; }
                    } catch(e) { tempSpan.innerHTML = "Error"; }
                }, () => { tempSpan.innerHTML = "Sin ubicación"; });
            } else { tempSpan.innerHTML = "Geo no soportado"; }
        }
        fetchWeather();
        setInterval(fetchWeather, 600000);
        
        // ---------- PERSONALIZACIÓN VISUAL ----------
        function applyFontColorToAll(color) {
            document.body.style.color = color;
            const elements = document.querySelectorAll('body, .shortcut-title, .shortcut-url, .clock, .weather, .ctrl-btn, label, .add-form input, .add-form button, .card-actions i');
            elements.forEach(el => { if (el) el.style.color = color; });
            localStorage.setItem(COLOR_KEY, color);
        }
        
        function loadFontColor() {
            const saved = localStorage.getItem(COLOR_KEY);
            if (saved) {
                document.body.style.color = saved;
                fontColorPicker.value = saved;
                applyFontColorToAll(saved);
            } else {
                document.body.style.color = "#f0f3fa";
                fontColorPicker.value = "#f0f3fa";
            }
        }
        
        function setBackgroundImage(imageUrl) {
            if (!imageUrl) {
                document.body.style.backgroundImage = "none";
                document.body.style.backgroundColor = "#1e1f2c";
                localStorage.removeItem(BG_KEY);
                return;
            }
            document.body.style.backgroundImage = `url("${imageUrl.replace(/"/g, '&quot;')}")`;
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundPosition = "center";
            document.body.style.backgroundRepeat = "no-repeat";
            document.body.style.backgroundColor = "transparent";
            document.body.style.backgroundAttachment = "fixed";
            localStorage.setItem(BG_KEY, imageUrl);
        }
        
        function loadBackground() {
            const savedBg = localStorage.getItem(BG_KEY);
            if (savedBg) {
                setBackgroundImage(savedBg);
                bgUrlInput.value = savedBg;
            } else {
                document.body.style.backgroundImage = "none";
                document.body.style.backgroundColor = "#1e1f2c";
            }
        }
        
        bgFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (ev) => { setBackgroundImage(ev.target.result); bgUrlInput.value = "local image"; showToast("Fondo actualizado (imagen local)"); };
                reader.readAsDataURL(file);
            } else { alert("Selecciona una imagen válida"); }
        });
        
        setBgUrlBtn.addEventListener("click", () => {
            let url = bgUrlInput.value.trim();
            if (url) { setBackgroundImage(url); showToast("Fondo desde URL cargado"); } 
            else { alert("Ingresa URL de imagen"); }
        });
        
        resetBgBtn.addEventListener("click", () => { setBackgroundImage(null); bgUrlInput.value = ""; showToast("Fondo restablecido"); });
        applyFontColorBtn.addEventListener("click", () => { applyFontColorToAll(fontColorPicker.value); showToast("Color de texto actualizado"); });
        
        function loadPanelVisibility() {
            const visible = localStorage.getItem(CUSTOM_PANEL_VISIBLE) === "true";
            customizePanelDiv.style.display = visible ? "block" : "none";
        }
        toggleCustomizeBtn.addEventListener("click", () => {
            const willBeVisible = customizePanelDiv.style.display !== "block";
            customizePanelDiv.style.display = willBeVisible ? "block" : "none";
            localStorage.setItem(CUSTOM_PANEL_VISIBLE, willBeVisible);
        });
        
        resetDataBtn.addEventListener("click", () => {
            if (confirm("⚠️ Restablecer todos los accesos directos a los valores por defecto? (se perderán cambios)")) {
                shortcuts = []; nextId = 1;
                insertDefaultShortcuts();
                renderShortcuts();
                showToast("Accesos reiniciados con iconos originales");
            }
        });
        
        addBtn.addEventListener("click", addNewShortcut);
        newUrl.addEventListener("keypress", (e) => { if (e.key === "Enter") addNewShortcut(); });
        newTitle.addEventListener("keypress", (e) => { if (e.key === "Enter") addNewShortcut(); });
        
        loadShortcutsFromStorage();
        loadFontColor();
        loadBackground();
        loadPanelVisibility();
        
        window.addEventListener("dragstart", (e) => { if (!e.target.closest(".shortcut-card")) e.preventDefault(); });
    })();
