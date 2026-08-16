// ============================================================
// js/storage.js
// 必看 · 剪辑 - IndexedDB 操作
// ============================================================

const DB_NAME = 'VideoEditorDB';
const DB_VERSION = 2;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('projects')) {
                db.createObjectStore('projects', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbAdd(storeName, data) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.add(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        });
    });
}

function dbPut(storeName, data) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        });
    });
}

function dbGet(storeName, id) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        });
    });
}

function dbGetAll(storeName) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        });
    });
}

function dbDelete(storeName, id) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        });
    });
}
