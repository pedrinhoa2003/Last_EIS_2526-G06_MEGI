<?php
require_once __DIR__ . "/partials/bootstrap.php";
require_once __DIR__ . "/dal/CollectionDAL.php";
require_once __DIR__ . "/dal/UserDAL.php";
require_once __DIR__ . "/dal/EventDAL.php"; 

// 1. Segurança
if (!isset($_SESSION["id_user"])) {
    header("Location: login.php");
    exit;
}

// 2. Buscar dados para o CONTEÚDO DA PÁGINA (Perfil e Coleções)
// Nota: A navbar vai buscar os seus próprios dados separadamente no partial
$userId = $_SESSION["id_user"];
$collections = CollectionDAL::getByUser($userId);
$user = UserDAL::getById($userId);
$showNavbarSearch = false;
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>User Profile | MyCollections</title>
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/user.css" />


  
  <script src="js/navbar.js"></script>
</head>
<body>

  <?php require_once __DIR__ . "/partials/navbar.php"; ?>

  <div class="page-container">
    <main class="main-content">
      
      <div class="profile-header">
        
        <div class="profile-photo">
            <?php if (!empty($user['profile_img'])): ?>
                <img src="<?= htmlspecialchars($user['profile_img']) ?>" alt="User Profile" 
                     style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
            <?php else: ?>
                <div style="width:100%; height:100%; background-color:#B22222; color:white; display:flex; align-items:center; justify-content:center; font-size:3rem; font-weight:bold;">
                    <?= strtoupper(substr($user['username'], 0, 1)) ?>
                </div>
            <?php endif; ?>

            <div class="edit-icon" id="editPhotoBtn">📷</div>
        </div>
        
        <div class="profile-info">
            <h1 id="displayName"><?= htmlspecialchars($user["username"]) ?></h1>
            <p id="displayEmail"><?= htmlspecialchars($user["email"]) ?></p>
            
            <button id="openEditProfile" class="btn" style="margin-top:10px; padding:5px 10px; font-size:14px; background:#555; color:white;">
                ✏️ Edit Profile
            </button>
            <button id="openPasswordModal" class="btn" style="margin-top:5px;">
                🔐 Change Password
              </button>


            <div style="margin-top:10px; color: #555;">
                <strong><?= count($collections) ?></strong> Collections Created
            </div>
        </div>
      </div>

      <section class="collections-section" id="myCollectionsSection">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>My Collections</h2>
            <button class="btn-add" id="openModal">+ Create New</button>
        </div>

        <?php if (empty($collections)): ?>
            <p style="text-align:center; color:#777; margin-top: 40px;">You haven't created any collections yet.</p>
        <?php else: ?>
            
            <div class="collections-grid">
                <?php foreach ($collections as $c): ?>
                    <?php 
                        $img = !empty($c['cover_img']) ? $c['cover_img'] : "img/collection-placeholder.jpg";
                        $rateValue = (float) ($c['rate'] ?? 0);
                        $rate = rtrim(rtrim(number_format($rateValue, 1, '.', ''), '0'), '.');
                        $catName = $c['category_name'] ?? 'General';
                    ?>
                    
                    <div class="collection-card">
                        <div class="collection-cover <?= empty($c['cover_img']) ? 'no-image' : 'has-image' ?>">
                            <?php if (!empty($c['cover_img'])): ?>
                                <img src="<?= htmlspecialchars($img) ?>" alt="Cover" class="collection-cover-img">
                            <?php else: ?>
                                <div class="cover-placeholder">
                                    <span class="cover-placeholder-icon">🖼️</span>
                                    <span>Add image</span>
                                </div>
                            <?php endif; ?>
                            <button class="cover-edit-trigger" data-collection-id="<?= $c['id_collection'] ?>">
                                <?= empty($c['cover_img']) ? 'Add image' : 'Edit' ?>
                            </button>
                            <span class="rate-badge">⭐ <?= $rate ?></span>
                        </div>

                        <h3><?= htmlspecialchars($c["name"]) ?></h3>
                        <span class="category-badge"><?= htmlspecialchars($catName) ?></span>
                        
                        <?php if (!empty($c['description'])): ?>
                            <p><?= htmlspecialchars(substr($c['description'], 0, 50)) ?>...</p>
                        <?php endif; ?>
                        
                        <p style="font-size:0.8rem; margin-top: auto;">
                            Created: <?= htmlspecialchars(substr($c["creation_date"], 0, 10)) ?>
                        </p>

                        <div style="display:flex; gap:10px; margin-top:10px;">

                <!-- MANAGE (vermelho elegante do site) -->
                <a  href="collection.php?id=<?= $c['id_collection'] ?>" 
                    class="btn"
                    style="
                        flex:1;
                        text-align:center;
                        padding:10px 0;
                        border-radius:8px;
                        background:linear-gradient(135deg,#b22222,#ff4c4c);
                        color:#fff;
                        font-weight:600;
                        box-shadow:0 4px 12px rgba(0,0,0,0.15);
                        transition:0.2s;
                        text-decoration:none;
                    "
                    onmouseover="this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.transform='none'"
                >
                    Manage
                </a>


                <!-- DELETE (clean, outline vermelho) -->
                <button  
                    class="delete-collection-btn"
                    data-id="<?= $c['id_collection'] ?>"
                    title="Delete Collection"
                    style="
                        padding:10px 12px;
                        border-radius:8px;
                        cursor:pointer;
                        background:#fff;
                        color:#b22222;
                        border:2px solid #f5b5b5;
                        font-weight:700;
                        transition:0.2s;
                        box-shadow:0 2px 6px rgba(0,0,0,0.05);
                    "
                    onmouseover="this.style.background='#ffe5e5'"
                    onmouseout="this.style.background='#fff'"
                >
                    🗑️
                </button>

            </div>

                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
      </section>
        
      
      <input type="file" id="updateCoverInput" accept="image/*" hidden>

<?php

      
require_once __DIR__ . "/dal/EventDAL.php";
$interestedEvents = EventDAL::getInterestedByUser($userId);
$upcomingEvents = EventDAL::getUpcomingParticipationByUser($userId);
$pastEvents     = EventDAL::getPastParticipationByUser($userId);

?>

<!-- ========================== -->
<!-- INTERESTED EVENTS SECTION -->
<!-- ========================== -->
<section class="events-section">
    <h2>⭐ Events I'm Interested In</h2>

    <?php if (empty($interestedEvents)): ?>
        <p style="color:#777;">You haven't marked interest in any event yet.</p>
    <?php else: ?>
        <div class="events-grid">
            <?php foreach ($interestedEvents as $ev): ?>
                <div class="event-card">
                    <h3><?= htmlspecialchars($ev["name"]) ?></h3>
                    <p><strong>Date:</strong> <?= htmlspecialchars($ev["event_date"]) ?></p>
                    <p><strong>Location:</strong> <?= htmlspecialchars($ev["location"]) ?></p>
                    <a href="event.php?id=<?= $ev['id_event'] ?>" class="btn">View Event</a>
                    
                     <button class="remove-interest-btn" data-id="<?= $ev['id_event'] ?>">✖</button>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>

<!-- ========================== -->
<!-- EVENT PARTICIPATION -->
<!-- ========================== -->
<section class="events-section">
    <h2>Events I'm Going To</h2>

    <?php if (empty($upcomingEvents)): ?>
        <p style="color:#777;">No upcoming events.</p>
    <?php else: ?>
        <div class="events-grid">
            <?php foreach ($upcomingEvents as $ev): ?>
                <div class="event-card">
                    <h3><?= htmlspecialchars($ev["name"]) ?></h3>
                    <p><strong>Date:</strong> <?= htmlspecialchars($ev["event_date"]) ?></p>
                    <p><strong>Location:</strong> <?= htmlspecialchars($ev["location"]) ?></p>
                    <p><strong>Collection:</strong> <?= htmlspecialchars($ev["collection_name"]) ?></p>

                    <a href="event.php?id=<?= $ev['id_event'] ?>" class="btn">View Event</a>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>

<section class="events-section">
    <h2>Events I Attended</h2>

    <?php if (empty($pastEvents)): ?>
        <p style="color:#777;">You haven't attended any events yet.</p>
    <?php else: ?>
        <div class="events-grid">
            <?php foreach ($pastEvents as $ev): ?>
                <div class="event-card past-event">
                    <h3><?= htmlspecialchars($ev["name"]) ?></h3>
                    <p><strong>Date:</strong> <?= htmlspecialchars($ev["event_date"]) ?></p>
                    <p><strong>Location:</strong> <?= htmlspecialchars($ev["location"]) ?></p>
                    <p><strong>Collection:</strong> <?= htmlspecialchars($ev["collection_name"]) ?></p>

                    <a href="event.php?id=<?= $ev['id_event'] ?>" class="btn">View Event</a>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>


<!-- ========================== -->
<!-- WISHLIST SECTION -->
<!-- ========================== -->
<section class="events-section">
    <h2>🧾 My Wishlist</h2>

    <p id="wishlistEmpty" style="color:#777; display:none;">You haven't added any items to your wishlist yet.</p>
    <div id="wishlistContainer" class="wishlist-grid"></div>
</section>        
        
    </main>
  </div>

  
  <div id="photoModal" class="modal">
    <div class="modal-content" style="max-width: 350px; text-align: center;">
      <h3>Change Profile Photo</h3>
      
      <div style="width: 150px; height: 150px; margin: 10px auto; border-radius: 50%; overflow: hidden; background: #eee; border: 3px solid #B22222;">
         <img id="newPhotoPreview" src="" alt="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
         <span id="newPhotoPlaceholder" style="line-height: 150px; color: #999;">Preview</span>
      </div>

      <input type="file" id="photoInput" accept="image/*" style="margin-top: 15px;">

      <div class="modal-buttons" style="justify-content: center; gap: 10px; margin-top: 20px;">
        <button id="savePhotoBtn" class="btn" style="background:#2ecc71; color:white;">💾 Save Photo</button>
        <button id="cancelPhotoBtn" class="btn" style="background:#e74c3c; color:white;">❌ Cancel</button>
      </div>
    </div>
  </div>
  
  <div id="createCollectionModal" class="modal">
  <div class="modal-content">
    <h2>Create New Collection</h2>

    <label for="collectionName">Name:</label>
    <input type="text" id="collectionName" placeholder="Enter collection name" required>

    <label for="collectionDescription">Description:</label>
    <input type="text" id="collectionDescription" placeholder="Enter collection description">

    <label for="collectionCategory">Category:</label>
    <select id="collectionCategory" required>
        <option value="">Loading categories...</option>
    </select>

    <label for="collectionImage">Image:</label>
    <div id="dropZoneCollection" class="drop-zone">
      <p>Drag & drop an image here, or click to select</p>
      <input type="file" id="collectionImage" accept="image/*" hidden>
    </div>
    <img id="collectionPreview" src="" alt="Preview" style="display:none; max-width:100%; margin-top:10px; border-radius:8px;">

    <div class="modal-buttons">
      <button id="saveCollection">💾 Save</button>
      <button id="cancelCollection">❌ Cancel</button>
    </div>
  </div>
</div>

  <div id="editProfileModal" class="modal">
    <div class="modal-content">
      <h2>Edit Profile</h2>
      <form id="editProfileForm">
        
        <label>Full Name:</label>
        <input type="text" id="editFullName" value="<?= htmlspecialchars($user['name'] ?? '') ?>" required>

        <label>Username:</label>
        <input type="text" id="editUsername" value="<?= htmlspecialchars($user['username'] ?? '') ?>" required>

        <label>Email:</label>
        <input type="email" id="editEmail" value="<?= htmlspecialchars($user['email'] ?? '') ?>" required>

        <label>Date of Birth:</label>
        <input type="date" id="editDob" value="<?= htmlspecialchars($user['date_of_birth'] ?? '') ?>">

        <div class="modal-buttons">
          <button type="submit" id="saveProfileBtn" style="background:#3498db; color:white;">💾 Save Changes</button>
          <button type="button" id="cancelProfileBtn" style="background:#ccc;">❌ Cancel</button>
        </div>
      </form>
    </div>
      </div>
    
 <div id="passwordModal" class="modal">
  <div class="modal-content">
    <h2>Change Password</h2>

    <form id="changePasswordForm">

      <div class="password-field">
        <input 
          type="password" 
          id="currentPassword" 
          placeholder="Current password"
          required
        >
        <button type="button" class="toggle-password" data-target="currentPassword">👁️</button>
      </div>

      <div class="password-field">
        <input 
          type="password" 
          id="newPassword" 
          placeholder="New password"
          required
        >
        <button type="button" class="toggle-password" data-target="newPassword">👁️</button>
      </div>

      <div class="password-field">
        <input 
          type="password" 
          id="confirmPassword" 
          placeholder="Confirm new password"
          required
        >
        <button type="button" class="toggle-password" data-target="confirmPassword">👁️</button>
      </div>

      <div class="modal-buttons">
        <button type="submit">💾 Change</button>
        <button type="button" id="cancelPasswordBtn">❌ Cancel</button>
      </div>

    </form>
  </div>
</div>


    
  <script src="js/user.js"></script>

  <footer class="footer">
    <p>© 2025 MyCollections | All rights reserved.</p>
  </footer>

</body>
</html>