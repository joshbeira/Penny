package io.github.joshbeira.penny.core

import java.security.MessageDigest
import java.time.Instant
import java.util.UUID

data class Receipt(
    val id: String,
    val ts: String,
    val action: String,
    val details: String,
    val method: String,
    val prevHash: String,
    val hash: String,
) {
    fun digest(): String = MessageDigest.getInstance("SHA-256")
        .digest("$prevHash|$ts|$action|$details|$method".toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it) }

    companion object {
        val GENESIS = "0".repeat(64)
        fun create(action: String, details: String, previous: String): Receipt {
            val entry = Receipt(UUID.randomUUID().toString(), Instant.now().toString(), action, details, "button", previous, "")
            return entry.copy(hash = entry.digest())
        }
        fun verify(entries: List<Receipt>): Boolean = entries.withIndex().all { (i, entry) ->
            entry.prevHash == (entries.getOrNull(i - 1)?.hash ?: GENESIS) && entry.hash == entry.digest()
        }
    }
}
