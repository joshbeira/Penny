package io.github.joshbeira.penny.core

object LetterText {
    const val MAX_LENGTH = 16000
    const val SAMPLE =
        "Oak Street Library\nDear reader,\nThe books you reserved are ready to collect. Please bring your library card to the front desk by Friday. We are open from nine in the morning until six in the evening.\nThank you,\nThe library team"

    fun checked(text: String): String {
        require(text.isNotBlank()) {
            "No text found. Try a clearer, well-lit photograph or paste the text."
        }
        require(text.length <= MAX_LENGTH) {
            "This letter is too long. Read one page at a time (up to 16,000 characters)."
        }
        return text.trim()
    }

    fun mask(text: String): String =
        text
            .replace(Regex("\\b\\d{2}[- ]\\d{2}[- ]\\d{2}\\b"), "••-••-••")
            .replace(Regex("\\b\\d(?:[ -]?\\d){3,}\\b"), "••••")

    fun speechChunks(text: String, limit: Int = 3000): List<String> {
        require(limit > 0)
        val chunks = mutableListOf<String>()
        var remaining = text.trim()
        while (remaining.isNotEmpty()) {
            val end =
                if (remaining.length <= limit) remaining.length
                else {
                    remaining.lastIndexOf(' ', limit).takeIf { it > limit / 2 } ?: limit
                }
            chunks += remaining.take(end)
            remaining = remaining.drop(end).trimStart()
        }
        return chunks
    }
}
