<?php
require_once __DIR__ . "/partials/bootstrap.php";
?>

<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>Events | MyCollections</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/events.css" />
  
 <script src="js/navbar.js"></script>

<?php if (isLoggedIn()): ?>
<script>
  const CURRENT_USER_ID = <?= (int)$_SESSION["id_user"] ?>;
</script>
<?php else: ?>
<script>
  const CURRENT_USER_ID = null;
</script>
<?php endif; ?>

<script defer src="js/events.js"></script>

</head>
<body>

<?php require_once __DIR__ . "/partials/navbar.php"; ?>

<main>
    <h1 class="events-title">EVENTS</h1>
    
   <?php if (isLoggedIn()): ?>
  <!-- Barra de notificações -->
  <div class="events-notifications">
    <button id="notif-trigger" class="notifications-link">
      NOTIFICATIONS
      <span id="notif-dot" class="notif-dot" hidden></span>
    </button>
    </div>
    <?php endif; ?>


  
   <section class="events-toolbar pro">
     <div class="toolbar-left">
       <div class="view-toggle" role="group" aria-label="View toggle">
         <button id="btn-grid" class="chip chip-toggle" aria-pressed="true" title="Grid view">
           <span class="icon-grid" aria-hidden="true"></span>
           <span>Grid</span>
         </button>
         <button id="btn-list" class="chip chip-toggle" aria-pressed="false" title="List view">
           <span class="icon-list" aria-hidden="true"></span>
           <span>List</span>
         </button>
       </div>
     </div>

     <div class="toolbar-center">
       <label class="field">
         <span>Sort</span>
         <select id="sort">
           <option value="date_asc">Date (↑)</option>
           <option value="date_desc">Date (↓)</option>
           <option value="name_asc">Name (A→Z)</option>
           <option value="name_desc">Name (Z→A)</option>
         </select>
       </label>

       <label class="field">
         <span>Status</span>
         <select id="status">
        <option value="">All</option>
        <option value="upcoming">Upcoming</option>
        <option value="past">Past</option>

        <?php if (isLoggedIn()): ?>
          <option value="mine">Created by me</option>
        <?php endif; ?>
        </select>

       </label>
     </div>

     <div class="toolbar-right" style="position:relative;">

  <button id="btn-new" class="btn primary">+ New Event</button>

  <!-- painel dropdown com a lista -->
  <div id="notif-panel" class="notif-panel" hidden>
    <h4>Upcoming events you’re participating in</h4>
    <ul id="notif-list"></ul>
  </div>
</div>

   </section>

   <section id="events" class="collections-container"></section>
</main>

<!-- ===================== MODAL DETALHE DO EVENTO ===================== -->
<div id="eventDetail" class="ev-modal" aria-hidden="true">
  <div class="ev-card" role="dialog" aria-modal="true" aria-labelledby="ev-name">
    <button class="ev-close" id="ev-close" aria-label="Close">✕</button>
    <h3 id="ev-name" class="ev-title">Event name</h3>
    <p id="ev-date" class="ev-subtitle">Date</p>
    <p id="ev-desc" class="ev-desc">Description</p>

    <div class="ev-collections">
      <div class="ev-col-head">
        <h4 class="ev-col-title">Collections in the event</h4>
        <span id="ev-col-count" class="ev-badge">0</span>
      </div>
      <div id="ev-col-list" class="ev-col-list" aria-live="polite"></div>
    </div>

    <div class="ev-actions">
      <button id="d-review" class="btn outline">Rate</button>
      <button id="d-join" class="btn">Interested</button>
      <button id="d-participate" class="btn outline">Participate</button>
    </div>
  </div> 
</div>

<!-- ===================== MODAL RATING (RATE) ===================== -->
<div id="reviewForm" class="modal" aria-hidden="true">
  <div class="modal-content">
    <span class="close" id="review-close" aria-label="Close">×</span>
    <h2 id="rv-title">Rate the event</h2>

    <label for="rv-collection">Collection</label>
    <select id="rv-collection">
      <option value="">Select a collection</option>
    </select>

    <div class="rv-stars" role="radiogroup" aria-label="Classification from 1 to 5 stars">
      <button type="button" class="star" data-value="1">★</button>
      <button type="button" class="star" data-value="2">★</button>
      <button type="button" class="star" data-value="3">★</button>
      <button type="button" class="star" data-value="4">★</button>
      <button type="button" class="star" data-value="5">★</button>
    </div>

    <textarea id="rv-comment" rows="4" placeholder="Leave your comment (optional)"></textarea>

    <div class="modal-buttons">
      <button id="rv-cancel" class="btn outline">Cancel</button>
      <button id="rv-submit" class="btn">Submit rating</button>
    </div>
  </div>
</div>

<!-- ===================== MODAL PARTICIPATE ===================== -->
<div id="participateModal" class="modal" aria-hidden="true">
  <div class="modal-content">
    <h2>Select Collection & Items</h2>

    <label>Your Collections</label>
    <div id="p-collections" class="collection-list"></div>

    <label>Items to take</label>
    <div id="p-items" class="items-list"></div>

    <div class="modal-actions">
      <button id="p-cancel" class="btn outline">Cancel</button>
      <button id="p-confirm" class="btn primary">Confirm</button>
    </div>
  </div>
</div>

<!-- ===================== MODAL NEW EVENT ===================== -->
<div id="eventForm" class="modal" aria-hidden="true">
  <div class="modal-content">
    <span class="close" id="form-close" aria-label="Close">×</span>
    <h2 id="f-title">New Event</h2>
    
    <input type="hidden" id="f-id" /> 

    <label>Name <input id="f-name" required /></label>
    <label>Date <input id="f-date" type="date" required /></label>
    <label>Description <textarea id="f-desc" rows="4"></textarea></label>
    <label>Location <input id="f-loc" /></label>
      
    <h3 class="ev-col-title" style="margin-top:14px;">Collections</h3>
    <div id="f-col-list" class="pick-grid"></div>
    <div id="f-items-wrap" style="margin-top:10px;"></div>

    <div class="modal-buttons">
      <button id="f-cancel">Cancel</button>
      <button id="f-save" class="btn">Save</button>
    </div>
  </div>
</div>  

 <!-- NOTIFICATIONS MODAL -->
<div id="notifModal" class="modal" aria-hidden="true">
  <div class="modal-content">
    <span class="close" id="notif-close" aria-label="Close">×</span>
    <h2>Upcoming events you're participating in</h2>
    <div id="notif-modal-list" class="notif-modal-list">
      <!-- JS preenche aqui -->
    </div>
  </div>
</div>

<footer class="footer">
  <p>© 2025 MyCollections | All rights reserved.</p>
</footer>

 <!-- LOGIN REQUIRED MODAL -->
<div id="loginRequiredModal" class="modal" aria-hidden="true">
  <div class="modal-content">
    <span class="close" id="lr-close" aria-label="Close">×</span>
    <h2>Login required</h2>
    <p class="muted">You need to be logged in to create a new event.</p>

    <div class="modal-buttons">
      <button id="lr-cancel" class="btn outline">Cancel</button>
      <a id="lr-login" class="btn primary" href="login.php">Go to login</a>
    </div>
  </div>
</div>

</body>
</html>
