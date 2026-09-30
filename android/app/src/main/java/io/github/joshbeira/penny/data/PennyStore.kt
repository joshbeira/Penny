package io.github.joshbeira.penny.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import io.github.joshbeira.penny.core.LetterText
import io.github.joshbeira.penny.core.Receipt
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

data class SavedLetter(val id: String, val title: String, val text: String, val savedAt: String, val favourite: Boolean)

/** App-private, explicitly saved text only. Photos and transient readings are never stored here. */
class PennyStore(context: Context, name: String = "penny.db") : SQLiteOpenHelper(context, name, null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE letters (id TEXT PRIMARY KEY, title TEXT NOT NULL, text TEXT NOT NULL, saved_at TEXT NOT NULL, favourite INTEGER NOT NULL DEFAULT 0)")
        db.execSQL("CREATE TABLE receipts (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL, ts TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL, method TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        error("No migration from $oldVersion to $newVersion. Your data has not been deleted.")
    }

    @Synchronized fun letters(): List<SavedLetter> = readableDatabase.rawQuery(
        "SELECT id,title,text,saved_at,favourite FROM letters ORDER BY favourite DESC,saved_at DESC", null,
    ).use { cursor -> buildList {
        while (cursor.moveToNext()) add(SavedLetter(cursor.getString(0), cursor.getString(1), cursor.getString(2), cursor.getString(3), cursor.getInt(4) == 1))
    } }

    @Synchronized fun save(title: String, text: String) {
        val checked = LetterText.checked(text)
        require(letters().size < 100) { "Your library holds 100 letters. Export and remove one before saving another." }
        writableDatabase.insertOrThrow("letters", null, ContentValues().apply {
            put("id", UUID.randomUUID().toString())
            put("title", title.trim().take(100).ifBlank { "Untitled letter" })
            put("text", checked)
            put("saved_at", Instant.now().toString())
            put("favourite", 0)
        })
    }
    @Synchronized fun favourite(letter: SavedLetter) {
        writableDatabase.update("letters", ContentValues().apply { put("favourite", if (letter.favourite) 0 else 1) }, "id = ?", arrayOf(letter.id))
    }
    @Synchronized fun delete(id: String) { writableDatabase.delete("letters", "id = ?", arrayOf(id)) }
    @Synchronized fun clearLetters() { writableDatabase.delete("letters", null, null) }

    @Synchronized fun receipts(): List<Receipt> = readableDatabase.rawQuery(
        "SELECT id,ts,action,details,method,prev_hash,hash FROM receipts ORDER BY sequence", null,
    ).use { cursor -> buildList {
        while (cursor.moveToNext()) add(Receipt(cursor.getString(0), cursor.getString(1), cursor.getString(2), cursor.getString(3), cursor.getString(4), cursor.getString(5), cursor.getString(6)))
    } }
    @Synchronized fun addReceipt(action: String, details: String) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val current = receipts()
            require(current.size < 1000) { "Receipt history is full. Export and clear it to continue." }
            require(Receipt.verify(current)) { "Receipt verification failed. Export and review your history before clearing it." }
            val r = Receipt.create(action, details, current.lastOrNull()?.hash ?: Receipt.GENESIS)
            db.insertOrThrow("receipts", null, ContentValues().apply {
                put("id", r.id); put("ts", r.ts); put("action", r.action); put("details", r.details)
                put("method", r.method); put("prev_hash", r.prevHash); put("hash", r.hash)
            })
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
    }
    @Synchronized fun clearReceipts() { writableDatabase.delete("receipts", null, null) }

    companion object {
        fun exportReceipts(entries: List<Receipt>): String = JSONArray(entries.map { r -> JSONObject().apply {
            put("id", r.id); put("ts", r.ts); put("action", r.action); put("details", r.details)
            put("method", r.method); put("prevHash", r.prevHash); put("hash", r.hash)
        } }).toString(2)
        fun exportLetters(entries: List<SavedLetter>): String = JSONArray(entries.map { l -> JSONObject().apply {
            put("id", l.id); put("title", l.title); put("text", l.text); put("savedAt", l.savedAt); put("favourite", l.favourite)
        } }).toString(2)
    }
}
