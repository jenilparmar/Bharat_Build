from backend.db import notes_collection
from backend.chatbot import store_note_embeddings

notes = notes_collection.find()

for note in notes:

    note_id = str(note["_id"])
    user_id = note["user_id"]

    text = note.get("structured_note") or note.get("raw_note")

    if text:
        print("Embedding note:", note_id)

        store_note_embeddings(
            text,
            user_id,
            note_id
        )

print("All existing notes embedded!")