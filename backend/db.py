from pymongo import MongoClient
import os
from dotenv import load_dotenv
from gridfs import GridFS

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client.studyminutes
users_collection = db.users
notes_collection = db.notes
chats_collection = db.chats
saved_chats_collection = db.saved_chats
fs = GridFS(db)