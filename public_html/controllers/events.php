<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../partials/bootstrap.php";
require_once __DIR__ . "/../dal/EventDAL.php";
require_once __DIR__ . "/../config/db.php";

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {

    // Se vier coleção, filtra pelos relacionamentos
    if (isset($_GET["collection"])) {
        $idCollection = (int) $_GET["collection"];
        $events = EventDAL::getByCollection($idCollection);
    } else {
        //Caso geral (ex: página de eventos)
        $events = EventDAL::getAll();
    }

    echo json_encode($events);
    exit;
}


/**
 * A partir daqui (POST/PUT/DELETE) é preciso login
 */
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(["ok" => false, "error" => "login required"]);
    exit;
}

$id_user = (int)$_SESSION["id_user"];

/**
 * Lê o JSON enviado no body
 */
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true) ?? [];

/**
 * POST → criar evento
 */
if ($method === "POST") {

    $name        = trim($data["name"]        ?? "");
    $event_date  = trim($data["event_date"]  ?? "");
    $description = trim($data["description"] ?? "") ?: null;
    $location    = trim($data["location"]    ?? "") ?: null;

    $collections = $data["collections"] ?? [];
    $items       = $data["items"]       ?? [];
  
    
    if (!$name || !$event_date) {
        echo json_encode(["ok" => false, "error" => "missing name/event_date"]);
        exit;
    }
    
     if (empty($collections) || empty($items)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "missing collections/items"]);
        exit;
    }


    // cria já com created_by
    $resp = EventDAL::create($name, $event_date, $description, $location, $id_user);


    if (!$resp["ok"]) {
        http_response_code(500);
        echo json_encode($resp);
        exit;
    }

    $id_event = (int)$resp["id_event"];

    EventDAL::addCollectionsToEvent($id_event, $collections);
    EventDAL::addItemsToEvent($id_event, $items);
    
    
    // PARTICIPAÇÃO AUTOMÁTICA DO CRIADOR + ITEMS

    $db = DB::conn();
    $db->set_charset("utf8mb4");

    $participations = [];

    // 1) inserir participações (user_event_participation)
    $stmtPart = $db->prepare("
        INSERT INTO user_event_participation (id_user, id_event, id_collection)
        VALUES (?, ?, ?)
    ");

    if (!$stmtPart) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $db->error]);
        exit;
    }

    foreach ($collections as $cid) {
        $cid = (int)$cid;
        if (!$cid) continue;

        $stmtPart->bind_param("iii", $id_user, $id_event, $cid);
        $stmtPart->execute();

        // guardar id_participation para esta coleção
        $participations[$cid] = $db->insert_id;
    }

    $stmtPart->close();

    // 2) inserir items escolhidos (user_event_items)
    $stmtItems = $db->prepare("
        INSERT INTO user_event_items (id_participation, id_item)
        VALUES (?, ?)
    ");

    if (!$stmtItems) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => $db->error]);
        exit;
    }

    /*
    $items vem do JS assim:
    items: [ "8", "13", "15" ]
    OU
    items: [ {id_item, id_collection} ]  (dependendo do teu JS)
    */

    // adapta conforme o teu formato REAL
    foreach ($items as $it) {

        // CASO 1: items = [id_item]
        if (is_numeric($it)) {
            $id_item = (int)$it;

            //  saber a coleção do item
            // se cada item pertence a UMA coleção
            $res = $db->query("
                SELECT id_collection
                FROM collection_items
                WHERE id_item = $id_item
                LIMIT 1
            ");

            if (!$res || !$row = $res->fetch_assoc()) continue;
            $cid = (int)$row["id_collection"];

        // CASO 2: items = [{id_item, id_collection}]
        } else {
            $id_item = (int)($it["id_item"] ?? 0);
            $cid     = (int)($it["id_collection"] ?? 0);
        }

        if (!$id_item || !isset($participations[$cid])) continue;

        $id_participation = $participations[$cid];
        $stmtItems->bind_param("ii", $id_participation, $id_item);
        $stmtItems->execute();
    }

    $stmtItems->close();
    echo json_encode(["ok" => true, "id_event" => $id_event]);
    exit;
    }




/**
 * PUT → editar (apenas se created_by = user)
 */
if ($method === "PUT") {
    $id_event    = (int)($data["id_event"] ?? 0);
    $name        = trim($data["name"]        ?? "");
    $event_date  = trim($data["event_date"]  ?? "");
    $description = trim($data["description"] ?? "") ?: null;
    $location    = trim($data["location"]    ?? "") ?: null;

    if (!$id_event || !$name || !$event_date) {
        echo json_encode(["ok" => false, "error" => "missing id/name/date"]);
        exit;
    }

    $resp = EventDAL::updateEvent($id_event, $name, $event_date, $description, $location, $id_user);

    echo json_encode($resp);
    exit;
}

/**
 * DELETE → apagar (apenas se created_by = user)
 */
if ($method === "DELETE") {
    $id_event = (int)($data["id_event"] ?? 0);

    if (!$id_event) {
        echo json_encode(["ok" => false, "error" => "missing id_event"]);
        exit;
    }

    $resp = EventDAL::deleteEvent($id_event, $id_user);
    echo json_encode($resp);
    exit;
}

http_response_code(405);
echo json_encode(["ok" => false, "error" => "method not allowed"]);
