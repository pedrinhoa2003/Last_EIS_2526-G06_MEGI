<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . "/partials/bootstrap.php"; 
require_once __DIR__ . "/dal/ItemDAL.php";

if (!isset($_GET['id']) || empty($_GET['id'])) {
    die("Erro: Nenhum item selecionado. <a href='home.php'>Voltar</a>");
}

$id_item = (int)$_GET['id'];
$item = ItemDAL::getById($id_item);
// Identificar coleção correta (se vier no URL)
$collectionId = isset($_GET['col']) ? (int) $_GET['col'] : null;


if (!$item) {
    die("Erro: Item não encontrado.");
}

// --- VERIFICAÇÃO DE DONO ---
$isOwner = false;
if (isset($_SESSION['id_user']) && $_SESSION['id_user'] == $item['owner_id']) {
    $isOwner = true;
}
// --- WISHLIST INFO ---
$db = DB::conn();

// Quantas wishlists têm este item
$wishlistCountStmt = $db->prepare('SELECT COUNT(DISTINCT id_wishlist) AS total FROM wishlist_items WHERE id_item = ?');
$wishlistCountStmt->bind_param('i', $id_item);
$wishlistCountStmt->execute();
$wishlistCountResult = $wishlistCountStmt->get_result()->fetch_assoc();
$wishlistCount = (int) ($wishlistCountResult['total'] ?? 0);

// Está na wishlist do utilizador autenticado?
$inWishlist = false;
if (isset($_SESSION['id_user'])) {
    $wishlistCheckStmt = $db->prepare('SELECT wi.id_wishlist FROM wishlist_items wi JOIN wishlists w ON wi.id_wishlist = w.id_wishlist WHERE w.id_user = ? AND wi.id_item = ? LIMIT 1');
    $wishlistCheckStmt->bind_param('ii', $_SESSION['id_user'], $id_item);
    $wishlistCheckStmt->execute();
    $wishlistCheckResult = $wishlistCheckStmt->get_result()->fetch_assoc();
    $inWishlist = !empty($wishlistCheckResult);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title><?php echo htmlspecialchars($item['name']); ?> | Details</title>
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/item.css" />
  <link rel="stylesheet" href="css/collection.css"> 
  <script src="js/navbar.js"></script>
</head>
<body>

  <?php require_once __DIR__ . "/partials/navbar.php"; ?>

  <main class="item-page-container">
    <div class="item-header">
      
      <img src="<?php echo htmlspecialchars($item['img']); ?>" 
           alt="<?php echo htmlspecialchars($item['name']); ?>" 
           class="main-item-img"
           style="max-width: 400px; object-fit: cover;"
           onerror="this.src='img/item-placeholder.jpg'" />

<div class="item-info">
        
        <div class="item-collection-tag">
            <a href="collection.php?id=<?= $item['id_collection'] ?>">
                <span class="icon">📁</span> 
                <?= htmlspecialchars($item['collection_name'] ?? 'Collection') ?>
            </a>
        </div>

        <div class="item-title-row">
          <h1 class="item-title"><?php echo htmlspecialchars($item['name']); ?></h1>

          <div class="like-container" aria-label="Gostar deste item">
            <button
              id="wishlistBtn"
              class="like-btn"
              type="button"
              aria-pressed="<?= $inWishlist ? 'true' : 'false' ?>"
              data-item-id="<?= $item['id_item'] ?>"
              data-in-wishlist="<?= $inWishlist ? '1' : '0' ?>"
              data-logged-in="<?= isset($_SESSION['id_user']) ? '1' : '0' ?>"
              title="Adicionar à wishlist"
            ><?= $inWishlist ? '❤' : '♡' ?></button>
            <span
              id="wishlistCount"
              class="like-count"
              aria-live="polite"
              data-total-wishlists="<?= $wishlistCount ?>"
            ><?= $wishlistCount ?></span>
          </div>
        </div>
        
        <p class="item-category">
            Importance: <?php echo htmlspecialchars($item['importance']); ?>/10
        </p>

        <section class="tech-sheet">
          <h2>Technical Sheet</h2>
          <ul class="spec-grid">
            <li><span class="k">Name</span><span class="v"><?php echo htmlspecialchars($item['name']); ?></span></li>
            <li><span class="k">Franchise</span><span class="v"><?php echo htmlspecialchars($item['franchise'] ?? '-'); ?></span></li>
            <li><span class="k">Weight</span><span class="v"><?php echo htmlspecialchars($item['weight']); ?> g</span></li>
            <li><span class="k">Price</span><span class="v"><?php echo htmlspecialchars($item['price']); ?> €</span></li>
            <li><span class="k">Acquired</span><span class="v"><?php echo htmlspecialchars($item['acquisition_date']); ?></span></li>
          </ul>
        </section>
      </div>
    </div>

    <section class="description">
      <h2>Description</h2>
      <p><?php echo nl2br(htmlspecialchars($item['description'] ?? 'No description available.')); ?></p>
    </section>

    <?php if ($isOwner): ?>
    <div class="footer-actions" style="margin-top: 30px; display: flex; gap: 10px;">
      
      <button id="btn-edit" class="btn" 
              data-id="<?= $item['id_item'] ?>"
              data-name="<?= htmlspecialchars($item['name']) ?>"
              data-desc="<?= htmlspecialchars($item['description'] ?? '') ?>"
              data-rating="<?= $item['importance'] ?>"
              data-price="<?= $item['price'] ?>"
              data-weight="<?= $item['weight'] ?>"
              data-franchise="<?= htmlspecialchars($item['franchise'] ?? '') ?>"
              data-date="<?= $item['acquisition_date'] ?>"
              style="background:#3498db; color:white; padding: 10px 20px; border:none; border-radius:5px; cursor:pointer;">
              ✏️ Edit
      </button>

    <button id="btn-delete" 
      data-id="<?= $item['id_item'] ?>" 
      data-col-id="<?= $collectionId ?>"
      class="btn"> 🗑️ Delete
</button>

    </div>
    <?php endif; ?>

    <a href="javascript:history.back()" class="back-btn" style="display:block; margin-top:20px;">← Back</a>
  </main>

  <?php if ($isOwner): ?>
  <div id="editItemModal" class="modal">
    <div class="modal-content">
      <h2>Edit Item</h2>
      <form id="editItemForm">
        <input type="hidden" id="editIdItem">
        
        <label>Name:</label>
        <input type="text" id="editName" required>

        <label>Description:</label>
        <input type="text" id="editDesc">

        <label>Franchise:</label>
        <input type="text" id="editFranchise">

        <div style="display:flex; gap:10px;">
            <div style="flex:1;">
                <label>Importance (1-10):</label>
                <input type="number" id="editRating" min="1" max="10" required>
            </div>
            <div style="flex:1;">
                <label>Price (€):</label>
                <input type="number" id="editPrice" step="0.01" required>
            </div>
        </div>

        <div style="display:flex; gap:10px;">
            <div style="flex:1;">
                <label>Weight (g):</label>
                <input type="number" id="editWeight" step="1" required>
            </div>
            <div style="flex:1;">
                <label>Date:</label>
                <input type="date" id="editDate" required>
            </div>
        </div>

        <label>Change Image (Optional):</label>
        <input type="file" id="editImage" accept="image/*">

        <div class="modal-buttons" style="margin-top:20px; display:flex; justify-content:space-between;">
          <button type="submit" id="saveEditBtn" style="background:#3498db; color:white; padding:10px 20px; border:none; border-radius:5px; cursor:pointer;">💾 Update</button>
          <button type="button" id="cancelEditBtn" style="background:#ccc; padding:10px 20px; border:none; border-radius:5px; cursor:pointer;">❌ Cancel</button>
        </div>
      </form>
    </div>
  </div>
  
  
  <?php endif; ?>

  <footer class="footer">
    <p>© 2025 MyCollections | All rights reserved.</p>
  </footer>
  <script src="js/item.js"></script>
</body>
</html>