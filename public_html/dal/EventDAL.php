<?php
require_once __DIR__ . "/../config/db.php";

class EventDAL {

    // LISTAR TODOS OS EVENTOS
    public static function getAll() {
        $db = DB::conn();
        // We added the Subquery for collection_covers here
        $res = $db->query("
            SELECT
                e.id_event,
                e.name,
                e.event_date,
                e.description,
                e.location,
                e.created_by,
                (SELECT GROUP_CONCAT(c.cover_img) 
                 FROM event_collections ec 
                 JOIN collections c ON ec.id_collection = c.id_collection 
                 WHERE ec.id_event = e.id_event) AS collection_covers
            FROM events e
            ORDER BY e.event_date ASC
        ");

        if (!$res) return [];
        return $res->fetch_all(MYSQLI_ASSOC);
    }


    // IR BUSCAR EVENTO POR ID
    public static function getById($id_event) {
        $db = DB::conn();
        $stmt = $db->prepare("SELECT * FROM events WHERE id_event = ?");
        $stmt->bind_param("i", $id_event);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    // EVENTOS DE UMA COLEÇÃO
    public static function getByCollection($id_collection) {
        $db = DB::conn();
        $stmt = $db->prepare("
            SELECT e.*
            FROM event_collections ec
            JOIN events e ON e.id_event = ec.id_event
            WHERE ec.id_collection = ?
            ORDER BY e.event_date ASC
        ");
        $stmt->bind_param("i", $id_collection);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
     
    
    public static function create($name, $event_date, $description, $location, $id_user) {
    $db = DB::conn();

    $stmt = $db->prepare("
        INSERT INTO events (name, event_date, description, location, created_by)
        VALUES (?, ?, ?, ?, ?)
    ");

    if (!$stmt) return ["ok" => false, "error" => $db->error];

    $stmt->bind_param("ssssi", $name, $event_date, $description, $location, $id_user);

    if (!$stmt->execute()) return ["ok" => false, "error" => $stmt->error];

    return ["ok" => true, "id_event" => $stmt->insert_id];
}



    // ADICIONAR COLEÇÕES AO EVENTO
    public static function addCollectionsToEvent($id_event, $collections) {
        $db = DB::conn();
        $stmt = $db->prepare("
            INSERT INTO event_collections (id_event, id_collection)
            VALUES (?, ?)
        ");

        foreach ($collections as $id_collection) {
            $stmt->bind_param("ii", $id_event, $id_collection);
            $stmt->execute();
        }
    }

    // ADICIONAR ITENS AO EVENTO
    public static function addItemsToEvent($id_event, $items) {
        $db = DB::conn();
        $stmt = $db->prepare("
            INSERT INTO event_items (id_event, id_item)
            VALUES (?, ?)
        ");

        foreach ($items as $id_item) {
            $stmt->bind_param("ii", $id_event, $id_item);
            $stmt->execute();
        }
    }

    // =======================================
    // 👉 NOVO: EVENTOS INTERESSADOS PELO USER
    // =======================================
    public static function getInterestedByUser($id_user) {
        $db = DB::conn();
        $stmt = $db->prepare("
            SELECT e.*
            FROM user_events_interest uei
            JOIN events e ON e.id_event = uei.id_event
            WHERE uei.id_user = ?
            ORDER BY e.event_date ASC
        ");
        $stmt->bind_param("i", $id_user);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // =======================================
    // NOVO: EVENTOS QUE O USER VAI PARTICIPAR
    // =======================================
    public static function getParticipationByUser($id_user) {
    $db = DB::conn();

    // Buscar info principal + nome da coleção
    $stmt = $db->prepare("
        SELECT 
            e.id_event,
            e.name,
            e.event_date,
            e.location,
            c.name AS collection_name,
            uep.id_collection,
            uep.id_participation
        FROM user_event_participation uep
        JOIN events e ON e.id_event = uep.id_event
        JOIN collections c ON c.id_collection = uep.id_collection
        WHERE uep.id_user = ?
        ORDER BY e.event_date ASC
    ");
    
    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $participations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // os itens escolhidos em cada participação
    foreach ($participations as &$p) {
        $stmt2 = $db->prepare("
            SELECT i.name
            FROM user_event_items uei
            JOIN items i ON i.id_item = uei.id_item
            WHERE uei.id_participation = ?
        ");

        $stmt2->bind_param("i", $p["id_participation"]);
        $stmt2->execute();

        $p["items"] = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    return $participations;
}

//eventos futuros que o user vai participar
public static function getUpcomingParticipationByUser($id_user) {
    $db = DB::conn();

    $stmt = $db->prepare("
        SELECT 
            e.id_event,
            e.name,
            e.event_date,
            e.location,
            c.name AS collection_name,
            uep.id_collection,
            uep.id_participation
        FROM user_event_participation uep
        JOIN events e ON e.id_event = uep.id_event
        JOIN collections c ON c.id_collection = uep.id_collection
        WHERE uep.id_user = ?
          AND e.event_date >= CURDATE()
        ORDER BY e.event_date ASC
    ");

    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $participations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // itens escolhidos
    foreach ($participations as &$p) {
        $stmt2 = $db->prepare("
            SELECT i.name
            FROM user_event_items uei
            JOIN items i ON i.id_item = uei.id_item
            WHERE uei.id_participation = ?
        ");
        $stmt2->bind_param("i", $p["id_participation"]);
        $stmt2->execute();
        $p["items"] = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    return $participations;
}

//evetnso passados que o user participou
public static function getPastParticipationByUser($id_user) {
    $db = DB::conn();

    $stmt = $db->prepare("
        SELECT 
            e.id_event,
            e.name,
            e.event_date,
            e.location,
            c.name AS collection_name,
            uep.id_collection,
            uep.id_participation
        FROM user_event_participation uep
        JOIN events e ON e.id_event = uep.id_event
        JOIN collections c ON c.id_collection = uep.id_collection
        WHERE uep.id_user = ?
          AND e.event_date < CURDATE()
        ORDER BY e.event_date DESC
    ");

    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $participations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    foreach ($participations as &$p) {
        $stmt2 = $db->prepare("
            SELECT i.name
            FROM user_event_items uei
            JOIN items i ON i.id_item = uei.id_item
            WHERE uei.id_participation = ?
        ");
        $stmt2->bind_param("i", $p["id_participation"]);
        $stmt2->execute();
        $p["items"] = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    return $participations;
}


// UPDATE EVENT (OWNER ONLY)
public static function updateEvent($id_event, $name, $event_date, $description, $location, $id_user) {
    $db = DB::conn();

    $stmt = $db->prepare("
        UPDATE events
        SET name = ?, event_date = ?, description = ?, location = ?
        WHERE id_event = ? AND created_by = ?
    ");

    if (!$stmt) {
        return ["ok" => false, "error" => $db->error];
    }

    $stmt->bind_param(
        "ssssii",
        $name,
        $event_date,
        $description,
        $location,
        $id_event,
        $id_user
    );

    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        return ["ok" => false, "error" => "not_owner_or_not_found"];
    }

    return ["ok" => true];
}


    // TROCAR TODAS AS COLEÇÕES DO EVENTO
    public static function replaceCollectionsForEvent($id_event, $collections) {
        $db = DB::conn();

        // apaga todas
        $del = $db->prepare("DELETE FROM event_collections WHERE id_event = ?");
        $del->bind_param("i", $id_event);
        $del->execute();

        if (empty($collections)) return;

        $ins = $db->prepare("
            INSERT INTO event_collections (id_event, id_collection)
            VALUES (?, ?)
        ");

        foreach ($collections as $id_collection) {
            $ins->bind_param("ii", $id_event, $id_collection);
            $ins->execute();
        }
    }

    // TROCAR TODOS OS ITENS DO EVENTO
    public static function replaceItemsForEvent($id_event, $items) {
        $db = DB::conn();

        // apaga todos
        $del = $db->prepare("DELETE FROM event_items WHERE id_event = ?");
        $del->bind_param("i", $id_event);
        $del->execute();

        if (empty($items)) return;

        $ins = $db->prepare("
            INSERT INTO event_items (id_event, id_item)
            VALUES (?, ?)
        ");

        foreach ($items as $id_item) {
            $ins->bind_param("ii", $id_event, $id_item);
            $ins->execute();
        }
    }

    // APAGAR EVENTO (e tudo ligado a ele) – só se for do próprio user
    // ==========================
// DELETE EVENT (OWNER ONLY)
// ==========================
public static function deleteEvent($id_event, $id_user) {
    $db = DB::conn();
    $db->begin_transaction();

    try {
        $db->query("DELETE FROM user_event_items WHERE id_participation IN (
            SELECT id_participation FROM user_event_participation WHERE id_event = $id_event
        )");

        $db->query("DELETE FROM user_event_participation WHERE id_event = $id_event");
        $db->query("DELETE FROM user_events_interest WHERE id_event = $id_event");
        $db->query("DELETE FROM event_collections WHERE id_event = $id_event");
        $db->query("DELETE FROM event_items WHERE id_event = $id_event");

        $stmt = $db->prepare("
            DELETE FROM events
            WHERE id_event = ? AND created_by = ?
        ");
        $stmt->bind_param("ii", $id_event, $id_user);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            $db->rollback();
            return ["ok" => false, "error" => "not_owner_or_not_found"];
        }

        $db->commit();
        return ["ok" => true];

    } catch (Exception $e) {
        $db->rollback();
        return ["ok" => false, "error" => $e->getMessage()];
    }
}
}
