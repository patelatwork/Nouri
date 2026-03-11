"""Wellbeing scorer — rule-based + heuristic classifier.

Labels every post as beneficial / neutral / harmful and computes a
continuous wellbeing score between 0.0 (harmful) and 1.0 (beneficial).
"""

HARMFUL_TAGS = frozenset({
    "extreme_diet", "body_transformation", "pro_anorexia", "pro_bulimia",
    "luxury_comparison", "self_harm", "self-harm", "thinspo", "fitspiration",
    "diet_culture", "cosmetic_surgery", "gambling", "violence",
    "substance_abuse", "dangerous_challenge",
})

BENEFICIAL_TAGS = frozenset({
    "body_positivity", "mental_health_support", "educational", "motivational",
    "meditation", "mindfulness", "self_care", "learning", "science",
    "art", "creativity", "nature", "volunteering", "community",
    "fitness_healthy", "nutrition", "mental_health", "positive_affirmation",
})

HARMFUL_KEYWORDS = frozenset({
    "lose weight fast", "before and after body", "get skinny",
    "thigh gap", "flat stomach", "revenge body", "glow up transformation",
    "luxury lifestyle", "rich life", "flexing money",
})


def score_post(
    tags: list[str],
    title: str,
    description: str | None,
    user_age: int | None = None,
) -> tuple[str, float, str]:
    """Return (label, score, detail_text) for a given post.

    label: 'beneficial' | 'neutral' | 'harmful'
    score: 0.0 (worst) … 1.0 (best)
    detail_text: human-readable explanation
    """
    tag_set = {t.lower().strip() for t in tags}
    text_lower = f"{title} {description or ''}".lower()

    harmful_matches = tag_set & HARMFUL_TAGS
    beneficial_matches = tag_set & BENEFICIAL_TAGS

    keyword_harm = sum(1 for kw in HARMFUL_KEYWORDS if kw in text_lower)

    # Compute raw score
    score = 0.5  # neutral baseline
    score += 0.1 * len(beneficial_matches)
    score -= 0.15 * len(harmful_matches)
    score -= 0.1 * keyword_harm
    score = max(0.0, min(1.0, score))

    # Teen vulnerability multiplier — biases toward safety
    if user_age is not None and user_age < 18:
        if score < 0.5:
            score *= 0.7  # amplify harm signal for teens

    # Determine label
    if score >= 0.65:
        label = "beneficial"
        detail = f"Positive signals: {', '.join(beneficial_matches) or 'general positive content'}"
    elif score <= 0.35:
        label = "harmful"
        concerns = list(harmful_matches) + ([f"{keyword_harm} concerning phrases"] if keyword_harm else [])
        detail = f"Flagged for: {', '.join(concerns)}"
    else:
        label = "neutral"
        detail = "No strong positive or negative signals detected"

    return label, round(score, 3), detail


def wellbeing_score_for_ranking(
    tags: list[str],
    title: str,
    description: str | None,
    user_age: int | None = None,
) -> float:
    """Return just the numeric score for use in the ranking formula."""
    _, score, _ = score_post(tags, title, description, user_age)
    return score
