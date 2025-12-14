<?php
require_once __DIR__ . "/partials/bootstrap.php";

$eventId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$event   = null;
$cols    = [];

if ($eventId > 0) {
    $db = DB::conn();

    // Evento
    $stmt = $db->prepare("SELECT id_event, name, location, event_date, description, created_by
                          FROM events WHERE id_event = ?");
    $stmt->bind_param("i", $eventId);
    $stmt->execute();
    $res   = $stmt->get_result();
    $event = $res->fetch_assoc();
    $stmt->close();

    if ($event) {
        // Coleções do evento
        $stmt2 = $db->prepare("
            SELECT c.id_collection, c.name
            FROM event_collections ec
            JOIN collections c ON c.id_collection = ec.id_collection
            WHERE ec.id_event = ?
        ");
        $stmt2->bind_param("i", $eventId);
        $stmt2->execute();
        $colsRes = $stmt2->get_result();
        while ($row = $colsRes->fetch_assoc()) {
            $cols[] = $row;
        }
        $stmt2->close();
    }
}

if (!$event) {
    http_response_code(404);
}

$isOwner = $event && isLoggedIn() && (int)$event["created_by"] === (int)($_SESSION["id_user"] ?? 0);

?>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title><?= $event ? htmlspecialchars($event['name']) . " | MyCollections" : "Event not found" ?></title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/events.css" />
  
  <script>
    // This creates the variable your JS is looking for
    const CURRENT_USER_ID = <?= isset($_SESSION['id_user']) ? (int)$_SESSION['id_user'] : 'null' ?>;
  </script>
  <script src="js/navbar.js"></script>
  <?php if ($event): ?>
    <script defer src="js/event_page.js"></script>
  <?php endif; ?>
</head>
<body data-event-id="<?= $event ? (int)$event['id_event'] : 0 ?>">


<?php require_once __DIR__ . "/partials/navbar.php"; ?>

<main class="event-page-main">
<?php if (!$event): ?>
  <section class="event-page-card">
    <a href="events.php" class="back-link">← Back to events</a>
    <h1 class="events-title" style="margin-top:16px;">Event not found</h1>
    <p class="ev-desc">The event you are looking for does not exist.</p>
  </section>
<?php else: ?>

  <?php
    $dt      = new DateTime($event['event_date']);
    $now     = new DateTime();
    $isPast  = $dt < $now;
    $dateStr = $dt->format("Y-m-d");
  ?>

 <div class="event-topbar">
  <a href="events.php" class="back-link">← Back to events</a>

  <?php if ($isOwner): ?>
    <div class="ev-owner-actions">
      <button id="ev-owner-edit" class="btn outline">Edit</button>
      <button id="ev-owner-delete" class="btn btn-danger">
        <span class="trash" aria-hidden="true">🗑</span> Delete
      </button>
    </div>
  <?php endif; ?>
</div>



    <h1 class="events-title" style="margin-top:18px;">
      <?= htmlspecialchars($event['name']) ?>
    </h1>

    <p class="ev-subtitle">
      📅 <?= htmlspecialchars($dateStr) ?>
      <?php if (!empty($event['location'])): ?>
        &nbsp;&nbsp;📍 <?= htmlspecialchars($event['location']) ?>
      <?php endif; ?>
    </p>

    <?php if (!empty($event['description'])): ?>
      <p class="ev-desc-full">
        <?= nl2br(htmlspecialchars($event['description'])) ?>
      </p>
    <?php endif; ?>

    <div class="ev-collections" style="margin-top:18px;">
      <div class="ev-col-head">
        <h4 class="ev-col-title">Collections in this event</h4>
        <span class="ev-badge"><?= count($cols) ?></span>
      </div>
      <div class="ev-col-list">
        <?php if (!count($cols)): ?>
          <p class="muted">No collections in this event.</p>
        <?php else: ?>         
         <?php foreach ($cols as $c): ?>
            <div class="ev-col-item">
              <span class="ev-col-name"><?= htmlspecialchars($c['name']) ?></span>
              <a href="collection.php?id=<?= (int)$c['id_collection'] ?>" class="btn outline">View</a>
            </div>
          <?php endforeach; ?>
        <?php endif; ?>
      </div>
    </div>

    <div class="ev-actions" style="margin-top:20px;">
      <button
        id="d-review"
        class="btn outline"
        data-id="<?= (int)$event['id_event'] ?>"
        <?= $isPast ? "" : "disabled" ?>
      >
        <?= $isPast ? "Rate" : "Rate (after the event)" ?>
      </button>

      <button
        id="d-join"
        class="btn"
        data-id="<?= (int)$event['id_event'] ?>"
      >
        Interested
      </button>

      <button
        id="d-participate"
        class="btn outline"
        data-id="<?= (int)$event['id_event'] ?>"
        <?= $isPast ? "disabled" : "" ?>
      >
        Participate
      </button>
    </div>
  </section>

    </section>

<!-- ==== EDIT MODAL ==== -->
<div id="editEventModal" class="modal" aria-hidden="true">
  <div class="modal-content">
    <span class="close" id="edit-close" aria-label="Close">×</span>
    <h2>Edit Event</h2>

    <label>Name <input id="edit-name" required /></label>
    <label>Date <input id="edit-date" type="datetime-local" required /></label>
    <label>Description <textarea id="edit-desc" rows="4"></textarea></label>
    <label>Location <input id="edit-loc" /></label>

    <div class="modal-buttons">
      <button id="edit-cancel" class="btn outline">Cancel</button>
      <button id="edit-save" class="btn">Save</button>
    </div>
  </div>
</div>

  <!-- ==== RATE MODAL ==== -->
  <div id="reviewForm" class="modal" aria-hidden="true">
    <div class="modal-content">
      <span class="close" id="review-close" aria-label="Close">×</span>
      <h2 id="rv-title">Rate the event</h2>

      <label for="rv-collection">Collection</label>
      <select id="rv-collection">
        <option value="">Select a collection</option>
      </select>

      <div class="rv-stars" role="radiogroup">
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

  <!-- ==== PARTICIPATE MODAL ==== -->
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

<?php endif; ?>
</main>

<footer class="footer">
  <p>© 2025 MyCollections | All rights reserved.</p>
</footer>

</body>
</html>
