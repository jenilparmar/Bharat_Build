from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from backend.auth import router as auth_router, get_current_user
from backend.db import notes_collection, chats_collection, saved_chats_collection, users_collection, fs
from backend.models import Note
from datetime import datetime
from zoneinfo import ZoneInfo
from backend.ai_formatter import format_notes
import shutil
import os
import requests
import traceback
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
FETCHTRANSCRIPT_API_KEY = os.getenv("FETCHTRANSCRIPT_API_KEY", "")
from backend.audio_transcriber import transcribe_audio_chunks
import tempfile
import re
from collections import Counter
from backend.pdf_processor import extract_pages
from backend.chatbot import store_note_embeddings, ask_chatbot, delete_note_embeddings

app = FastAPI()

IST = ZoneInfo("Asia/Kolkata")


def get_ist_timestamp():
    # Store ISO timestamp with +05:30 offset so clients render correct India time.
    return datetime.now(IST).isoformat()

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://study-minutes.vercel.app",
        "https://www.studyminutes.tech",
        "https://studyminutes.tech",
        "https://studyminutes.duckdns.org",
        "https://study-minutes.onrender.com",
    ],
    allow_origin_regex=r"https://.*(studyminutes\.tech|vercel\.app|onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Include auth routes
app.include_router(auth_router)

def notes_filter_for_user(user):
    # Support both current and older note records for the same account.
    return {
        "$or": [
            {"user_id": str(user["_id"])},
            {"email": user["email"]},
        ]
    }


def extract_subject(note_doc):
    """Extract subject line from structured/raw note text."""
    note_text = (note_doc.get("structured_note") or note_doc.get("raw_note") or "")
    if not isinstance(note_text, str):
        return ""

    # Remove bold markdown before matching `Subject:` lines.
    clean_text = note_text.replace("**", "")
    match = re.search(r"Subject:\s*([^\n]+)", clean_text, flags=re.IGNORECASE)
    if not match:
        return ""

    return match.group(1).strip()


def extract_youtube_video_id(youtube_url):
    """Extract YouTube video id from standard URL formats."""
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/shorts/)([^&\n?#]+)",
        r"youtube\.com/watch\?.*v=([^&\n?#]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)

    return None


def fetch_transcript_from_fetchtranscript(video_id):
    """Fetch transcript text from FetchTranscript API."""
    if not FETCHTRANSCRIPT_API_KEY:
        raise HTTPException(status_code=500, detail="FetchTranscript API key is not configured")

    url = f"https://api.fetchtranscript.com/v1/transcripts/{video_id}"
    headers = {
        "Authorization": f"Bearer {FETCHTRANSCRIPT_API_KEY}",
    }
    params = {
        "format": "text",
        "lang": "en",
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch transcript provider: {exc}")

    error_payload = {}
    error_message = ""
    try:
        error_payload = response.json() if response.content else {}
        if isinstance(error_payload, dict):
            error_message = (error_payload.get("message") or "").strip()
    except ValueError:
        error_payload = {}
        error_message = ""

    if response.status_code == 404:
        raise HTTPException(
            status_code=400,
            detail=error_message or "No transcript available for this video"
        )

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=500,
            detail=error_message or "FetchTranscript API authentication failed"
        )

    if response.status_code == 402:
        raise HTTPException(
            status_code=402,
            detail=error_message or "FetchTranscript credits exhausted"
        )

    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail=error_message or "Transcript provider rate limit exceeded"
        )

    if response.status_code == 503:
        raise HTTPException(
            status_code=503,
            detail=error_message or "Transcript provider temporarily unavailable"
        )

    if response.status_code >= 400:
        provider_error_code = ""
        if isinstance(error_payload, dict):
            provider_error_code = (error_payload.get("error") or "").strip()

        detail = error_message or f"Transcript provider error ({response.status_code})"
        if provider_error_code:
            detail = f"{provider_error_code}: {detail}"

        raise HTTPException(status_code=502, detail=detail)

    payload = response.json()

    # Handle multiple possible payload shapes safely.
    transcript_text = ""
    for key in ["text", "transcript_text", "transcript", "content"]:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            transcript_text = value.strip()
            break

        if isinstance(value, list):
            parts = []
            for item in value:
                if isinstance(item, dict):
                    text_part = (item.get("text") or item.get("content") or "").strip()
                    if text_part:
                        parts.append(text_part)
                elif isinstance(item, str) and item.strip():
                    parts.append(item.strip())
            if parts:
                transcript_text = " ".join(parts)
                break

    if not transcript_text:
        raise HTTPException(status_code=400, detail="Transcript was empty for this video")

    metadata = payload.get("metadata") if isinstance(payload, dict) else None
    metadata_title = metadata.get("title") if isinstance(metadata, dict) else ""
    video_title = payload.get("title") or payload.get("video_title") or metadata_title or f"YouTube Video ({video_id[:8]})"
    return transcript_text, video_title

# Example protected route
@app.get("/protected")
def protected(user = Depends(get_current_user)):
    return {
        "message": "You are authenticated",
        "email": user["email"]
    }

@app.get("/")
def root():
    return {"message": "StudyMinutes Backend is running 🚀"}

# Upload note
@app.post("/upload-note")
async def upload_note(data: dict, user=Depends(get_current_user)):
    raw_text = (data.get("content") or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Note content cannot be empty")

    try:
        # AI formats note
        structured_note = format_notes(raw_text)

        note_data = {
            "user_id": str(user["_id"]),  
            "email": user["email"],
            "raw_note": raw_text,
            "structured_note": structured_note,
            "created_at": get_ist_timestamp()
        }

        result = notes_collection.insert_one(note_data)

        # Embedding storage is best-effort
        try:
            store_note_embeddings(
                structured_note,
                str(user["_id"]),
                str(result.inserted_id)
            )
        except Exception as e:
            print(f"Warning: Failed to store embeddings for note {result.inserted_id}: {e}")

        return {
            "message": "Note saved with AI formatting",
            "note": structured_note
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving note: {str(e)}")

# Get logged-in user's notes
@app.get("/my-notes")
async def get_notes(user=Depends(get_current_user)):

    notes = list(notes_collection.find(notes_filter_for_user(user)))

    for note in notes:
        note["_id"] = str(note["_id"])

    return notes

@app.get("/my-notes/count")
async def get_notes_count(user=Depends(get_current_user)):
    total_notes = notes_collection.count_documents(notes_filter_for_user(user))
    return {"total_notes": total_notes}

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...), user=Depends(get_current_user)):

    with tempfile.NamedTemporaryFile(delete=False) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    try:
        # Speech -> text
        raw_text = transcribe_audio_chunks(temp_path)
        if not raw_text or not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not transcribe audio. The audio may be silent or unclear.")

        # Text -> structured notes
        structured_notes = format_notes(raw_text)

        note_data = {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "raw_note": raw_text,
            "structured_note": structured_notes,
            "created_at": get_ist_timestamp()
        }

        result = notes_collection.insert_one(note_data)

        # Embedding storage is best-effort
        try:
            store_note_embeddings(
                structured_notes,
                str(user["_id"]),
                str(result.inserted_id)
            )
        except Exception as e:
            print(f"Warning: Failed to store embeddings for audio note {result.inserted_id}: {e}")

        return {
            "message": "Audio converted successfully",
            "note": structured_notes
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/upload-youtube")
async def upload_youtube(data: dict, user=Depends(get_current_user)):
    """
    Process YouTube URL by fetching transcript from FetchTranscript API,
    then format and store as structured notes.
    Expects: {"youtube_url": "https://www.youtube.com/watch?v=..."}
    """
    
    try:
        youtube_url = (data.get("youtube_url") or "").strip()

        if not youtube_url:
            raise HTTPException(status_code=400, detail="YouTube URL is required")

        video_id = extract_youtube_video_id(youtube_url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")

        transcript_text, video_title = fetch_transcript_from_fetchtranscript(video_id)
        
        # Format text to structured notes
        structured_notes = format_notes(transcript_text)

        # Add source info to raw note for traceability
        raw_text_with_source = (
            f"[Source: YouTube - {video_title}]\n"
            f"[URL: {youtube_url}]\n\n"
            f"{transcript_text}"
        )
        
        note_data = {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "raw_note": raw_text_with_source,
            "structured_note": structured_notes,
            "source": "youtube",
            "youtube_url": youtube_url,
            "video_title": video_title,
            "created_at": get_ist_timestamp()
        }
        
        result = notes_collection.insert_one(note_data)
        
        # Store embeddings for search
        store_note_embeddings(
            structured_notes,
            str(user["_id"]),
            str(result.inserted_id)
        )
        
        return {
            "message": "YouTube transcript processed successfully",
            "video_title": video_title,
            "note": structured_notes
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing YouTube video: {str(e)}")

@app.get("/subject_count")
def subject_count(user=Depends(get_current_user)):
    notes = list(
        notes_collection.find(
            notes_filter_for_user(user),
            {"structured_note": 1, "raw_note": 1},
        )
    )

    subjects = [extract_subject(note) for note in notes]
    subjects = [subject for subject in subjects if subject]

    return dict(Counter(subjects))

@app.get("/subject_list")
def subject_list(user=Depends(get_current_user)):
    notes = list(
        notes_collection.find(
            notes_filter_for_user(user),
            {"structured_note": 1, "raw_note": 1},
        )
    )

    subjects = [extract_subject(note) for note in notes]
    subjects = sorted(set(subject for subject in subjects if subject))

    return subjects

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), user=Depends(get_current_user)):
    filename = file.filename or "uploaded.pdf"
    if not filename.lower().endswith(".pdf") and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Please upload a valid PDF file.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        shutil.copyfileobj(file.file, temp)
        temp_path = temp.name

    try:
        try:
            pages = extract_pages(temp_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")

        if not pages:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from PDF. The PDF may be empty, image-only/scanned, or password-protected."
            )

        # Combine all pages
        combined_text = " ".join(page["text"] for page in pages)

        # Clean text
        combined_text = re.sub(r"\s+", " ", combined_text).strip()

        if not combined_text:
            raise HTTPException(
                status_code=400,
                detail="No readable text found in PDF. Scanned or image-only PDFs are not supported."
            )

        # Limit size (important for large PDFs)
        important_text = combined_text[:6000]

        try:
            structured_notes = format_notes(important_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI formatting failed: {str(e)}")

        note_data = {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "raw_note": important_text,
            "structured_note": structured_notes,
            "created_at": get_ist_timestamp()
        }

        result = notes_collection.insert_one(note_data)

        # Embedding storage is best-effort
        try:
            store_note_embeddings(
                structured_notes,
                str(user["_id"]),
                str(result.inserted_id)
            )
        except Exception as e:
            print(f"Warning: Failed to store embeddings for note {result.inserted_id}: {e}")

        return {
            "message": "PDF processed successfully",
            "note": structured_notes
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/get-chats")
def get_chats(user=Depends(get_current_user)):
    """Get all chats for the user with their titles."""
    user_id = str(user["_id"])
    
    # Get all unique chat IDs for this user
    chat_ids = chats_collection.distinct("chat_id", {"user_id": user_id})
    
    chats_list = []
    for chat_id in chat_ids:
        # Ensure chat_id is a string for consistent queries
        chat_id_str = str(chat_id)
        
        # Get the first message (usually the user's first question) to use as title
        first_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str, "role": "user"},
            sort=[("timestamp", 1)]
        )
        
        # Get the latest message timestamp for sorting
        latest_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str},
            sort=[("timestamp", -1)]
        )
        
        if first_message:
            # Check if chat has a custom title (from rename)
            custom_title = None
            if latest_message and "chat_title" in latest_message:
                custom_title = latest_message["chat_title"]
            
            # Use custom title if available, otherwise use first message
            if custom_title:
                title = custom_title
            else:
                title = first_message["message"][:50]  # First 50 chars of first message
                if len(first_message["message"]) > 50:
                    title += "..."
            
            chats_list.append({
                "id": chat_id_str,
                "title": title,
                "timestamp": latest_message["timestamp"] if latest_message else None
            })
    
    # Sort by timestamp (newest first)
    chats_list.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return chats_list


@app.get("/get-chat-history/{chat_id}")
def get_chat_history(chat_id: str, user=Depends(get_current_user)):
    """Get all messages in a specific chat."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)  # Ensure chat_id is a string
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get all messages in this chat
    messages = list(chats_collection.find(
        {"user_id": user_id, "chat_id": chat_id}
    ).sort("timestamp", 1))
    
    return [
        {
            "role": "user" if msg["role"] == "user" else "bot",
            "content": msg["message"]
        }
        for msg in messages
    ]


@app.post("/chatbot")
def chatbot(data: dict, user=Depends(get_current_user)):

    question = data.get("question", "").strip()
    chat_id = str(data.get("chat_id"))  # Convert to string for consistent MongoDB storage
    
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if not chat_id or chat_id == "None":
        raise HTTPException(status_code=400, detail="Chat ID is required.")

    try:
        answer = ask_chatbot(
            question,
            str(user["_id"]),
            chat_id
        )
    except Exception as e:
        error_msg = str(e)
        if "getaddrinfo" in error_msg or "ConnectError" in error_msg or "ResponseHandlingException" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Could not connect to the vector database. Please check your Qdrant cloud cluster is active."
            )
        raise HTTPException(status_code=500, detail=f"Chatbot error: {error_msg}")

    return {
        "question": question,
        "answer": answer
    }

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str, user=Depends(get_current_user)):
    """Delete a note and its embeddings."""
    from bson import ObjectId
    
    try:
        # Verify the note exists and belongs to the user
        note = notes_collection.find_one({
            "_id": ObjectId(note_id),
            "$or": [
                {"user_id": str(user["_id"])},
                {"email": user["email"]}
            ]
        })
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found or you don't have permission to delete it.")
        
        # Delete note from MongoDB first so user action succeeds even if vector cleanup fails.
        delete_result = notes_collection.delete_one({"_id": ObjectId(note_id)})
        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Note not found or already deleted.")

        # Best-effort cleanup of vector embeddings.
        embeddings_deleted, cleanup_error = delete_note_embeddings(note_id)

        if not embeddings_deleted:
            return {
                "message": "Note deleted successfully (embedding cleanup pending)",
                "embedding_cleanup": "failed",
                "cleanup_error": cleanup_error,
            }

        return {
            "message": "Note deleted successfully",
            "embedding_cleanup": "done",
        }
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")


@app.put("/rename-chat/{chat_id}")
def rename_chat(chat_id: str, data: dict, user=Depends(get_current_user)):
    """Rename a chat."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    new_title = data.get("title", "").strip()
    if not new_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Update all messages in this chat with the new title
    # Store title in the first message or create a metadata document
    result = chats_collection.update_many(
        {"user_id": user_id, "chat_id": chat_id},
        {"$set": {"chat_title": new_title}}
    )
    
    return {
        "message": "Chat renamed successfully",
        "chat_id": chat_id,
        "new_title": new_title,
        "modified_count": result.modified_count
    }


@app.delete("/delete-chat/{chat_id}")
def delete_chat(chat_id: str, user=Depends(get_current_user)):
    """Delete a chat and all its messages."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete all messages in this chat
    result = chats_collection.delete_many(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    return {
        "message": "Chat deleted successfully",
        "chat_id": chat_id,
        "deleted_count": result.deleted_count
    }


@app.post("/save-chat/{chat_id}")
def save_chat_permanently(chat_id: str, user=Depends(get_current_user)):
    """Save a chat to the user's saved chats."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    # Verify user owns this chat
    chat_exists = chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if already saved
    already_saved = saved_chats_collection.find_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    if already_saved:
        return {
            "message": "Chat already saved",
            "chat_id": chat_id
        }
    
    # Add to saved chats
    saved_chats_collection.insert_one({
        "user_id": user_id,
        "chat_id": chat_id,
        "saved_at": get_ist_timestamp()
    })
    
    return {
        "message": "Chat saved successfully",
        "chat_id": chat_id
    }


@app.delete("/save-chat/{chat_id}")
def unsave_chat(chat_id: str, user=Depends(get_current_user)):
    """Remove a chat from the user's saved chats."""
    user_id = str(user["_id"])
    chat_id = str(chat_id)
    
    # Remove from saved chats
    result = saved_chats_collection.delete_one(
        {"user_id": user_id, "chat_id": chat_id}
    )
    
    return {
        "message": "Chat unsaved successfully",
        "chat_id": chat_id,
        "deleted": result.deleted_count > 0
    }


@app.get("/get-saved-chats")
def get_saved_chats(user=Depends(get_current_user)):
    """Get all saved chats for the user."""
    user_id = str(user["_id"])
    
    # Get all saved chat IDs
    saved_chat_ids = saved_chats_collection.distinct("chat_id", {"user_id": user_id})
    
    chats_list = []
    for chat_id in saved_chat_ids:
        chat_id_str = str(chat_id)
        
        # Get the first message (usually the user's first question) to use as title
        first_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str, "role": "user"},
            sort=[("timestamp", 1)]
        )
        
        # Get the latest message timestamp for sorting
        latest_message = chats_collection.find_one(
            {"user_id": user_id, "chat_id": chat_id_str},
            sort=[("timestamp", -1)]
        )
        
        if first_message:
            # Check if chat has a custom title (from rename)
            custom_title = None
            if latest_message and "chat_title" in latest_message:
                custom_title = latest_message["chat_title"]
            
            # Use custom title if available, otherwise use first message
            if custom_title:
                title = custom_title
            else:
                title = first_message["message"][:50]  # First 50 chars of first message
                if len(first_message["message"]) > 50:
                    title += "..."
            
            chats_list.append({
                "id": chat_id_str,
                "title": title,
                "timestamp": latest_message["timestamp"] if latest_message else None
            })
    
    # Sort by timestamp (newest first)
    chats_list.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return chats_list


@app.post("/update-profile-picture")
async def update_profile_picture(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Update user's profile picture."""
    from bson import ObjectId
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if len(file_content) > max_size:
            raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
        
        # Delete old profile picture if exists
        user_doc = users_collection.find_one({"_id": user["_id"]})
        if user_doc and user_doc.get("profile_picture_id"):
            try:
                fs.delete(ObjectId(user_doc["profile_picture_id"]))
            except Exception:
                pass
        
        # Store new image in GridFS
        filename = f"profile_{str(user['_id'])}_{file.filename}"
        file_id = fs.put(
            file_content,
            filename=filename,
            content_type=file.content_type,
            user_id=str(user["_id"])
        )
        
        # Update user document with file ID
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "profile_picture_id": str(file_id),
                    "updated_at": get_ist_timestamp()
                }
            }
        )
        
        return {
            "message": "Profile picture updated successfully",
            "picture_url": f"{BACKEND_URL}/profile-picture/{str(file_id)}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile picture: {str(e)}")


@app.get("/profile-picture/{file_id}")
def get_profile_picture(file_id: str):
    """Get profile picture from GridFS."""
    from bson import ObjectId
    from io import BytesIO
    
    try:
        # Retrieve file from GridFS
        grid_out = fs.get(ObjectId(file_id))
        file_content = grid_out.read()
        
        # Return image as streaming response
        return StreamingResponse(
            BytesIO(file_content),
            media_type=grid_out.content_type,
            headers={"Content-Disposition": f"inline; filename={grid_out.filename}"}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Profile picture not found")


@app.delete("/delete-profile-picture")
def delete_profile_picture(user=Depends(get_current_user)):
    """Delete user's profile picture."""
    from bson import ObjectId
    
    try:
        user_doc = users_collection.find_one({"_id": user["_id"]})
        
        if not user_doc or not user_doc.get("profile_picture_id"):
            raise HTTPException(status_code=400, detail="No profile picture to delete")
        
        # Delete file from GridFS
        try:
            fs.delete(ObjectId(user_doc["profile_picture_id"]))
        except Exception:
            pass
        
        # Remove profile_picture_id from user document
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$unset": {"profile_picture_id": ""},
                "$set": {"updated_at": get_ist_timestamp()}
            }
        )
        
        return {
            "message": "Profile picture deleted successfully",
            "picture": None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting profile picture: {str(e)}")


@app.get("/export-notes")
def export_notes(user=Depends(get_current_user)):
    """Export all user notes as a text file."""
    from io import BytesIO
    
    try:
        # Fetch all notes for the user
        notes = list(notes_collection.find({"user_id": str(user["_id"])}))
        
        if not notes:
            raise HTTPException(status_code=404, detail="No notes to export")
        
        # Format notes as readable text
        export_text = f"StudyMinutes - Notes Export\n"
        export_text += f"User: {user.get('name', 'Unknown')}\n"
        export_text += f"Export Date: {get_ist_timestamp()}\n"
        export_text += "=" * 80 + "\n\n"
        
        for idx, note in enumerate(notes, 1):
            export_text += f"--- Note {idx} ---\n"
            export_text += f"Created: {note.get('created_at', 'N/A')}\n"
            
            if note.get("structured_note"):
                export_text += f"Content:\n{note['structured_note']}\n"
            elif note.get("raw_note"):
                export_text += f"Content:\n{note['raw_note']}\n"
            
            export_text += "\n" + "=" * 80 + "\n\n"
        
        # Create binary stream
        file_content = export_text.encode('utf-8')
        
        return StreamingResponse(
            BytesIO(file_content),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=StudyMinutes_Notes_{get_ist_timestamp().replace(':', '-')}.txt"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting notes: {str(e)}")


@app.put("/update-profile-name")
def update_profile_name(data: dict, user=Depends(get_current_user)):
    """Update user's name/username."""
    user_id = str(user["_id"])
    new_name = data.get("name", "").strip()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    if len(new_name) > 100:
        raise HTTPException(status_code=400, detail="Name is too long (max 100 characters)")
    
    try:
        # Update user document in MongoDB
        result = users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "name": new_name,
                    "updated_at": get_ist_timestamp()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "message": "Profile name updated successfully",
            "name": new_name
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile name: {str(e)}")