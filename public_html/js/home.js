// home.js (Atualizado para filtro no Servidor)

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ======================================================
// 1. CARREGAR CATEGORIAS DA BD
// ======================================================
async function loadCategories() {
  const select = document.getElementById("collectionCategory"); // Select do Modal
  const filterSelect = document.getElementById("categoryFilter"); // Select do Filtro Top 5
  
  try {
    const res = await fetch("controllers/categories.php");
    if (!res.ok) throw new Error("Erro na resposta do servidor");

    const categories = await res.json();

    // Preencher Select do MODAL (se existir)
    if (select) {
        select.innerHTML = '<option value="">-- Select Category --</option>';
        categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.id_collection_category; 
            option.textContent = cat.name;             
            select.appendChild(option);
        });
    }

    // Preencher Select do FILTRO (Home Page)
    if (filterSelect) {
        // Guardar valor atual caso já tenha sido selecionado
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">All categories</option>';
        categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.id_collection_category; 
            option.textContent = cat.name;             
            filterSelect.appendChild(option);
        });
        filterSelect.value = currentVal; // Repor valor
    }
    
    console.log("Categorias carregadas com sucesso!");

  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {

  // Carregar categorias
  loadCategories(); 

  // Vars
  const topGrid      = document.getElementById("topCollectionsGrid");
  const topChips     = document.querySelectorAll(".chip-top");
  const topSubtitle  = document.getElementById("topSubtitle");
  const catFilter    = document.getElementById("categoryFilter");
  const searchInput  = document.getElementById("searchInput");
  const searchForm   = document.getElementById("searchForm");

  // Scroll smooth
  const heroBtn = document.querySelector(".hero-btn");
  if (heroBtn) {
    heroBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector("#collections");
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Mini-carousels
  function initMiniCarousels(root = document) {
    $$(".mini-track", root).forEach((track) => {
      if (!track.dataset.cloned) {
        track.insertAdjacentHTML("beforeend", track.innerHTML);
        track.dataset.cloned = "1";
      }
    });
  }

  // ========================================================
  // BACKEND: carregar coleções (AGORA COM FILTRO NO URL)
  // ========================================================
  async function fetchCollections(mode = "featured", categoryId = "all", query = "", limit = 5) {
    
    // Construir URL base
    let url = "controllers/collections.php";

    // Adicionar parâmetros
    const params = new URLSearchParams();

    if (mode === "recent") {
        params.append("mine", "1");
    }
    
    // Só enviamos categoria se não for "all" e se não estivermos nas "minhas recentes"
    // (A não ser que queiras filtrar as tuas recentes também, o backend teria de estar preparado)
    if (categoryId !== "all" && mode !== "recent") {
        params.append("cat", categoryId);
    }
    
    if (query) {
        params.append("q", query);
    }

    // Limite (0 = sem limite)
    if (Number.isInteger(limit)) {
        params.append("limit", String(limit));
    }
      
    const res = await fetch(`${url}?${params.toString()}`);
    return await res.json();
  }

  function collectionCardHTML(c) {
    const img = c.cover_img ? c.cover_img : "img/collection-placeholder.jpg";
    const rateNumber = Number(c.rate ?? 0);
    const rate = Number.isFinite(rateNumber)
      ? (rateNumber % 1 === 0 ? rateNumber.toFixed(0) : rateNumber.toFixed(1))
      : "0";

    return `
      <div class="collection-card">
        <div style="position:relative;">
            <img src="${img}" alt="${c.name}" style="object-fit: cover; height: 200px; width: 100%; border-radius: 15px 15px 0 0;">
            <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:#ffd700; padding:4px 8px; border-radius:4px; font-weight:bold;">
              ⭐ ${rate}
            </span>
        </div>
        
        <h2>${c.name}</h2>
        <span class="category-badge" style="background:#eee; padding:2px 8px; border-radius:10px; font-size:12px;">
            ${c.category_name || "General"}
        </span>

        <p style="margin:5px 0;"><b>Owner:</b> ${c.owner_name || "Unknown"}</p>
        
        ${c.description ? `<p style="font-size:0.9em; color:#666;">${c.description.substring(0, 50)}...</p>` : ''}

        <div class="mini-carousel">
          <div class="mini-track">
            <div class="mini-item"><p style="font-size:10px;">Items loading...</p></div>
          </div>
        </div>

        <a href="collection.php?id=${c.id_collection}" class="btn primary btn-full">View Collection</a>

      </div>
    `;
  }

  // Função principal de Renderização
  // Cache dos resultados "featured" sem pesquisa para garantir que a pesquisa
  // apenas atua sobre o conjunto atualmente apresentado (Top 5 / por categoria).
  const featuredCache = new Map(); // chave: categoria selecionada

  async function renderTopCollections() {
    if (!topGrid) return;

    // 1. Descobrir Modo (Featured vs Recent)
    const activeChip = document.querySelector(".chip-top.active");
    const mode = activeChip ? activeChip.dataset.mode : "featured";

    // 2. Descobrir Categoria Selecionada
    const catId = catFilter ? catFilter.value : "all";
    
    // 3. Termo de pesquisa
    const query = searchInput ? searchInput.value.trim() : "";
    const isFeaturedMode = mode === "featured";

    try {
      // 3. Pedir dados ao servidor (ou usar cache quando em modo featured + pesquisa)
      let baseCollections;

      // Se estivermos em featured com pesquisa, usamos o conjunto base já apresentado
      // para evitar que a pesquisa introduza coleções fora do Top 5.
      if (isFeaturedMode && query) {
        const cacheKey = catId || "all";
        if (featuredCache.has(cacheKey)) {
          baseCollections = featuredCache.get(cacheKey);
        } else {
          // Cache vazia (primeira pesquisa imediatamente após mudar filtro):
          // buscar o conjunto base primeiro e armazenar.
          baseCollections = await fetchCollections(
            mode,
            catId,
            "",
            5
          );
          featuredCache.set(cacheKey, baseCollections);
        }
      } else {
        baseCollections = await fetchCollections(
          mode,
          catId,
          isFeaturedMode ? "" : query,
          mode === "all" ? 0 : 5
        );

        // Atualizar cache do featured sempre que carregamos o conjunto base
        if (isFeaturedMode && !query) {
          const cacheKey = catId || "all";
          featuredCache.set(cacheKey, baseCollections);
        }
      }

      const visibleCollections =
        isFeaturedMode && query
          ? baseCollections.filter((c) =>
              (c.name || "")
                .toLowerCase()
                .includes(query.toLowerCase())
            )
          : baseCollections;

      // Atualizar subtítulo
      if (topSubtitle) {
        if (mode === "featured") {
            topSubtitle.textContent = catId === "all"
                ? "Global featured collections from the whole site."
                : "Top rated collections in this category.";
        } else if (mode === "recent") {
            topSubtitle.textContent = "Your last created collections.";
        } else {
            topSubtitle.textContent = "All collections from the community.";
        }
      }

      if (!visibleCollections || !visibleCollections.length) {
        topGrid.innerHTML = `<p style="text-align:center; color:#777; padding:20px; width:100%;">No collections found for this filter.</p>`;
        return;
      }

      // 4. Desenhar HTML (sem limite quando o modo é "all")
      topGrid.innerHTML = visibleCollections.map(collectionCardHTML).join("");
      initMiniCarousels(topGrid);

    } catch (err) {
      console.error(err);
      topGrid.innerHTML = `<p style="text-align:center; color:#c00; padding:20px;">Error loading collections.</p>`;
    }
  }

  // --- EVENT LISTENERS ---

  // 1. Click nos Chips (Featured / Recent)
  topChips.forEach(chip => {
    chip.addEventListener("click", () => {
      topChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      
      // Se mudar para "Recent", podemos resetar o filtro ou mantê-lo. 
      // Para já, mantemos a lógica simples: recarrega tudo.
      renderTopCollections();
    });
  });

  // 2. Mudança no Select de Categoria
  if (catFilter) {
      catFilter.addEventListener("change", () => {
          renderTopCollections(); // Recarrega os dados do servidor
      });
  }
  
  // 3. Pesquisa no topo (barra da navbar)
  searchForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      renderTopCollections();
  });

  searchInput?.addEventListener("input", () => {
      // Só pesquisa ao apagar tudo ou quando existe texto suficiente
      if (searchInput.value.trim() === "" || searchInput.value.trim().length >= 2) {
          renderTopCollections();
      }
  });

  // Render inicial
  renderTopCollections();


  // ==========================================================
  // MODAL CRIAR COLEÇÃO (Mantido igual)
  // ==========================================================
  const openBtn   = document.getElementById("openModal");
  const openBtn2  = document.getElementById("openModalHome"); // Botão no wrapper
  const modal     = document.getElementById("createCollectionModal");
  const cancelBtn = document.getElementById("cancelCollection");
  const saveBtn   = document.getElementById("saveCollection");
  
  const dropZone  = document.getElementById("dropZoneCollection");
  const fileInput = document.getElementById("collectionImage");
  const preview   = document.getElementById("collectionPreview");
  const nameInput = document.getElementById("collectionName");
  const descInput = document.getElementById("collectionDescription");

  const openModal = (e) => {
    e?.preventDefault?.();
    if(modal) modal.classList.add("show");
  };
  const closeModal = () => {
    if(modal) modal.classList.remove("show");
  };

  openBtn?.addEventListener("click", openModal);
  openBtn2?.addEventListener("click", openModal);
  
  cancelBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  dropZone?.addEventListener("click", () => fileInput?.click());
  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer?.files?.length && fileInput) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event("change"));
    }
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) {
      if (preview && dropZone) {
        preview.style.display = "none";
        dropZone.style.display = "flex";
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (preview && dropZone) {
        preview.src = ev.target.result;
        preview.style.display = "block";
        dropZone.style.display = "none";
      }
    };
    reader.readAsDataURL(file);
  });

  // Gravar Coleção
  saveBtn?.addEventListener("click", () => {
    const name = nameInput?.value.trim();
    const description = descInput?.value.trim() || "";
    const categorySelect = document.getElementById("collectionCategory");
    if (!categorySelect) return;

    const categoryId = categorySelect.value;
    const file = fileInput?.files?.[0];

    if (!name) {
      alert("Please enter a collection name!");
      nameInput?.focus();
      return;
    }
    
    if (!categoryId) {
        alert("Please select a category!");
        categorySelect?.focus();
        return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("id_collection_category", categoryId); 
    formData.append("creation_date", new Date().toISOString().slice(0,10));
    
    if (file) {
      formData.append("cover_img", file);
    }

    fetch("controllers/collections.php", {
      method: "POST",
      body: formData 
    })
    .then(r => r.json())
    .then(resp => {
      if (!resp.ok) {
        alert("Error: " + (resp.error || "Failed to create collection"));
        return;
      }
      closeModal();
      
      nameInput.value = "";
      descInput.value = "";
      fileInput.value = "";
      if (categorySelect) categorySelect.value = ""; 
      
      if(preview) preview.style.display = 'none';
      if(dropZone) dropZone.style.display = 'flex';
      
      // Atualizar lista (mantendo o modo atual)
      renderTopCollections(); 
      alert("Collection created successfully! 📸");
    })
    .catch(err => {
        console.error(err);
        alert("Server error.");
    });
  });
  
    // ===== NOTIFICAÇÕES DE EVENTOS NA HOME =====
  const homeAlertsBox = document.getElementById("event-alerts-home");

  async function loadHomeEventAlerts() {
    if (!homeAlertsBox) return;

    try {
      const res = await fetch("controllers/event_notifications.php?days=365");

      if (res.status === 401) {
        homeAlertsBox.style.display = "none";
        return;
      }

      const text = await res.text();
      console.log("HOME NOTIFS RAW:", res.status, text);

      let events;
      try {
        events = JSON.parse(text);
      } catch (e) {
        console.error("JSON error (home notifications):", e);
        homeAlertsBox.style.display = "none";
        return;
      }

      if (!Array.isArray(events) || !events.length) {
        homeAlertsBox.style.display = "none";
        return;
      }

      const listHtml = events.map(ev => {
        const name  = ev.name || "Event";
        const date  = ev.event_date || "";
        const days  = typeof ev.days_left !== "undefined" ? ev.days_left : null;
        const where = ev.location || "";

        let info = date;
        if (days !== null) {
          if (days === 0) info = "Today";
          else if (days === 1) info = "In 1 day";
          else info = `In ${days} days`;
        }

        const locText = where ? ` • ${where}` : "";

        return `<li><strong>${name}</strong> – ${info}${locText}</li>`;
      }).join("");

      homeAlertsBox.innerHTML = `
        <p><strong>Upcoming events you're participating in:</strong></p>
        <ul class="event-alerts-list">
          ${listHtml}
        </ul>
      `;
    } catch (err) {
      console.error("Error loading home notifications:", err);
      homeAlertsBox.style.display = "none";
    }
  }

  loadHomeEventAlerts();

});