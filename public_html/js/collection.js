document.addEventListener("DOMContentLoaded", () => {
    console.log("collection.js carregado!");

    // 1. Seletores e Variáveis Globais do Script
    const collectionId = new URLSearchParams(window.location.search).get("id");
    const itemsContainer = document.getElementById("itemsContainer");
    const categoryFilter = document.getElementById("categoryFilter");
    const sortSelect = document.getElementById("sortSelect");
    const searchInput = document.getElementById("q") || document.getElementById("searchInput");
    
    // Variáveis para o Modal e Upload
    const modal = document.getElementById("addItemModal");
    const addItemBtn = document.querySelector(".add-item-btn");
    const cancelBtn = document.getElementById("cancelItem");
    const form = document.getElementById("addItemForm");
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("itemImage");
    
    let cachedItems = null;
    let uploadedImageFile = null; 

    // =====================================================
    // 1) CARREGAR E RENDERIZAR ITENS
    // =====================================================
    async function loadCollectionItems(forceReload = false) {
        if (forceReload || !Array.isArray(cachedItems)) {
            try {
                const r = await fetch(`controllers/items.php?collection=${collectionId}`);
                cachedItems = await r.json();
            } catch (err) {
                console.error("Erro ao carregar:", err);
                return;
            }
        }

        const items = Array.isArray(cachedItems) ? [...cachedItems] : [];
        
        // --- FILTROS ---
        let selectedCat = categoryFilter?.value ?? "all";
        const query = (searchInput?.value || "").trim().toLowerCase();
        
        let filteredItems = items.filter(it => {
            const matchesCat = (selectedCat === "all" || it.id_item_category == selectedCat);
            const matchesSearch = (it.name || "").toLowerCase().includes(query) || 
                                 (it.description || "").toLowerCase().includes(query);
            return matchesCat && matchesSearch;
        });

        // --- ORDENAÇÃO ---
        switch (sortSelect?.value) {
            case "ratingDesc": filteredItems.sort((a, b) => (b.importance || 0) - (a.importance || 0)); break;
            case "ratingAsc":  filteredItems.sort((a, b) => (a.importance || 0) - (b.importance || 0)); break;
            case "priceAsc":   filteredItems.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
            case "priceDesc":  filteredItems.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
            case "weightAsc":  filteredItems.sort((a, b) => (a.weight || 0) - (b.weight || 0)); break;
            case "weightDesc": filteredItems.sort((a, b) => (b.weight || 0) - (a.weight || 0)); break;
        }

        itemsContainer.innerHTML = "";
        if (!filteredItems.length) {
            itemsContainer.innerHTML = "<p>No items found.</p>";
            return;
        }

        let html = "";
        filteredItems.forEach(it => {
            const colId = (typeof ID_COLLECTION !== 'undefined') ? ID_COLLECTION : collectionId;
            html += `
                <div class="item-card" data-id="${it.id_item}">
                    <div class="item-img-wrapper" style="position: relative;">
                        <img src="${it.img ? it.img : 'img/item-placeholder.jpg'}" alt="${it.name}">
                        
                        <div class="wishlist-badge-container">
                            <button class="wishlist-heart ${it.in_wishlist > 0 ? 'liked' : ''}" data-id="${it.id_item}">
                                ${it.in_wishlist > 0 ? '❤' : '♡'}
                            </button>
                            <span class="wishlist-count" id="count-${it.id_item}">${it.wishlist_count || 0}</span>
                        </div>
                    </div>

                    <div class="item-details">
                        <h3>${it.name}</h3>
                        <div class="item-category-badge">${it.category_name || "—"}</div>
                        <p>${it.description ?? ''}</p>
                        <div class="item-info">
                            <span>⭐ ${it.importance}/10</span>
                            <span>💰 ${it.price}€</span>
                            <span>⚖️ ${it.weight}g</span>
                        </div>
                    </div>

                    <div class="item-actions">
                        <a href="item.php?id=${it.id_item}&col=${colId}" class="btn-details">View</a>
                        ${(typeof IS_OWNER !== 'undefined' && IS_OWNER) ? `
                            <button class="btn-delete-item" data-id="${it.id_item}">🗑️</button>
                        ` : ""}
                    </div>
                </div>`;
        });
        itemsContainer.innerHTML = html;
    }

    // =====================================================
    // 2) LÓGICA DE WISHLIST (LIKE)
    // =====================================================
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest(".wishlist-heart");
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        // Verifica se o utilizador está logado (usando a tua variável global PHP)
        if (typeof IS_LOGGED_IN !== 'undefined' && !IS_LOGGED_IN) {
            alert("Please log in to manage your wishlist.");
            return;
        }

        const itemId = btn.dataset.id;
        const isLiked = btn.classList.contains("liked");
        const action = isLiked ? "remove" : "add";

        try {
            const res = await fetch("controllers/item_wishlist.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_item: itemId, action: action })
            });
            const data = await res.json();

            if (data.ok) {
                // 1. Atualizar visual do coração
                btn.classList.toggle("liked", data.in_wishlist);
                btn.textContent = data.in_wishlist ? "❤" : "♡";

                // 2. Atualizar o número no ecrã com o valor REAL do servidor
                const countSpan = document.getElementById(`count-${itemId}`);
                if (countSpan) {
                    // Usamos 'total_wishlists' que é o nome que definiste no PHP
                    countSpan.textContent = data.total_wishlists;
                }

                // 3. Atualizar o cache local para que ao filtrar/ordenar o valor se mantenha
                if (cachedItems) {
                    const item = cachedItems.find(i => i.id_item == itemId);
                    if (item) {
                        item.in_wishlist = data.in_wishlist ? 1 : 0;
                        // No cache chamamos 'wishlist_count' para bater certo com o ItemDAL
                        item.wishlist_count = data.total_wishlists;
                    }
                }
            }
            
        } catch (err) {
            console.error("Erro na wishlist:", err);
        }
    });

    // =====================================================
    // 3) GESTÃO DE IMAGEM (DROPZONE)
    // =====================================================
    dropZone?.addEventListener("click", () => fileInput.click());

    fileInput?.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;
        uploadedImageFile = file;

        const reader = new FileReader();
        reader.onload = e => {
            dropZone.innerHTML = `<img src="${e.target.result}" style="max-width:100%; border-radius:8px; max-height:150px;">`;
        };
        reader.readAsDataURL(file);
    });

    // =====================================================
    // 4) ENVIO DO FORMULÁRIO (ADD ITEM)
    // =====================================================
    form?.addEventListener("submit", async e => {
        e.preventDefault();
        const fd = new FormData(form);
        fd.append("id_collection", collectionId);

        if (uploadedImageFile) {
            fd.set("image", uploadedImageFile);
        }

        try {
            const resp = await fetch("controllers/items.php", { method: "POST", body: fd });
            const data = await resp.json();

            if (data.success) {
                alert("Item added!");
                modal.classList.remove("show");
                form.reset();
                dropZone.innerHTML = `<p>Drag & drop an image here, or click to select</p>`;
                uploadedImageFile = null;
                loadCollectionItems(true); // Forçar reload da lista
            } else {
                alert("Error adding item!");
            }
        } catch (err) {
            console.error("Erro no envio:", err);
        }
    });

    // =====================================================
    // 5) FILTROS, VISTAS E APAGAR
    // =====================================================
    addItemBtn?.addEventListener("click", () => modal.classList.add("show"));
    cancelBtn?.addEventListener("click", () => modal.classList.remove("show"));

    // Grid/List toggle
    const viewButtons = document.querySelectorAll(".btn-view");
    viewButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            viewButtons.forEach(b => b.setAttribute("aria-pressed", "false"));
            btn.setAttribute("aria-pressed", "true");
            itemsContainer.classList.toggle("grid-view", view === "grid");
            itemsContainer.classList.toggle("list-view", view === "list");
        });
    });

    categoryFilter?.addEventListener("change", () => loadCollectionItems());
    sortSelect?.addEventListener("change", () => loadCollectionItems());
    searchInput?.addEventListener("input", () => loadCollectionItems());

    // Apagar Item
    document.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("btn-delete-item")) return;
        if (!confirm("Are you sure you want to delete this item from this collection?")) return;
        const idItem = e.target.dataset.id;
        const resp = await fetch("controllers/item_delete.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_item: idItem, id_collection: collectionId })
        });
        const data = await resp.json();
        if (data.ok) loadCollectionItems(true);
    });

    // Início
    loadCollectionItems();
});