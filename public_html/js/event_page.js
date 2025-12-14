document.addEventListener("DOMContentLoaded", () => {
  const joinBtn        = document.getElementById("d-join");
  const participateBtn = document.getElementById("d-participate");
  const reviewBtn      = document.getElementById("d-review");

  const participateModal = document.getElementById("participateModal");
  const pCollections     = document.getElementById("p-collections");
  const pItems           = document.getElementById("p-items");
  const pCancel          = document.getElementById("p-cancel");
  const pConfirm         = document.getElementById("p-confirm");

  const reviewForm   = document.getElementById("reviewForm");
  const reviewClose  = document.getElementById("review-close");
  const rvStars      = reviewForm ? reviewForm.querySelectorAll(".star") : [];
  const rvComment    = document.getElementById("rv-comment");
  const rvCancel     = document.getElementById("rv-cancel");
  const rvSubmit     = document.getElementById("rv-submit");
  const rvCollection = document.getElementById("rv-collection");

  // id do evento vem dos data-id dos botões
  const eventId = joinBtn?.dataset.id || reviewBtn?.dataset.id;

  let currentRating = 0;

  // coleções escolhidas no modal PARTICIPATE
  let selectedParticipateCollections = new Set();

  // ==========================
  //   INTEREST (Interested)
  // ==========================
  async function refreshInterest() {
    if (!joinBtn || !eventId) return;
    try {
      const res  = await fetch(`controllers/check_interest.php?event=${eventId}`);
      const data = await res.json();
      if (data.interested) {
        joinBtn.classList.add("active");
        joinBtn.textContent = "Interested ✓";
      } else {
        joinBtn.classList.remove("active");
        joinBtn.textContent = "Interested";
      }
    } catch (err) {
      console.error(err);
    }
  }

 joinBtn?.addEventListener("click", async () => {
  if (!eventId) return;

  // 🔒 se não estiver logado
  if (typeof CURRENT_USER_ID === "undefined" || CURRENT_USER_ID === null) {
    alert("Login required.");
    return;
  }

  const r = await fetch("controllers/event_Interested.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_event: eventId })
  });

  const resp = await r.json();
  if (resp.success) refreshInterest();
});


  refreshInterest();

  // ==========================
  //   PARTICIPATE – VÁRIAS COLEÇÕES + ITENS
  // ==========================
  participateBtn?.addEventListener("click", () => {
    if (!eventId) return;

    // reset ao abrir
    selectedParticipateCollections = new Set();
    pCollections.innerHTML = "<p class='muted'>Loading...</p>";
    pItems.innerHTML = "";

    participateModal.classList.add("show");
    participateModal.setAttribute("aria-hidden", "false");

    loadUserCollectionsForParticipate();
  });

  pCancel?.addEventListener("click", () => {
    participateModal.classList.remove("show");
    participateModal.setAttribute("aria-hidden", "true");
  });

  participateModal?.addEventListener("click", e => {
    if (e.target === participateModal) {
      participateModal.classList.remove("show");
      participateModal.setAttribute("aria-hidden", "true");
    }
  });

  // carrega coleções com CHECKBOX (podes escolher várias)
  async function loadUserCollectionsForParticipate() {
    try {
      const res = await fetch("controllers/collections.php?mine=1");
      if (res.status === 401) {
        pCollections.innerHTML = "<p class='muted'>Login required.</p>";
        pItems.innerHTML = "";
        if (pConfirm) pConfirm.style.display = "none";
        return;
      }
      
      if (pConfirm) pConfirm.style.display = "";
      const cols = await res.json();
      if (!cols.length) {
        pCollections.innerHTML = "<p class='muted'>No collections.</p>";
        return;
      }

      pCollections.innerHTML = cols.map(c => `
        <label class="pick-card" data-col="${c.id_collection}">
          <input type="checkbox">
          <span>${c.name}</span>
        </label>
      `).join("");

      // listeners de seleção de coleções
      pCollections.querySelectorAll(".pick-card").forEach(card => {
        const checkbox = card.querySelector("input");
        const idCol    = card.dataset.col;

        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedParticipateCollections.add(idCol);
            loadItemsForParticipate(idCol);
          } else {
            selectedParticipateCollections.delete(idCol);
            removeParticipateItemsBlock(idCol);
          }
        });
      });
    } catch (err) {
      console.error(err);
      pCollections.innerHTML = "<p class='muted'>Erro a carregar coleções.</p>";
    }
  }

  // cria/actualiza bloco de itens para UMA coleção
  async function loadItemsForParticipate(idCol) {
    // se já existir bloco desta coleção, remove para recriar
    removeParticipateItemsBlock(idCol);

    try {
      const res   = await fetch(`controllers/items.php?collection=${idCol}`);
      const items = await res.json();

      const block = document.createElement("div");
      block.classList.add("participate-items-block");
      block.dataset.col = idCol;

      if (!items.length) {
        block.innerHTML = `
          <h4>Items from collection ${idCol}</h4>
          <p class="muted">Esta coleção não tem itens.</p>
        `;
      } else {
        block.innerHTML = `
          <h4>Items from collection ${idCol}</h4>
          <div class="mini-grid">
            ${items.map(i => `
              <label class="mini-card">
                <input type="checkbox" value="${i.id_item}" data-col="${idCol}">
                <span>${i.name}</span>
              </label>
            `).join("")}
          </div>
        `;
      }

      pItems.appendChild(block);
    } catch (err) {
      console.error(err);
    }
  }

  function removeParticipateItemsBlock(idCol) {
    const block = pItems.querySelector(
      `.participate-items-block[data-col="${idCol}"]`
    );
    if (block) block.remove();
  }

  // Confirmar participação
  pConfirm?.addEventListener("click", async () => {
    if (!eventId) {
      alert("Erro: nenhum evento selecionado.");
      return;
    }

    const collections = [...selectedParticipateCollections];
    if (!collections.length) {
      alert("Escolhe pelo menos uma coleção.");
      return;
    }

    // todos os itens marcados, com a coleção de origem
    const items = Array.from(
      pItems.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => ({
      id_item: cb.value,
      id_collection: cb.dataset.col
    }));

    const payload = {
      id_event: eventId,
      collections,
      items
    };

    console.log("PAYLOAD A ENVIAR:", payload);

    try {
      const r    = await fetch("controllers/event_participate.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await r.text();
      console.log("PARTICIPATE POST:", r.status, text);

      let resp;
      try {
        resp = JSON.parse(text);
      } catch (e) {
        console.error("JSON PARSE ERROR (participate):", e);
        alert("Erro ao processar resposta do servidor.");
        return;
      }

      if (resp.ok) {
        alert("Participação guardada com sucesso!");
        participateModal.classList.remove("show");
        participateModal.setAttribute("aria-hidden", "true");
        window.location.reload();
      } else {
        console.error("RESP ERRO:", resp);
        alert("Erro ao guardar participação: " + (resp.err || "desconhecido"));
      }
    } catch (err) {
      console.error(err);
      alert("Erro de rede ao guardar participação.");
    }
  });

  // ==========================
  //   RATING
  // ==========================
  reviewBtn?.addEventListener("click", async () => {
    if (reviewBtn.disabled || !eventId) return;

    currentRating = 0;
    rvComment.value = "";
    rvStars.forEach(s => s.classList.remove("selected"));

    rvCollection.innerHTML = "<option value=''>Loading...</option>";
    try {
      const res  = await fetch(`controllers/event_rate.php?event=${eventId}`);
      const text = await res.text();
      console.log("RATE GET raw:", res.status, text);

      if (res.status === 401) {
        alert("Precisas de iniciar sessão para avaliar.");
        return;
      }

      const cols = JSON.parse(text);

      if (!Array.isArray(cols) || !cols.length) {
        rvCollection.innerHTML =
          "<option value=''>No collections for this event</option>";
      } else {
        rvCollection.innerHTML = cols
          .map(c => `<option value="${c.id_collection}">${c.name}</option>`)
          .join("");
      }
    } catch (err) {
      console.error(err);
      rvCollection.innerHTML =
        "<option value=''>Error loading collections</option>";
    }

    reviewForm.classList.add("show");
    reviewForm.setAttribute("aria-hidden", "false");
  });

  rvStars.forEach(star => {
    star.addEventListener("click", () => {
      currentRating = Number(star.dataset.value);
      rvStars.forEach(s => {
        const val = Number(s.dataset.value);
        s.classList.toggle("selected", val <= currentRating);
      });
    });
  });

  function closeReview() {
    reviewForm.classList.remove("show");
    reviewForm.setAttribute("aria-hidden", "true");
  }

  reviewClose?.addEventListener("click", closeReview);
  rvCancel?.addEventListener("click", closeReview);
  reviewForm?.addEventListener("click", e => {
    if (e.target === reviewForm) closeReview();
  });

  rvSubmit?.addEventListener("click", async () => {
    if (!eventId) {
      alert("Erro: nenhum evento selecionado.");
      return;
    }
    const idCollection = rvCollection.value;
    if (!idCollection) {
      alert("Escolhe uma coleção.");
      return;
    }
    if (!currentRating) {
      alert("Escolhe quantas estrelas queres dar.");
      return;
    }

    const payload = {
      id_event: eventId,
      id_collection: idCollection,
      rate: currentRating,
      comment: rvComment.value.trim()
    };

    try {
      const r    = await fetch("controllers/event_rate.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      console.log("RATE POST:", r.status, text);
      const resp = JSON.parse(text);

      if (resp.ok) {
        alert("Obrigado pela avaliação!");
        reviewBtn.textContent = "Rated ✓";
        reviewBtn.disabled = true;
        closeReview();
      } else {
        alert("Não participou neste Evento");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de rede ao enviar avaliação.");
    }
  });
  
// ==========================
//   OWNER: EDIT / DELETE
// ==========================
const editBtn   = document.getElementById("ev-owner-edit");
const delBtn    = document.getElementById("ev-owner-delete");
const EVENT_ID  = Number(document.body.dataset.eventId);

// modal edit
const editModal  = document.getElementById("editEventModal");
const editClose  = document.getElementById("edit-close");
const editCancel = document.getElementById("edit-cancel");
const editSave   = document.getElementById("edit-save");

const editName = document.getElementById("edit-name");
const editDate = document.getElementById("edit-date");
const editDesc = document.getElementById("edit-desc");
const editLoc  = document.getElementById("edit-loc");

function openEditModal() {
  if (!editModal) return;

  // preencher com valores atuais do DOM (sem precisar de novo fetch)
  const title = document.querySelector(".events-title")?.textContent?.trim() || "";
  const desc  = document.querySelector(".ev-desc-full")?.textContent?.trim() || "";
  const sub   = document.querySelector(".ev-subtitle")?.textContent || "";

  // tenta extrair data YYYY-MM-DD do subtitle
  const dateMatch = sub.match(/\d{4}-\d{2}-\d{2}/);
  const dateOnly  = dateMatch ? dateMatch[0] : "";

  editName.value = title;
  editDesc.value = desc;

  // para datetime-local: se só tens data, metemos 12:00 (não quebra)
  if (dateOnly) editDate.value = `${dateOnly}T12:00`;

  // location: tenta apanhar depois do 📍
  const locMatch = sub.split("📍")[1];
  editLoc.value = locMatch ? locMatch.trim() : "";

  editModal.classList.add("show");
  editModal.setAttribute("aria-hidden", "false");
}

function closeEditModal() {
  editModal?.classList.remove("show");
  editModal?.setAttribute("aria-hidden", "true");
}

editBtn?.addEventListener("click", openEditModal);
editClose?.addEventListener("click", closeEditModal);
editCancel?.addEventListener("click", closeEditModal);

editModal?.addEventListener("click", (e) => {
  async function openEditEvent(idEvent) {
  editingEventId = idEvent;

  // abrir modal
  eventForm.classList.add("show");
  eventForm.setAttribute("aria-hidden", "false");

  // meter min date (o teu setMinTodayOnEventDate)
  setMinTodayOnEventDate();

  // carregar lista de coleções do user no form
  await loadCollectionsForForm();

  // ir buscar coleções do evento e marcar
  const evCols = await fetch(`controllers/event_collections.php?event=${idEvent}`).then(r => r.json());
  selectedCollections.clear();
  evCols.forEach(c => selectedCollections.add(String(c.id_collection)));

  // marcar os checkboxes das coleções já selecionadas
  document.querySelectorAll("#f-col-list .pick-card").forEach(card => {
    const idCol = String(card.dataset.id);
    const chk = card.querySelector("input");
    if (chk) chk.checked = selectedCollections.has(idCol);
  });

  // carregar items blocks dessas coleções
  selectedItems.clear();
  for (const idCol of selectedCollections) {
    await loadItemsForCollection(idCol);
  }

  // buscar items do evento (precisas deste endpoint)
  const evItems = await fetch(`controllers/event_items.php?event=${idEvent}`).then(r => r.json());
  // evItems = [{id_item: 10}, {id_item: 13}...]

  // marcar items
  evItems.forEach(it => {
    // se tu guardas selectedItems como "colId:itemId", precisamos de descobrir colId do item
    // opção simples: o endpoint já devolver id_collection junto.
    // ex: [{id_item:10, id_collection:27}]
    const key = `${it.id_collection}:${it.id_item}`;
    selectedItems.add(key);

    const cb = document.querySelector(`.items-block[data-col="${it.id_collection}"] input[data-item="${it.id_item}"]`);
    if (cb) cb.checked = true;
  });
}

});

editSave?.addEventListener("click", async () => {
  const name = editName.value.trim();
  const date = editDate.value;
  const desc = editDesc.value.trim();
  const loc  = editLoc.value.trim();

  if (!name || !date) {
    alert("Preenche nome e data!");
    return;
  }

  const payload = {
    id_event: EVENT_ID,
    name,
    event_date: date,
    description: desc || null,
    location: loc || null
  };

  try {
    const r = await fetch("controllers/events.php", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let resp;
    try { resp = JSON.parse(text); } catch { resp = null; }

    if (resp && resp.ok) {
      alert("Evento atualizado!");
      window.location.reload();
    } else {
      console.error("PUT resp:", text);
      alert("Erro ao atualizar evento.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro de rede ao atualizar evento.");
  }
});

// DELETE EVENT (OWNER ONLY)
delBtn?.addEventListener("click", async () => {
  if (!EVENT_ID) return;

  const sure = confirm("Tens a certeza que queres apagar este evento? Esta ação é irreversível.");
  if (!sure) return;

  try {
    const r = await fetch("controllers/event_delete.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_event: EVENT_ID })
    });

    const text = await r.text();
    let resp;
    try { resp = JSON.parse(text); } catch { resp = null; }

    if (resp && resp.ok) {
      alert("Evento apagado com sucesso.");
      window.location.href = "events.php";
    } else {
      const errorMsg = resp?.error || text || "Erro ao apagar evento.";
      console.error("DELETE resp:", text);
      alert(errorMsg);
    }
  } catch (err) {
    console.error(err);
    alert("Erro de rede ao apagar evento.");
  }
});

});