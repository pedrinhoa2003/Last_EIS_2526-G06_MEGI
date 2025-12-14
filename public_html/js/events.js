// coleções escolhidas no modal PARTICIPATE
let selectedParticipateCollections = new Set();
let collectionNameById = {};


document.addEventListener("DOMContentLoaded", () => {
  const eventsContainer = document.getElementById("events");

  // botões/modais principais
  const joinBtn        = document.getElementById("d-join");
  const participateBtn = document.getElementById("d-participate");
  const reviewBtn      = document.getElementById("d-review");

  const reviewForm   = document.getElementById("reviewForm");
  const reviewClose  = document.getElementById("review-close");
  const rvStars      = reviewForm ? reviewForm.querySelectorAll(".star") : [];
  const rvComment    = document.getElementById("rv-comment");
  const rvCancel     = document.getElementById("rv-cancel");
  const rvSubmit     = document.getElementById("rv-submit");
  const rvCollection = document.getElementById("rv-collection");

  let currentRating  = 0;
  let currentEventId = null;

  const participateModal = document.getElementById("participateModal");
  const pCollections     = document.getElementById("p-collections");
  const pItems           = document.getElementById("p-items");
  const pCancel          = document.getElementById("p-cancel");
  const pConfirm         = document.getElementById("p-confirm");

  const btnGrid   = document.getElementById("btn-grid");
  const btnList   = document.getElementById("btn-list");
  const btnNew    = document.getElementById("btn-new");
  const eventForm = document.getElementById("eventForm");
  
function setMinTodayOnEventDate() {
  const fDate = document.getElementById("f-date");
  if (!fDate) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const minDate = `${yyyy}-${mm}-${dd}`;

  fDate.setAttribute("min", minDate);
  fDate.min = minDate; // redundante de propósito
}


setMinTodayOnEventDate();


  const sortSelect   = document.getElementById("sort");
  const statusSelect = document.getElementById("status");

  const searchInput =
    document.getElementById("q") || document.getElementById("searchInput");
  const searchBtn =
    document.getElementById("btn-search") ||
    document.querySelector(".navbar-search .search-btn");
  const searchForm = document.getElementById("searchForm");

  const detailModal = document.getElementById("eventDetail");
  const evCloseBtn  = document.getElementById("ev-close");
  const evName      = document.getElementById("ev-name");
  const evDate      = document.getElementById("ev-date");
  const evDesc      = document.getElementById("ev-desc");
  const evColList   = document.getElementById("ev-col-list");
  const evColCount  = document.getElementById("ev-col-count");

  let allEvents   = [];
  let currentView = "grid";

  // ==========================
  //   UTILITÁRIOS
  // ==========================
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function highlight(text = "", q = "") {
    if (!q) return text;
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`(${safeQ})`, "ig"), "<mark>$1</mark>");
  }

  // ==========================
  //   GRID / LIST
  // ==========================
  function setView(view) {
    currentView = view;
    eventsContainer.classList.toggle("list-view", view === "list");
    btnGrid?.setAttribute("aria-pressed", view === "grid");
    btnList?.setAttribute("aria-pressed", view === "list");
  }

  btnGrid?.addEventListener("click", () => {
    setView("grid");
    renderEvents();
  });

  btnList?.addEventListener("click", () => {
    setView("list");
    renderEvents();
  });

  setView("grid");

  // ==========================
  //   CARREGAR EVENTOS
  // ==========================
  const initialEventId = new URLSearchParams(window.location.search).get("id");
  let pendingInitialOpen = initialEventId;

  fetch("controllers/events.php")
    .then(async (r) => {
      if (!r.ok) {
        const txt = await r.text().catch(() => "[no body]");
        console.error("FETCH ERROR events.php:", r.status, txt);
        throw new Error("Erro ao pedir events.php");
      }

      const text = await r.text();
      try {
        const data = JSON.parse(text);
        allEvents = Array.isArray(data) ? data : [];
        renderEvents();

        if (pendingInitialOpen) {
          const exists = allEvents.some(
            (e) =>
              String(e.id_event ?? e.id ?? "") === String(pendingInitialOpen)
          );
          if (exists) {
            openDetail(pendingInitialOpen);
            pendingInitialOpen = null;
          }
        }
      } catch (e) {
        console.error("JSON PARSE ERROR:", e, text);
        allEvents = [];
        renderEvents();
      }
    })
    .catch((err) => {
      console.error("Erro no fetch events:", err);
      eventsContainer.innerHTML = "<p>Erro a carregar eventos.</p>";
    });

  // ==========================
  //   RENDER EVENTS
  // ==========================
  function renderEvents() {
    let events = Array.isArray(allEvents) ? [...allEvents] : [];

    const now    = new Date();
const status = statusSelect?.value || "";

        // ==========================
        // STATUS FILTER
        // ==========================
        if (status === "upcoming") {
          events = events.filter((e) => {
            const d = new Date(e.event_date ?? e.date ?? e.datetime ?? "");
            return !isNaN(d) && d >= now;
          });

        } else if (status === "past") {
          events = events.filter((e) => {
            const d = new Date(e.event_date ?? e.date ?? e.datetime ?? "");
            return !isNaN(d) && d < now;
          });

        } else if (status === "mine") {
          // 👤 Created by me (apenas se estiver logado)
          if (CURRENT_USER_ID !== null) {
            events = events.filter((e) =>
              e.created_by !== undefined &&
              Number(e.created_by) === Number(CURRENT_USER_ID)
            );
          } else {
            events = []; // segurança extra
          }
        }


    const qRaw = (searchInput?.value || "").trim();
    const q    = qRaw.toLowerCase();

    if (q) {
      events = events.filter((e) => {
        const name = (e.name ?? e.event_name ?? e.title ?? "")
          .toString()
          .toLowerCase();
        const desc = (e.description ?? e.desc ?? "")
          .toString()
          .toLowerCase();
        const loc = (e.location ?? e.city ?? "")
          .toString()
          .toLowerCase();
        return name.includes(q) || desc.includes(q) || loc.includes(q);
      });
    }

    const sort = sortSelect?.value || "date_asc";
    events.sort((a, b) => {
      const da = new Date(a.event_date ?? a.date ?? "");
      const db = new Date(b.event_date ?? b.date ?? "");
      const an = (a.name ?? a.event_name ?? a.title ?? "").toString();
      const bn = (b.name ?? b.event_name ?? b.title ?? "").toString();

      if (sort === "date_asc") return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
      if (sort === "date_desc") return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
      if (sort === "name_asc") return an.localeCompare(bn);
      if (sort === "name_desc") return bn.localeCompare(an);
      return 0;
    });

    eventsContainer.innerHTML = "";
    if (!events.length) {
      eventsContainer.innerHTML = "<p>Sem eventos para mostrar.</p>";
      return;
    }
    events.forEach((e) => {
        const titleRaw  = e.name ?? e.event_name ?? e.title ?? "Sem nome";
        const titleHtml = q ? highlight(titleRaw, qRaw) : titleRaw;
        const d         = new Date(e.event_date ?? e.date ?? "");
        const isUpcoming = !isNaN(d) ? d >= new Date() : true;

        // 1. Limpeza e conversão dos dados da DB
        // Criamos um array real e removemos espaços ou entradas vazias
        const allCovers = e.collection_covers 
          ? e.collection_covers.split(',').map(s => s.trim()).filter(s => s !== "") 
          : [];

        const placeholder = "img/event-placeholder.jpg";

        // 2. Definir a imagem principal (index 0)
        const imgMain = allCovers[0] || placeholder;

        // 3. Pegar as miniaturas restantes (do index 1 ao 3)
        const thumbnails = allCovers.slice(1, 4);

        // 4. Gerar o HTML das miniaturas dinamicamente
        // Se o array 'thumbnails' estiver vazio, o join('') resultará em nada (sem ícones quebrados)
        const thumbnailsHtml = thumbnails.map(src => `
          <img class="ev-thumb" src="${src}" alt="Thumbnail" onerror="this.src='${placeholder}'">
        `).join('');

        const idEv = e.id_event ?? e.id ?? e.eventId ?? "";

        // Verificação de dono do evento
        const isOwner =
          e.created_by !== undefined &&
          CURRENT_USER_ID !== null &&
          Number(e.created_by) === Number(CURRENT_USER_ID);

        const ownerBadge = isOwner ? `<div class="ev-owner-badge">Created by you</div>` : "";

        // 5. Renderizar o Card
        eventsContainer.innerHTML += `
          <article class="collection-card event-card ${isUpcoming ? "upcoming" : "past"}" data-id="${idEv}">
            <div class="ev-gallery">
              <img class="ev-main" src="${imgMain}" alt="${titleRaw}" onerror="this.src='${placeholder}'">
              <div class="ev-strip">
                ${thumbnailsHtml}
              </div>
            </div>
            <div class="ev-meta">
              ${ownerBadge}
              <h2 class="ev-title">${titleHtml}</h2>
              <p class="ev-date">📅 ${e.event_date ?? e.date ?? ""}</p>
              <p class="muted">📍 ${e.location ?? ""}</p>
            </div>
            <div class="ev-actions">
              <a href="event.php?id=${idEv}" class="btn outline">View event</a>
            </div>
          </article>
  `;
});
    
    
  }

  const debouncedRender = debounce(renderEvents, 160);

  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    renderEvents();
  });

  searchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    renderEvents();
  });

  searchInput?.addEventListener("input", () => {
    debouncedRender();
  });

  searchInput?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") renderEvents();
    else if (e.key === "Escape") {
      searchInput.value = "";
      renderEvents();
    }
  });

  sortSelect?.addEventListener("change", renderEvents);
  statusSelect?.addEventListener("change", renderEvents);

  // ==========================
  //   NOTIFICAÇÕES (texto em cima)
  // ==========================
  const notifTrigger   = document.getElementById("notif-trigger");
  const notifDot       = document.getElementById("notif-dot");
  const notifModal     = document.getElementById("notifModal");
  const notifClose     = document.getElementById("notif-close");
  const notifModalList = document.getElementById("notif-modal-list");

  let notifEvents = [];

  async function loadNotificationsForEventsPage() {
    if (!notifTrigger || !notifDot) return;

    try {
      const res = await fetch("controllers/event_notifications.php?days=365");
      if (!res.ok) {
        console.warn("Notif fetch failed:", res.status);
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        notifDot.hidden = true;
        notifEvents = [];
        return;
      }

      notifEvents = data;
      notifDot.hidden = false;
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    }
  }

  function openNotifModal() {
    if (!notifEvents.length) {
      alert("You are not participating in any upcoming events.");
      return;
    }

    const cardsHtml = notifEvents
      .map((ev) => {
        const idEv  = ev.id_event ?? ev.id ?? "";
        const name  = ev.name || "Event";
        const date  = ev.event_date || "";
        const where = ev.location || "";

        let daysLabel = "";
        if (typeof ev.days_left !== "undefined" && ev.days_left !== null) {
          const d = Number(ev.days_left);
          if (!Number.isNaN(d)) {
            if (d === 0) daysLabel = "Today";
            else if (d === 1) daysLabel = "In 1 day";
            else if (d > 1) daysLabel = `In ${d} days`;
          }
        }

        const locHtml  = where ? `<span>📍 ${where}</span>` : "";
        const daysHtml = daysLabel ? `<span>⏱ ${daysLabel}</span>` : "";
        const dateHtml = date ? `<span>📅 ${date}</span>` : "";

        return `
          <article class="notif-card">
            <h3 class="notif-card-title">${name}</h3>
            <div class="notif-card-meta">
              ${dateHtml}
              ${locHtml}
              ${daysHtml}
            </div>
            <div class="notif-card-footer">
              <a href="event.php?id=${idEv}">View event</a>
            </div>
          </article>
        `;
      })
      .join("");

    notifModalList.innerHTML = `<div class="notif-list">${cardsHtml}</div>`;
    notifModal.classList.add("show");
    notifModal.setAttribute("aria-hidden", "false");
  }

  function closeNotifModal() {
    notifModal.classList.remove("show");
    notifModal.setAttribute("aria-hidden", "true");
  }

  notifTrigger?.addEventListener("click", openNotifModal);
  notifClose?.addEventListener("click", closeNotifModal);
  notifModal?.addEventListener("click", (e) => {
    if (e.target === notifModal) closeNotifModal();
  });

  loadNotificationsForEventsPage();

  // ==========================
  //   DETALHE DO EVENTO (modal)
  // ==========================
  function openDetail(idEvent) {
    const ev = allEvents.find((x) => String(x.id_event) === String(idEvent));
    if (!ev) return;

    evName.textContent = ev.name;
    evDate.textContent = ev.event_date;
    evDesc.textContent = ev.description ?? "";

    if (joinBtn) joinBtn.dataset.id = idEvent;
    if (participateBtn) participateBtn.dataset.id = idEvent;
    if (reviewBtn) reviewBtn.dataset.id = idEvent;

    const isPast = new Date(ev.event_date) < new Date();

    if (participateBtn) participateBtn.disabled = isPast;

    if (joinBtn) {
      if (isPast) {
        joinBtn.disabled = true;
        joinBtn.textContent = "Event ended";
      } else {
        joinBtn.disabled = false;
        joinBtn.textContent = "Interested";
      }
    }

    if (reviewBtn) {
      reviewBtn.disabled = !isPast;
      reviewBtn.textContent = isPast ? "Rate" : "Rate (after the event)";
    }

    fetch(`controllers/check_interest.php?event=${idEvent}`)
      .then((r) => r.json())
      .then((res) => {
        if (!joinBtn) return;
        if (res.interested) {
          joinBtn.classList.add("active");
          joinBtn.textContent = "Interested ✓";
        } else {
          joinBtn.classList.remove("active");
          joinBtn.textContent = "Interested";
        }
      });

    fetch(`controllers/event_collections.php?event=${idEvent}`)
      .then((r) => r.json())
      .then((cols) => {
        evColList.innerHTML = "";
        evColCount.textContent = cols.length;

        if (!cols.length) {
          evColList.innerHTML = "<p>Sem coleções neste evento.</p>";
          return;
        }

        cols.forEach((c) => {
          evColList.innerHTML += `
            <div class="ev-col-item">
              <span class="ev-col-name">${c.name}</span>
              <a href="collection.php?id=${c.id_collection}" class="btn outline">View</a>
            </div>
          `;
        });
      })
      .catch(() => {
        evColList.innerHTML = "<p>Erro ao carregar coleções do evento.</p>";
      });

    detailModal.classList.add("show");
    detailModal.setAttribute("aria-hidden", "false");
  }

  function closeDetail() {
    detailModal.classList.remove("show");
    detailModal.setAttribute("aria-hidden", "true");
  }

  evCloseBtn?.addEventListener("click", closeDetail);
  detailModal?.addEventListener("click", (e) => {
    if (e.target === detailModal) closeDetail();
  });

// -------------------------
// PARTICIPATE – várias coleções + itens
// -------------------------

participateBtn?.addEventListener("click", () => {
  // reset ao abrir
  selectedParticipateCollections = new Set();
  pCollections.innerHTML = "<p class='muted'>Loading...</p>";
  pItems.innerHTML = "";
  
  participateModal.classList.add("show");
  participateModal.setAttribute("aria-hidden", "false");

  loadUserCollectionsForParticipate();
});

// fechar modal
pCancel?.addEventListener("click", () => {
  participateModal.classList.remove("show");
  participateModal.setAttribute("aria-hidden", "true");
});

participateModal?.addEventListener("click", (e) => {
  if (e.target === participateModal) {
    participateModal.classList.remove("show");
    participateModal.setAttribute("aria-hidden", "true");
  }
});

// carregar coleções do user (checkbox = várias)
async function loadUserCollectionsForParticipate() {
  try {
    const res = await fetch("controllers/collections.php?mine=1");
    const cols = await res.json();

collectionNameById = {};
cols.forEach(c => {
  collectionNameById[String(c.id_collection)] = c.name;
});

    if (!cols.length) {
      pCollections.innerHTML = "<p class='muted'>Não tens coleções.</p>";
      return;
    }

    pCollections.innerHTML = cols.map(c => `
      <label class="pick-card" data-col="${c.id_collection}">
        <input type="checkbox">
        <span>${c.name}</span>
      </label>
    `).join("");

    // listeners – marcar/desmarcar coleções
    pCollections.querySelectorAll(".pick-card").forEach(card => {
      const checkbox = card.querySelector("input");
      const idCol = card.dataset.col;

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

// carregar itens de UMA coleção (cria um bloco por coleção)
async function loadItemsForParticipate(idCol) {
  // se já existe bloco desta coleção, apaga para recriar
  removeParticipateItemsBlock(idCol);

  try {
    const res = await fetch(`controllers/items.php?collection=${idCol}`);
    const items = await res.json();

    const block = document.createElement("div");
    block.classList.add("participate-items-block");
    block.dataset.col = idCol;

    const colName = collectionNameById[String(idCol)] || `Collection ${idCol}`;

if (!items.length) {
  block.innerHTML = `
    <h4>Items from ${colName}</h4>
    <p class="muted">Esta coleção não tem itens.</p>
  `;
} else {
  block.innerHTML = `
    <h4>Items from ${colName}</h4>
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
  const block = pItems.querySelector(`.participate-items-block[data-col="${idCol}"]`);
  if (block) block.remove();
}

// Confirmar participação
pConfirm?.addEventListener("click", async () => {
  console.log("CLICK NO CONFIRM!");

  const idEvent = participateBtn?.dataset.id; // guardado em openDetail()
  if (!idEvent) {
    alert("Erro: nenhum evento selecionado.");
    return;
  }

  const collections = [...selectedParticipateCollections];
  if (!collections.length) {
    alert("Escolhe pelo menos uma coleção.");
    return;
  }

  // todos os checkboxes de itens selecionados, com a coleção de origem
  const items = Array.from(
    pItems.querySelectorAll('input[type="checkbox"]:checked')
  ).map(cb => ({
    id_item: cb.value,
    id_collection: cb.dataset.col
  }));

  const payload = {
    id_event: idEvent,
    collections,
    items
  };

  try {
    const r = await fetch("controllers/event_participate.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    console.log("RAW PARTICIPATE RESPONSE:", text);

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
        
        // voltar a carregar as coleções desse evento no detalhe
        fetch(`controllers/event_collections.php?event=${idEvent}`)
          .then(r => r.json())
          .then(cols => {
            evColList.innerHTML = "";
            evColCount.textContent = cols.length;

            if (!cols.length) {
              evColList.innerHTML = "<p>Sem coleções neste evento.</p>";
              return;
            }

            cols.forEach(c => {
              evColList.innerHTML += `
                <div class="ev-col-item">
                  <span class="ev-col-name">${c.name}</span>
                  <a href="collection.php?id=${c.id_collection}" class="btn outline">View</a>
                </div>
              `;
            });
          })
          .catch(() => {
            evColList.innerHTML = "<p>Erro ao carregar coleções do evento.</p>";
          });

              } else {
                console.error("PARTICIPATE ERROR JSON:", resp);
                alert("Erro ao guardar participação: " + (resp.err || "desconhecido"));
              }

      } catch (err) {
    console.error(err);
    alert("Erro de rede ao guardar participação.");
  }
});


  // ==========================
  //   INTERESTED TOGGLE
  // ==========================
  joinBtn?.addEventListener("click", async () => {
    const idEvent = joinBtn.dataset.id;

    const r = await fetch("controllers/event_Interested.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_event: idEvent }),
    });

    const resp = await r.json();

    if (resp.success) {
      if (resp.interested) {
        joinBtn.classList.add("active");
        joinBtn.textContent = "Interested ✓";
      } else {
        joinBtn.classList.remove("active");
        joinBtn.textContent = "Interested";
      }
    }
  });

  // ==========================
  //   RATING
  // ==========================
  reviewBtn?.addEventListener("click", async () => {
    if (reviewBtn.disabled) return;

    currentEventId = reviewBtn.dataset.id;
    currentRating  = 0;

    rvComment.value = "";
    rvStars.forEach((star) => star.classList.remove("selected"));

    if (rvCollection) {
      rvCollection.innerHTML = "<option value=''>Loading...</option>";

      try {
        const res  = await fetch(
          `controllers/event_rate.php?event=${currentEventId}`
        );
        const text = await res.text();
        console.log("RATE GET raw:", res.status, text);

        if (res.status === 401) {
          alert("Precisas de iniciar sessão para avaliar.");
          return;
        }

        let cols;
        try {
          cols = JSON.parse(text);
        } catch (e) {
          console.error("JSON PARSE ERROR (rate GET):", e);
          rvCollection.innerHTML =
            "<option value=''>Error loading collections</option>";
          return;
        }

        if (!Array.isArray(cols)) {
          rvCollection.innerHTML =
            "<option value=''>Error loading collections</option>";
          return;
        }

        if (!cols.length) {
          rvCollection.innerHTML =
            "<option value=''>No collections for this event</option>";
        } else {
          rvCollection.innerHTML = cols
            .map(
              (c) =>
                `<option value="${c.id_collection}">${c.name}</option>`
            )
            .join("");
        }
      } catch (err) {
        console.error("Erro a carregar coleções:", err);
        rvCollection.innerHTML =
          "<option value=''>Error loading collections</option>";
      }
    }

    reviewForm.classList.add("show");
    reviewForm.setAttribute("aria-hidden", "false");
  });

  rvStars.forEach((star) => {
    star.addEventListener("click", () => {
      currentRating = Number(star.dataset.value);

      rvStars.forEach((s) => {
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
  reviewForm?.addEventListener("click", (e) => {
    if (e.target === reviewForm) closeReview();
  });

  rvSubmit?.addEventListener("click", async () => {
    if (!currentEventId) {
      alert("Erro: nenhum evento selecionado.");
      return;
    }

    const idCollection = rvCollection?.value || "";
    if (!idCollection) {
      alert("Escolhe uma coleção.");
      return;
    }

    if (!currentRating) {
      alert("Escolhe quantas estrelas queres dar.");
      return;
    }

    const payload = {
      id_event: currentEventId,
      id_collection: idCollection,
      rate: currentRating,
      comment: rvComment.value.trim(),
    };

    try {
      const r = await fetch("controllers/event_rate.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      console.log("RATE POST raw:", r.status, text);

      let resp;
      try {
        resp = JSON.parse(text);
      } catch (e) {
        console.error("JSON PARSE ERROR (rate POST):", e);
        alert("Erro ao processar resposta do servidor.");
        return;
      }

      if (resp.ok) {
        alert("Obrigado pela avaliação!");
        if (reviewBtn) {
          reviewBtn.textContent = "Rated ✓";
          reviewBtn.disabled = true;
        }
        closeReview();
      } else {
        alert("Erro ao guardar avaliação: " + (resp.error || "desconhecido"));
      }
    } catch (err) {
      console.error("Erro de rede ao enviar rating:", err);
      alert("Erro de rede ao enviar avaliação.");
    }
  });

  // ==========================
  //   NEW EVENT (já tinhas)
  // ==========================
  async function loadUserCollectionsForEventForm() {
    const list = document.getElementById("f-col-list");
    if (!list) return;

    list.innerHTML = "<p class='muted'>A carregar coleções...</p>";

    const res = await fetch("controllers/collections.php?mine=1");
    if (res.status === 401) {
      list.innerHTML =
        "<p class='muted'>Precisas de login para escolher coleções.</p>";
      return;
    }

    const cols = await res.json();

    if (!cols.length) {
      list.innerHTML = "<p class='muted'>Não tens coleções.</p>";
      return;
    }

    list.innerHTML = cols
      .map(
        (c) => `
      <label class="pick-card">
        <input type="checkbox" value="${c.id_collection}">
        <span>${c.name}</span>
        <small class="muted">${c.category_name}</small>
      </label>
    `
      )
      .join("");
  }

  const selectedCollections = new Set();
  const selectedItems       = new Set();

  const fColList   = document.getElementById("f-col-list");
  const fItemsWrap = document.getElementById("f-items-wrap");

  async function loadItemsForCollection(idCol) {
    if (!fItemsWrap) return;

    try {
      const items = await fetch(
        `controllers/items.php?collection=${idCol}`
      ).then((r) => r.json());

      const existing = fItemsWrap.querySelector(
        `.items-block[data-col="${idCol}"]`
      );
      if (existing) existing.remove();

      const block = document.createElement("div");
      block.className = "items-block";
      block.dataset.col = idCol;
      const colName = collectionNameById[String(idCol)] || `Coleção ${idCol}`;


      if (!items.length) {
        block.innerHTML = `
          <div class="items-head">
            <strong>${colName}</strong>
            <button class="remove-col" data-col="${idCol}"
                    style="float:right; background:none; border:none; font-size:18px; cursor:pointer;">
              ❌
            </button>
          </div>
          <p class="muted">Esta coleção não tem itens.</p>
        `;
        fItemsWrap.appendChild(block);
      } else {
        block.innerHTML = `
          <div class="items-head">
            <strong>Itens da coleção ${colName}</strong>
            <button class="remove-col" data-col="${idCol}"
                    style="float:right; background:none; border:none; font-size:18px; cursor:pointer;">
              ❌
            </button>
          </div>
          <div class="mini-grid">
            ${items
              .map(
                (i) => `
              <label class="mini-card">
                <input type="checkbox" data-item="${i.id_item}" />
                
                <span>${i.name}</span>
              </label>
            `
              )
              .join("")}
          </div>
        `;
        fItemsWrap.appendChild(block);

        block
          .querySelectorAll("input[type=checkbox]")
          .forEach((cb) => {
            cb.addEventListener("change", () => {
              const idItem = cb.dataset.item;
              const key = `${idCol}:${idItem}`;
              if (cb.checked) selectedItems.add(key);
              else selectedItems.delete(key);
            });
          });
      }

      const removeBtn = block.querySelector(".remove-col");
      removeBtn.addEventListener("click", () => {
        selectedCollections.delete(idCol);

        selectedItems.forEach((it) => {
          if (String(it).startsWith(idCol + ":")) selectedItems.delete(it);
        });

        block.remove();

        const chk = document.querySelector(
          `.pick-card[data-id="${idCol}"] input`
        );
        if (chk) chk.checked = false;
      });
    } catch (err) {
      console.error(err);
    }
  }

  function removeItemsBlock(idCol) {
    const block = fItemsWrap?.querySelector(
      `.items-block[data-col="${idCol}"]`
    );
    block?.remove();
  }

    const loginRequiredModal = document.getElementById("loginRequiredModal");
    const lrClose  = document.getElementById("lr-close");
    const lrCancel = document.getElementById("lr-cancel");

    function openLoginRequired() {
      loginRequiredModal?.classList.add("show");
      loginRequiredModal?.setAttribute("aria-hidden", "false");
    }

    function closeLoginRequired() {
      loginRequiredModal?.classList.remove("show");
      loginRequiredModal?.setAttribute("aria-hidden", "true");
    }

    lrClose?.addEventListener("click", closeLoginRequired);
    lrCancel?.addEventListener("click", closeLoginRequired);
    loginRequiredModal?.addEventListener("click", (e) => {
      if (e.target === loginRequiredModal) closeLoginRequired();
    });

    btnNew?.addEventListener("click", () => {
      // 🔒 sem login -> não abre modal, mostra aviso
      if (typeof CURRENT_USER_ID === "undefined" || CURRENT_USER_ID === null) {
        openLoginRequired();
        return;
      }

      // ✅ com login -> abre modal normal
      editingEventId = null;
      
      // limpar seleções anteriores
      selectedCollections.clear();
      selectedItems.clear();
      if (fItemsWrap) fItemsWrap.innerHTML = "";

      const fTitle = document.getElementById("f-title");
      const fName  = document.getElementById("f-name");
      const fDate  = document.getElementById("f-date");
      const fDesc  = document.getElementById("f-desc");
      const fLoc   = document.getElementById("f-loc");

      if (fTitle) fTitle.textContent = "New Event";
      if (fName)  fName.value = "";
      if (fDate)  fDate.value = "";
      if (fDesc)  fDesc.value = "";
      if (fLoc)   fLoc.value  = "";
      
      setMinTodayOnEventDate();


      eventForm.classList.add("show");
      eventForm.setAttribute("aria-hidden", "false");
      loadCollectionsForForm();
    });



  document.getElementById("f-cancel")?.addEventListener("click", () => {
    eventForm.classList.remove("show");
    eventForm.setAttribute("aria-hidden", "true");
  });
  
        const formClose = document.getElementById("form-close");

      function closeEventForm() {
        eventForm?.classList.remove("show");
        eventForm?.setAttribute("aria-hidden", "true");
      }

      formClose?.addEventListener("click", closeEventForm);
      document.getElementById("f-cancel")?.addEventListener("click", closeEventForm);

      // opcional: clicar fora do modal fecha
      eventForm?.addEventListener("click", (e) => {
        if (e.target === eventForm) closeEventForm();
      });

      // opcional: ESC fecha
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && eventForm?.classList.contains("show")) {
          closeEventForm();
        }
      });


  async function loadCollectionsForForm() {
    if (!fColList) return;

    fColList.innerHTML = "<p class='muted'>A carregar coleções…</p>";

    try {
      const cols = await fetch("controllers/collections.php?mine=1").then(
        (r) => r.json()
      );
      
            collectionNameById = {};
      cols.forEach(c => {
        collectionNameById[String(c.id_collection)] = c.name;
      });


      if (!cols.length) {
        fColList.innerHTML = "<p class='muted'>Não tens coleções.</p>";
        return;
      }

      fColList.innerHTML = cols
        .map(
          (c) => `
        <label class="pick-card" data-id="${c.id_collection}">
          <input type="checkbox" />
          
          <span>${c.name}</span>
        </label>
      `
        )
        .join("");

      fColList.querySelectorAll(".pick-card").forEach((card) => {
        card.addEventListener("click", async (e) => {
          if (e.target.tagName === "INPUT") return;

          e.preventDefault();

          const idCol    = card.dataset.id;
          const checkbox = card.querySelector("input");

          checkbox.checked = !checkbox.checked;

          if (checkbox.checked) {
            selectedCollections.add(idCol);
            await loadItemsForCollection(idCol);
          } else {
            selectedCollections.delete(idCol);
            removeItemsBlock(idCol);
            selectedItems.forEach((it) => {
              if (String(it).startsWith(idCol + ":")) selectedItems.delete(it);
            });
          }
        });
      });
    } catch (err) {
      console.error(err);
      fColList.innerHTML = "<p class='muted'>Erro a carregar coleções.</p>";
    }
  }

  const fSave = document.getElementById("f-save");

  fSave?.addEventListener("click", async (e) => {
    e.preventDefault();

    const name = document.getElementById("f-name")?.value.trim();
    const date = document.getElementById("f-date")?.value;
    
    // bloquear datas antes de hoje (mesmo que escrevam à mão)
        const picked = new Date(date);
        picked.setHours(0,0,0,0);

        const today = new Date();
        today.setHours(0,0,0,0);

        if (picked < today) {
          alert("Não podes escolher uma data antes de hoje.");
          document.getElementById("f-date").value = "";
          return;
}

    const desc = document.getElementById("f-desc")?.value.trim();
    const loc  = document.getElementById("f-loc")?.value.trim();

    if (!name || !date) {
      alert("Preenche nome e data!");
      return;
    }
    
    if (!editingEventId && !selectedItems.size) {
      alert("Seleciona pelo menos um item de uma coleção.");
      return;
    }


    // dados base (servem para create e update)
    const basePayload = {
      name,
      event_date: date,
      description: desc || null,
      location: loc || null
    };

    let method  = "POST";
    let payload = {};

   if (editingEventId) {
  method = "PUT";
  payload = {
    ...basePayload,
    id_event: editingEventId,
    collections: Array.from(selectedCollections),
    items: Array.from(selectedItems).map(k => k.split(":")[1])
  };
} else {
  method = "POST";
  payload = {
    ...basePayload,
    collections: Array.from(selectedCollections),
    items: Array.from(selectedItems).map(k => k.split(":")[1])
  };
}

    try {
      const r = await fetch("controllers/events.php", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      console.log("RAW RESPONSE:", text);

      let resp;
      try {
        resp = JSON.parse(text);
      } catch (e) {
        console.error("JSON PARSE ERROR:", e);
        alert("Erro ao processar resposta do servidor.");
        return;
      }

      if (resp.ok) {
        alert(editingEventId ? "Evento atualizado com sucesso!" : "Evento criado com sucesso!");
        eventForm.classList.remove("show");
        eventForm.setAttribute("aria-hidden", "true");
        editingEventId = null;

        // voltar a buscar a lista de eventos
        const events = await fetch("controllers/events.php").then((x) => x.json());
        allEvents = events || [];
        renderEvents();
      } else {
        alert("Erro ao guardar evento.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de rede ao guardar evento.");
    }
  });


  

  // ==========================
  //   ALERTAS (campainha)
  // ==========================
  const eventsAlertsBox = document.getElementById("event-alerts-events");
  const eventBell       = document.getElementById("event-bell");
  const eventBadge      = document.getElementById("event-badge");

  async function loadEventsPageAlerts() {
    if (!eventsAlertsBox || !eventBell || !eventBadge) return;

    try {
      const res = await fetch("controllers/event_notifications.php?days=7");

      if (res.status === 401) {
        eventBell.style.display = "none";
        eventsAlertsBox.hidden  = true;
        return;
      }

      const text = await res.text();
      console.log("EVENTS NOTIFS RAW:", res.status, text);

      let events;
      try {
        events = JSON.parse(text);
      } catch (e) {
        console.error("JSON error (events notifications):", e);
        eventBell.style.display = "none";
        eventsAlertsBox.hidden  = true;
        return;
      }

      if (!Array.isArray(events) || !events.length) {
        eventBell.style.display = "none";
        eventsAlertsBox.hidden  = true;
        return;
      }

      eventBadge.textContent = events.length;
      eventBadge.hidden      = false;

      const listHtml = events
        .map((ev) => {
          const name  = ev.name || "Event";
          const date  = ev.event_date || "";
          const days  =
            typeof ev.days_left !== "undefined" ? ev.days_left : null;
          const where = ev.location || "";

          let info = date;
          if (days !== null) {
            if (days === 0) info = "Today";
            else if (days === 1) info = "In 1 day";
            else info = `In ${days} days`;
          }

          const locText = where ? ` • ${where}` : "";
          return `<li><strong>${name}</strong> – ${info}${locText}</li>`;
        })
        .join("");

      eventsAlertsBox.innerHTML = `
        <p><strong>Upcoming events you're participating in:</strong></p>
        <ul class="event-alerts-list">
          ${listHtml}
        </ul>
      `;

      eventsAlertsBox.hidden = true;

      eventBell.addEventListener("click", () => {
        eventsAlertsBox.hidden = !eventsAlertsBox.hidden;
      });
    } catch (err) {
      console.error("Error loading events notifications:", err);
      eventBell.style.display = "none";
      eventsAlertsBox.hidden  = true;
    }
  }

  loadEventsPageAlerts();
});
