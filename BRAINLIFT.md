# 🧠 SnapConnect Brainlift Document

## 📌 Arena

**AI-powered content personalization for small, private social groups using RAG (Retrieval-Augmented Generation)**

## 🎯 Niche

**Social Connectors** → Friend groups coordinating activities and sharing experiences on ephemeral platforms.

## ✅ User Stories (RAG-Powered)

1. As a user, I want AI to suggest fun, relevant captions for my group photos based on shared memories and inside jokes.
2. As a user, I want personalized story prompts about recent hangouts or upcoming plans that match my friend group's shared interests.
3. As a user, I want the app to recommend group activity ideas based on our past experiences and seasonal trends.
4. As a user, I want AI-generated content suggestions that align with my group's favorite topics, places, and humor style.
5. As a user, I want intelligent reminders and post suggestions tied to key friend group events, like birthdays or past milestones.
6. As a user, I want the app to highlight and recommend new content or events that match what my group typically shares or reacts to.

## 🧩 Additional RAG Functionality Being Explored

* **Group Chat Suggestions**: Recommend users to add based on chat history, group name/description, and group interests.
* **Throwback Story Suggestions**: Resurface meaningful group memories (e.g., trips, events) as shareable prompts.
* **Mood-Aware Captions**: Detect chat tone or photo mood to match captions (e.g., "late night chaos").
* **Inside Joke Generator**: Suggest captions using repeated group phrases, emojis, or nicknames.
* **Post Timing Advisor**: Recommend optimal posting time/format based on past engagement.
* **Group Personality Embedding**: Use tone/style fingerprint to shape suggestions (e.g., sarcastic vs. wholesome).

## 🔍 Curated Insights

### Insight 1

**Summary:** RAG improves relevance by grounding generation in personal context.
**Why it matters:** Enables more tailored and memory-aware interactions.
**Question:** How to capture context from ephemeral chats efficiently?

### Insight 2

**Summary:** Group behavior is a better predictor of engagement than individual metrics alone.
**Why it matters:** Social experiences are collective, not isolated.
**Question:** What data best represents a group identity?

## ⚡ Spiky POVs

* "Most think personalization ends with the individual. Actually, the most compelling AI experiences are shared."
* "Stop suggesting content from trends. Start creating it with your users, grounded in their group memories."
* "Most platforms want to be smart. What if the smarter platform *felt* more personal, not more automated?"

## 🧪 In-Progress Questions

1. Best embedding strategy for group chat history?
2. How to use group description/name as retrieval anchors?
3. Scoring new user compatibility for group add?
4. Balancing fast mobile UX with rich context retrieval?

## 🛠 RAG Pipeline Snapshots

* **Group Match**: Embed group info + chat, retrieve similar users, generate add suggestions.
* **Throwbacks**: Time-filter chat memories, retrieve past events, prompt nostalgic story.
* **Mood Captions**: Run sentiment/mood model on chat/photo, retrieve fitting captions.
* **Inside Jokes**: Mine repeated tokens/emojis, suggest context-aware caption.
* **Post Advisor**: Use past metadata to suggest ideal post time and type.

## 🧘 Final Reflections

SnapConnect with RAG is not just a clone—it's a demonstration of how AI can support authentic, *relational* content generation. The future of AI in social apps isn't about more recommendations—it's about **contextual creativity** that reflects the personality of a group, not just an individual.

--- 