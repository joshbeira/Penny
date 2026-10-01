package io.github.joshbeira.penny

import io.github.joshbeira.penny.core.LetterText
import io.github.joshbeira.penny.core.Receipt
import org.junit.Assert.*
import org.junit.Test

class CoreTest {
    @Test
    fun masksLongNumbersWithoutHidingAmounts() {
        assertEquals(
            "Card ••••; sort ••-••-••. Pay £25 by Friday.",
            LetterText.mask("Card 1234 5678 9012 3456; sort 12-34-56. Pay £25 by Friday."),
        )
    }

    @Test
    fun refusesEmptyOrOversizedReadings() {
        listOf("   ", "a".repeat(16001)).forEach { input ->
            assertThrows(IllegalArgumentException::class.java) { LetterText.checked(input) }
        }
        assertEquals("Library letter", LetterText.checked("  Library letter  "))
    }

    @Test
    fun chunksLongSpeechWithoutLosingContent() {
        val text = (1..2500).joinToString(" ") { "word$it" }
        val chunks = LetterText.speechChunks(text, 1000)
        assertTrue(chunks.all { it.length <= 1000 })
        assertEquals(text, chunks.joinToString(" "))
        assertEquals(emptyList<String>(), LetterText.speechChunks("  "))
    }

    @Test
    fun verifiesAndRejectsTamperedReceiptChains() {
        val first = Receipt.create("Sample card order", "No card ordered", Receipt.GENESIS)
        val second = Receipt.create("Sample payment flagged", "No report sent", first.hash)
        assertTrue(Receipt.verify(listOf(first, second)))
        assertFalse(Receipt.verify(listOf(first.copy(details = "edited"), second)))
        assertFalse(Receipt.verify(listOf(second)))
        assertFalse(Receipt.verify(listOf(first, second.copy(prevHash = Receipt.GENESIS))))
    }

    @Test
    fun matchesWebHashPreimageContract() {
        val r =
            Receipt(
                "fixture",
                "2026-01-01T00:00:00Z",
                "test",
                "sample",
                "button",
                Receipt.GENESIS,
                "",
            )
        assertEquals(64, r.digest().length)
        assertEquals(r.digest(), r.copy(id = "other").digest())
    }
}
